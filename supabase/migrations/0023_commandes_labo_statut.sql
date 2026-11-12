-- =====================================================================
-- ProdTrack — Statut des commandes laboratoire
-- À faire → Prête → Effectuée (retour d’un cran possible).
-- =====================================================================

alter table public.commandes_labo
  add column if not exists prete_le timestamptz,
  add column if not exists effectuee_le timestamptz;

-- Laboratoire : annulation (si à faire) + poser / retirer prete_le et effectuee_le.
-- Admin : tout. Aucune autre colonne modifiable par le laboratoire.
create or replace function public.proteger_commande_labo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etaient_a_faire boolean;
  v_etaient_prete boolean;
  v_etaient_effectuee boolean;
  v_annulation boolean;
  v_change_prete boolean;
  v_change_effectuee boolean;
begin
  if public.est_admin() then
    return new;
  end if;

  if old.annulee_le is not null then
    raise exception 'Cette commande est déjà annulée.';
  end if;

  -- Figé : le labo ne touche qu’à annulee_le / prete_le / effectuee_le.
  new.laboratoire_id := old.laboratoire_id;
  new.produit_id := old.produit_id;
  new.quantite := old.quantite;
  new.pour_le := old.pour_le;
  new.client := old.client;
  new.note := old.note;
  new.cree_par := old.cree_par;
  new.created_at := old.created_at;

  v_etaient_a_faire := old.prete_le is null and old.effectuee_le is null;
  v_etaient_prete := old.prete_le is not null and old.effectuee_le is null;
  v_etaient_effectuee := old.effectuee_le is not null;
  v_annulation := new.annulee_le is distinct from old.annulee_le;
  v_change_prete := new.prete_le is distinct from old.prete_le;
  v_change_effectuee := new.effectuee_le is distinct from old.effectuee_le;

  if v_annulation then
    if new.annulee_le is null then
      raise exception 'Seule l''annulation est autorisée.';
    end if;
    if not v_etaient_a_faire then
      raise exception 'Une commande prête ou effectuée ne peut pas être annulée.';
    end if;
    new.prete_le := null;
    new.effectuee_le := null;
    return new;
  end if;

  -- Pas de changement de statut : rien d’autre n’est autorisé.
  if not v_change_prete and not v_change_effectuee then
    raise exception 'Seule l''annulation ou le changement de statut est autorisé.';
  end if;

  -- Effectuée → Prête (retour d’un cran).
  if v_etaient_effectuee
     and new.effectuee_le is null
     and not (v_change_prete and new.prete_le is null)
  then
    new.effectuee_le := null;
    new.prete_le := coalesce(new.prete_le, old.prete_le, now());
    return new;
  end if;

  -- Prête → À faire (retour d’un cran).
  if v_etaient_prete
     and new.prete_le is null
     and new.effectuee_le is null
  then
    return new;
  end if;

  -- À faire → Prête.
  if v_etaient_a_faire
     and new.prete_le is not null
     and new.effectuee_le is null
  then
    new.prete_le := now();
    return new;
  end if;

  -- À faire ou Prête → Effectuée (direct ou via prête).
  if (v_etaient_a_faire or v_etaient_prete)
     and new.effectuee_le is not null
  then
    new.effectuee_le := now();
    new.prete_le := coalesce(old.prete_le, new.prete_le, now());
    return new;
  end if;

  raise exception 'Changement de statut non autorisé.';
end;
$$;

-- RLS : inchangée en pratique (labo de sa boutique, non annulée).
-- On la recrée pour documenter le suivi de statut.
drop policy if exists commandes_labo_update on public.commandes_labo;
create policy commandes_labo_update on public.commandes_labo for update
  using (
    public.est_admin()
    or (
      public.mon_role() = 'laboratoire'
      and laboratoire_id = public.ma_boutique()
      and annulee_le is null
    )
  )
  with check (
    public.est_admin()
    or (
      public.mon_role() = 'laboratoire'
      and laboratoire_id = public.ma_boutique()
    )
  );

-- Prévision : une commande effectuée ne compte plus (déjà partie).
create or replace function public.calculer_previsions() returns void
language plpgsql security definer set search_path = public as $$
declare
  p            record;
  v_auj        date := public.aujourdhui();
  v_stock      int;
  v_jours      int;
  v_semaines   int;
  v_fiable     boolean;
  v_moy        numeric[];
  v_moy_simple numeric;
  v_fin        numeric[];
  v_prevu      numeric;
  v_stock_fin  numeric;
  v_detail     jsonb;
  v_jour       date;
  v_jour_fab   date;
  v_qte        int;
  v_couverture int;
  v_besoin     numeric;
  v_ancien     date;
  v_est_labo   boolean;
  v_cmd        numeric;
  d            int;
  i            int;
begin
  for p in
    select pr.*, coalesce(b.est_laboratoire, false) as est_labo
    from produits pr
    join boutiques b on b.id = pr.boutique_id
    where pr.archive_le is null
      and pr.fabricant_id is not null
      and pr.conservation = 'surgele'
  loop
    v_est_labo := p.est_labo;
    select s.stock into v_stock from stock_actuel s where s.produit_id = p.id;
    v_stock := coalesce(v_stock, 0);
    v_jours := least(70, v_auj - (p.created_at at time zone 'Europe/Paris')::date);
    v_fiable := v_jours >= 56;
    v_moy := array[0, 0, 0, 0, 0, 0, 0]::numeric[];
    v_moy_simple := 0;
    v_fin := array[]::numeric[];
    v_detail := '[]'::jsonb;
    v_jour_fab := null;
    v_qte := null;

    if v_jours >= 1 then
      if v_fiable then
        v_semaines := v_jours / 7;
        for d in 1..7 loop
          v_moy[d] := (
            select coalesce(sum(quantite), 0)::numeric / v_semaines
            from mouvements_stock
            where produit_id = p.id and type = 'sortie'
              and jour >= v_auj - 7 * v_semaines and jour < v_auj
              and extract(isodow from jour) = d
          );
        end loop;
      else
        v_moy_simple := (
          select coalesce(sum(quantite), 0)::numeric / v_jours
          from mouvements_stock
          where produit_id = p.id and type = 'sortie'
            and jour >= v_auj - v_jours and jour < v_auj
        );
      end if;

      v_stock_fin := v_stock;
      for i in 0..13 loop
        v_jour := v_auj + i;
        v_prevu := case when v_fiable then v_moy[extract(isodow from v_jour)::int] else v_moy_simple end;
        if v_est_labo then
          select coalesce(sum(c.quantite), 0)::numeric into v_cmd
          from commandes_labo c
          where c.produit_id = p.id
            and c.pour_le = v_jour
            and c.annulee_le is null
            and c.effectuee_le is null;
          v_prevu := v_prevu + coalesce(v_cmd, 0);
        end if;
        v_stock_fin := v_stock_fin - v_prevu;
        v_fin := v_fin || v_stock_fin;
        v_detail := v_detail || jsonb_build_array(jsonb_build_object(
          'jour', v_jour, 'prevu', round(v_prevu, 1), 'stock_fin', round(v_stock_fin, 1)));
        if v_jour_fab is null and v_stock_fin < p.seuil_min then
          v_jour_fab := greatest(v_auj, v_jour - 1);
        end if;
      end loop;

      if v_jour_fab is not null then
        v_couverture := least(7, coalesce(p.duree_conservation_jours, 7));
        v_besoin := 0;
        for i in 1..v_couverture loop
          v_jour := v_jour_fab + i;
          v_prevu := case when v_fiable
            then v_moy[extract(isodow from v_jour)::int] else v_moy_simple end;
          if v_est_labo then
            select coalesce(sum(c.quantite), 0)::numeric into v_cmd
            from commandes_labo c
            where c.produit_id = p.id
              and c.pour_le = v_jour
              and c.annulee_le is null
              and c.effectuee_le is null;
            v_prevu := v_prevu + coalesce(v_cmd, 0);
          end if;
          v_besoin := v_besoin + v_prevu;
        end loop;
        v_qte := greatest(0, ceil(p.seuil_min + v_besoin - v_fin[(v_jour_fab - v_auj) + 1]))::int;
      end if;
    end if;

    select jour_fabrication into v_ancien from previsions where produit_id = p.id;

    insert into previsions (produit_id, calcule_le, stock_actuel, jour_fabrication,
                            quantite_suggeree, fiable, detail)
    values (p.id, now(), v_stock, v_jour_fab, v_qte, v_fiable, v_detail)
    on conflict (produit_id) do update set
      calcule_le = excluded.calcule_le, stock_actuel = excluded.stock_actuel,
      jour_fabrication = excluded.jour_fabrication, quantite_suggeree = excluded.quantite_suggeree,
      fiable = excluded.fiable, detail = excluded.detail;

    if v_jour_fab is not null and v_jour_fab is distinct from v_ancien then
      insert into notifications (profil_id, titre, message) values (
        p.fabricant_id,
        'Fabrication à prévoir : ' || p.nom,
        'À fabriquer au plus tard le ' || to_char(v_jour_fab, 'DD/MM')
          || ' (environ ' || v_qte || ' unités).'
      );
    end if;
  end loop;
end $$;

revoke execute on function public.calculer_previsions() from public, anon, authenticated;
