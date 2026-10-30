-- =====================================================================
-- ProdTrack — produit imposé sans fabricant (à prendre par un pâtissier)
-- fabricant_id nullable seulement si impose_par_admin ; RPC prendre_produit.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Colonne nullable + contrainte
-- ---------------------------------------------------------------------
alter table public.produits
  alter column fabricant_id drop not null;

alter table public.produits
  add constraint produits_fabricant_null_seulement_impose
  check (fabricant_id is not null or impose_par_admin);

-- ---------------------------------------------------------------------
-- 2. Trigger verifier_produit (fabricant null / prise par un pâtissier)
-- ---------------------------------------------------------------------
create or replace function public.verifier_produit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.fabricant_id is null and not new.impose_par_admin then
    raise exception 'Un produit sans fabricant doit être imposé par le patron';
  end if;

  if new.fabricant_id is not null
     and (tg_op = 'INSERT' or new.fabricant_id is distinct from old.fabricant_id) then
    if not exists (
      select 1 from profils
      where id = new.fabricant_id and role = 'patissier'
        and boutique_id = new.boutique_id and archive_le is null
    ) then
      raise exception 'Le fabricant doit être un pâtissier actif de cette boutique';
    end if;
  end if;

  if tg_op = 'UPDATE' and auth.uid() is not null and not public.est_admin() then
    -- Prendre un produit imposé sans fabricant : null → soi uniquement
    if old.fabricant_id is null
       and new.fabricant_id = auth.uid()
       and old.impose_par_admin
       and new.impose_par_admin
       and new.boutique_id is not distinct from old.boutique_id
       and public.mon_role() = 'patissier'
       and new.boutique_id = public.ma_boutique() then
      null;
    elsif new.fabricant_id is distinct from old.fabricant_id
       or new.boutique_id is distinct from old.boutique_id
       or new.impose_par_admin is distinct from old.impose_par_admin then
      raise exception 'Seul le patron peut modifier ce champ';
    end if;
    if old.impose_par_admin and (
      new.archive_le is distinct from old.archive_le
      or new.nom is distinct from old.nom
    ) then
      raise exception 'Produit imposé par le patron : impossible de le retirer ou de le renommer';
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 3. Saisie vente : refuser un produit sans pâtissier
-- ---------------------------------------------------------------------
create or replace function public.preparer_saisie_vente() returns trigger
language plpgsql security definer set search_path = public as $$
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
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 4. Prévisions : ignorer les produits sans fabricant (pas de notif non plus)
-- ---------------------------------------------------------------------
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
  d            int;
  i            int;
begin
  for p in
    select * from produits
    where archive_le is null and fabricant_id is not null
  loop
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
          v_besoin := v_besoin + case when v_fiable
            then v_moy[extract(isodow from v_jour)::int] else v_moy_simple end;
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

-- ---------------------------------------------------------------------
-- 5. Production : personne ne produit un produit sans fabricant
-- (identique à 0008 + fabricant_id is not null sur la branche intermédiaire)
-- ---------------------------------------------------------------------
drop policy mouvements_insert on public.mouvements_stock;
create policy mouvements_insert on public.mouvements_stock for insert with check (
  saisi_par = auth.uid() and (
    (type = 'production' and (
      (
        exists (select 1 from public.produits
          where id = produit_id and fabricant_id = auth.uid())
        and public.mon_role() = 'patissier'
      )
      or (
        exists (select 1 from public.produits
          where id = produit_id and intermediaire and fabricant_id is not null)
        and public.mon_role() = 'patissier'
        and public.produit_boutique(produit_id) = public.ma_boutique()
      )
    ))
    or (type = 'sortie' and public.mon_role() = 'patissier'
        and public.produit_boutique(produit_id) = public.ma_boutique()
        and exists (select 1 from public.produits
          where id = produit_id and fabricant_id is not null))
    or (type = 'ajustement' and public.est_admin() and public.peut_voir_produit(produit_id))
  )
);

-- ---------------------------------------------------------------------
-- 6. RPC : un pâtissier de la boutique prend le produit
-- ---------------------------------------------------------------------
create or replace function public.prendre_produit(p_produit uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_maj int;
begin
  if public.mon_role() is distinct from 'patissier' then
    raise exception 'Réservé aux pâtissiers.';
  end if;
  if p_produit is null or public.ma_boutique() is null then
    raise exception 'Produit inaccessible.';
  end if;

  update public.produits
  set fabricant_id = auth.uid()
  where id = p_produit
    and archive_le is null
    and impose_par_admin
    and fabricant_id is null
    and boutique_id = public.ma_boutique();

  get diagnostics v_maj = row_count;
  if v_maj = 0 then
    raise exception 'Un autre pâtissier l’a déjà pris.';
  end if;
end;
$$;

revoke all on function public.prendre_produit(uuid) from public;
revoke execute on function public.prendre_produit(uuid) from anon;
grant execute on function public.prendre_produit(uuid) to authenticated;
