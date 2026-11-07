-- =====================================================================
-- ProdTrack — Laboratoire (étape 1)
-- Boutique spéciale (est_laboratoire) + rôle laboratoire.
-- Réutilise la production extérieure (D18) : produit au labo =
-- boutique_id = labo, provenance = boutique du pâtissier, surgelé.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Colonne boutique
-- ---------------------------------------------------------------------
alter table public.boutiques
  add column if not exists est_laboratoire boolean not null default false;

-- ---------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------
create or replace function public.boutique_est_laboratoire(p_boutique uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select b.est_laboratoire from public.boutiques b where b.id = p_boutique),
    false
  )
$$;

-- Noms + drapeau labo (pour filtres appli).
drop function if exists public.noms_boutiques_entreprise();
create function public.noms_boutiques_entreprise()
returns table (id uuid, nom text, est_laboratoire boolean)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.nom, b.est_laboratoire
  from public.boutiques b
  where public.mon_entreprise() is not null
    and b.entreprise_id = public.mon_entreprise()
  order by b.est_laboratoire, b.nom;
$$;

revoke all on function public.noms_boutiques_entreprise() from public;
revoke execute on function public.noms_boutiques_entreprise() from anon;
grant execute on function public.noms_boutiques_entreprise() to authenticated;

-- Catalogue « autres boutiques » : exclure les laboratoires.
create or replace function public.catalogue_boutiques()
returns table (id uuid, nom text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.mon_role() is distinct from 'patissier' then
    return;
  end if;
  return query
    select b.id, b.nom
    from public.boutiques b
    where b.entreprise_id = public.mon_entreprise()
      and b.id is distinct from public.ma_boutique()
      and not b.est_laboratoire
    order by b.nom;
end
$$;

-- ---------------------------------------------------------------------
-- 3. Rejoindre : forcer le rôle laboratoire sur un code labo
-- ---------------------------------------------------------------------
create or replace function public.rejoindre_boutique(
  p_code text, p_role public.role_employe, p_prenom text, p_nom text, p_equipe text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_boutique public.boutiques;
  v_role public.role_employe;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if exists (select 1 from profils where id = auth.uid()) then
    raise exception 'Ce compte a déjà un profil';
  end if;
  if p_role = 'admin' then raise exception 'Rôle non autorisé'; end if;

  select * into v_boutique from boutiques where code_invitation = upper(trim(p_code));
  if not found then raise exception 'Code boutique invalide'; end if;

  if v_boutique.est_laboratoire then
    v_role := 'laboratoire';
  else
    if p_role = 'laboratoire' then
      raise exception 'Le rôle Laboratoire est réservé aux laboratoires';
    end if;
    v_role := p_role;
  end if;

  insert into profils (id, entreprise_id, boutique_id, role, prenom, nom, equipe)
    values (
      auth.uid(),
      v_boutique.entreprise_id,
      v_boutique.id,
      v_role,
      p_prenom,
      p_nom,
      case when v_role = 'patissier' then p_equipe else null end
    );
  return v_boutique.id;
end $$;

-- ---------------------------------------------------------------------
-- 4. Produit au laboratoire : règles dans verifier_produit
-- ---------------------------------------------------------------------
create or replace function public.verifier_produit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_boutique_fabricant uuid;
  v_entreprise_produit uuid;
  v_entreprise_provenance uuid;
  v_dest_labo boolean;
  v_prov_labo boolean;
begin
  select b.est_laboratoire, b.entreprise_id
    into v_dest_labo, v_entreprise_produit
  from public.boutiques b where b.id = new.boutique_id;

  if coalesce(v_dest_labo, false) then
    if new.provenance_boutique_id is null then
      raise exception 'Un produit au laboratoire doit avoir une boutique de provenance';
    end if;
    if new.intermediaire then
      raise exception 'Un produit au laboratoire ne peut pas être intermédiaire';
    end if;
    if new.impose_par_admin then
      raise exception 'Un produit au laboratoire ne peut pas être imposé par l''admin';
    end if;
    if new.fabricant_id is null then
      raise exception 'Un produit au laboratoire doit avoir un fabricant';
    end if;
    if new.conservation is distinct from 'surgele' then
      raise exception 'Un produit au laboratoire doit être surgelé';
    end if;
    select b.est_laboratoire, b.entreprise_id
      into v_prov_labo, v_entreprise_provenance
    from public.boutiques b where b.id = new.provenance_boutique_id;
    if coalesce(v_prov_labo, false) then
      raise exception 'La provenance d''un produit labo ne peut pas être un laboratoire';
    end if;
    if v_entreprise_produit is null
       or v_entreprise_provenance is null
       or v_entreprise_produit is distinct from v_entreprise_provenance then
      raise exception 'La boutique de provenance doit être de la même entreprise';
    end if;
  elsif new.provenance_boutique_id is not null then
    if new.intermediaire then
      raise exception 'Un produit extérieur ne peut pas être intermédiaire';
    end if;
    if new.impose_par_admin then
      raise exception 'Un produit extérieur ne peut pas être imposé par l''admin';
    end if;
    if new.fabricant_id is null then
      raise exception 'Un produit extérieur doit avoir un fabricant';
    end if;

    select entreprise_id into v_entreprise_produit
    from public.boutiques where id = new.boutique_id;
    select b.est_laboratoire, b.entreprise_id
      into v_prov_labo, v_entreprise_provenance
    from public.boutiques b where b.id = new.provenance_boutique_id;
    if coalesce(v_prov_labo, false) then
      raise exception 'La boutique de provenance ne peut pas être un laboratoire';
    end if;
    if v_entreprise_produit is null
       or v_entreprise_provenance is null
       or v_entreprise_produit is distinct from v_entreprise_provenance then
      raise exception 'La boutique de provenance doit être de la même entreprise';
    end if;
  end if;

  if new.fabricant_id is null and not new.impose_par_admin then
    raise exception 'Un produit sans fabricant doit être imposé par le patron';
  end if;

  v_boutique_fabricant := coalesce(new.provenance_boutique_id, new.boutique_id);

  if new.fabricant_id is not null
     and (tg_op = 'INSERT' or new.fabricant_id is distinct from old.fabricant_id) then
    if not exists (
      select 1 from profils
      where id = new.fabricant_id and role = 'patissier'
        and boutique_id = v_boutique_fabricant and archive_le is null
    ) then
      raise exception 'Le fabricant doit être un pâtissier actif de cette boutique';
    end if;
  end if;

  if tg_op = 'UPDATE' and auth.uid() is not null and not public.est_admin() then
    if new.provenance_boutique_id is distinct from old.provenance_boutique_id then
      raise exception 'Impossible de changer la boutique de provenance';
    end if;
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
-- 5. Mouvements : sorties du laboratoire
-- ---------------------------------------------------------------------
drop policy if exists mouvements_insert on public.mouvements_stock;
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
    or (
      type = 'sortie'
      and public.produit_boutique(produit_id) = public.ma_boutique()
      and exists (select 1 from public.produits
        where id = produit_id and fabricant_id is not null)
      and (
        public.mon_role() = 'patissier'
        or public.mon_role() = 'laboratoire'
      )
    )
    or (type = 'ajustement' and public.est_admin() and public.peut_voir_produit(produit_id))
  )
);

-- ---------------------------------------------------------------------
-- 6. Pas de saisie de vente sur un produit de laboratoire
-- ---------------------------------------------------------------------
drop policy if exists saisies_insert on public.saisies_vente;
create policy saisies_insert on public.saisies_vente for insert with check (
  (
    (public.mon_role() = 'vendeuse' and public.produit_boutique(produit_id) = public.ma_boutique())
    or (public.est_admin() and public.peut_voir_produit(produit_id))
  )
  and exists (
    select 1 from public.produits p
    join public.boutiques b on b.id = p.boutique_id
    where p.id = produit_id
      and not p.intermediaire
      and not b.est_laboratoire
  )
);

drop policy if exists saisies_update on public.saisies_vente;
create policy saisies_update on public.saisies_vente for update using (
  (
    (public.mon_role() = 'vendeuse' and public.produit_boutique(produit_id) = public.ma_boutique())
    or (public.est_admin() and public.peut_voir_produit(produit_id))
  )
  and exists (
    select 1 from public.produits p
    join public.boutiques b on b.id = p.boutique_id
    where p.id = produit_id
      and not p.intermediaire
      and not b.est_laboratoire
  )
);

-- ---------------------------------------------------------------------
-- 7. Laboratoire : lire les noms des pâtissiers fabricants de son labo
-- ---------------------------------------------------------------------
drop policy if exists profils_select_labo_fabricants on public.profils;
create policy profils_select_labo_fabricants on public.profils for select
  using (
    public.mon_role() = 'laboratoire'
    and exists (
      select 1 from public.produits p
      where p.fabricant_id = profils.id
        and p.boutique_id = public.ma_boutique()
        and p.archive_le is null
    )
  );
