-- =====================================================================
-- ProdTrack — production extérieure
-- Produit appartenant à la boutique destinataire, fabriqué dans une autre
-- boutique (provenance_boutique_id). CA au fabricant ; stock chez le destinataire.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Colonne + contrainte boutique / entreprise
-- ---------------------------------------------------------------------
alter table public.produits
  add column provenance_boutique_id uuid references public.boutiques(id);

alter table public.produits
  add constraint produits_provenance_differente
  check (
    provenance_boutique_id is null
    or provenance_boutique_id <> boutique_id
  );

-- Noms uniques : sur place et venant d'ailleurs peuvent coexister.
drop index if exists public.produits_nom_unique;
create unique index produits_nom_unique
  on public.produits (
    boutique_id,
    (coalesce(provenance_boutique_id, boutique_id)),
    (lower(trim(nom)))
  )
  where archive_le is null;

-- ---------------------------------------------------------------------
-- 2. Noms des boutiques de l'entreprise (étiquettes, sans code invitation)
-- ---------------------------------------------------------------------
create or replace function public.noms_boutiques_entreprise()
returns table (id uuid, nom text)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.nom
  from public.boutiques b
  where public.mon_entreprise() is not null
    and b.entreprise_id = public.mon_entreprise()
  order by b.nom;
$$;

revoke all on function public.noms_boutiques_entreprise() from public;
revoke execute on function public.noms_boutiques_entreprise() from anon;
grant execute on function public.noms_boutiques_entreprise() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Lecture : le fabricant voit ses produits (y compris extérieurs)
-- ---------------------------------------------------------------------
create or replace function public.peut_voir_produit(p_produit uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.peut_voir_boutique(public.produit_boutique(p_produit))
    or exists (
      select 1 from public.produits p
      where p.id = p_produit and p.fabricant_id = auth.uid()
    )
$$;

drop policy if exists produits_select on public.produits;
create policy produits_select on public.produits for select
  using (
    public.peut_voir_boutique(boutique_id)
    or fabricant_id = auth.uid()
  );

-- ---------------------------------------------------------------------
-- 4. Trigger verifier_produit (base 0009 + provenance)
-- ---------------------------------------------------------------------
create or replace function public.verifier_produit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_boutique_fabricant uuid;
  v_entreprise_produit uuid;
  v_entreprise_provenance uuid;
begin
  if new.provenance_boutique_id is not null then
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
    select entreprise_id into v_entreprise_provenance
    from public.boutiques where id = new.provenance_boutique_id;
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
-- 5. Insertion pâtissier : boutique locale OU produit extérieur
-- ---------------------------------------------------------------------
drop policy if exists produits_insert_patissier on public.produits;
create policy produits_insert_patissier on public.produits for insert with check (
  public.mon_role() = 'patissier'
  and fabricant_id = auth.uid()
  and impose_par_admin = false
  and (
    (
      boutique_id = public.ma_boutique()
      and provenance_boutique_id is null
    )
    or (
      provenance_boutique_id = public.ma_boutique()
      and boutique_id is distinct from public.ma_boutique()
      and public.boutique_de_mon_entreprise(boutique_id)
      and intermediaire = false
    )
  )
);

-- ---------------------------------------------------------------------
-- 6. Pertes : boutique du produit OU fabricant (extérieur)
-- ---------------------------------------------------------------------
drop policy if exists pertes_insert on public.pertes_production;
create policy pertes_insert on public.pertes_production for insert with check (
  saisi_par = auth.uid()
  and public.mon_role() = 'patissier'
  and (
    public.produit_boutique(produit_id) = public.ma_boutique()
    or exists (
      select 1 from public.produits p
      where p.id = produit_id and p.fabricant_id = auth.uid()
    )
  )
);

-- ---------------------------------------------------------------------
-- 7. Photos : écrire aussi vers une boutique destinataire de l'entreprise
-- ---------------------------------------------------------------------
create or replace function public.peut_ecrire_photo_produit(p_boutique uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_boutique is not null and (
    (public.mon_role() = 'patissier' and public.ma_boutique() = p_boutique)
    or (
      public.mon_role() = 'patissier'
      and public.boutique_de_mon_entreprise(p_boutique)
    )
    or (public.est_admin() and public.peut_voir_boutique(p_boutique))
  )
$$;
