-- =====================================================================
-- ProdTrack — quantité mise en vente (sorties ou production + restes)
-- et contrôle vendeuse : vendu + jeté + reste ≤ mis en vente.
-- Décision du propriétaire 31/10/2026.
-- =====================================================================

-- Quantité mise en vente par produit fini d'une boutique pour un jour :
-- surgelé = sorties du jour ; frais = production du jour ;
-- + restes saisis la veille. Les colonnes jour sont déjà en date Europe/Paris.
create or replace function public.mis_en_vente(p_boutique uuid, p_jour date)
returns table(produit_id uuid, arrivee int, restes_veille int, total int)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id as produit_id,
    coalesce(
      case p.conservation
        when 'surgele' then sorties.qte
        when 'frais' then production.qte
        else 0
      end,
      0
    )::int as arrivee,
    coalesce(restes.reste, 0)::int as restes_veille,
    (
      coalesce(
        case p.conservation
          when 'surgele' then sorties.qte
          when 'frais' then production.qte
          else 0
        end,
        0
      ) + coalesce(restes.reste, 0)
    )::int as total
  from public.produits p
  left join (
    select m.produit_id, sum(m.quantite) as qte
    from public.mouvements_stock m
    where m.type = 'sortie'
      and m.jour = p_jour
    group by m.produit_id
  ) sorties on sorties.produit_id = p.id
  left join (
    select m.produit_id, sum(m.quantite) as qte
    from public.mouvements_stock m
    where m.type = 'production'
      and m.jour = p_jour
    group by m.produit_id
  ) production on production.produit_id = p.id
  left join (
    select s.produit_id, s.reste
    from public.saisies_vente s
    where s.jour = p_jour - 1
  ) restes on restes.produit_id = p.id
  where p.boutique_id = p_boutique
    and p.archive_le is null
    and p.intermediaire = false
$$;

grant execute on function public.mis_en_vente(uuid, date) to authenticated;

-- Saisie vente : copie prix + fabricant, refuse sans pâtissier,
-- et refuse si vendu + jeté + reste > mis en vente (0/0/0 toujours OK).
create or replace function public.preparer_saisie_vente() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_boutique uuid;
  v_nom text;
  v_total int;
  v_somme int;
begin
  if tg_op = 'INSERT' then
    select prix_centimes, fabricant_id into new.prix_unitaire_centimes, new.fabricant_id
    from produits where id = new.produit_id;
    if new.fabricant_id is null then
      raise exception 'Ce produit n’a pas encore de pâtissier.';
    end if;
  else
    new.produit_id := old.produit_id;
    new.jour := old.jour;
    new.prix_unitaire_centimes := old.prix_unitaire_centimes;
    new.fabricant_id := old.fabricant_id;
  end if;
  new.saisi_par := coalesce(auth.uid(), new.saisi_par);
  new.modifie_le := now();

  v_somme := new.vendu + new.jete + new.reste;
  if v_somme > 0 then
    select boutique_id, nom into v_boutique, v_nom
    from produits where id = new.produit_id;
    select m.total into v_total
    from public.mis_en_vente(v_boutique, new.jour) m
    where m.produit_id = new.produit_id;
    v_total := coalesce(v_total, 0);
    if v_somme > v_total then
      raise exception
        'Pour %, vendu + jeté + reste (%) dépasse la quantité mise en vente (%). Si la production ou la sortie manque, demandez au pâtissier de l’enregistrer.',
        v_nom, v_somme, v_total;
    end if;
  end if;

  return new;
end $$;
