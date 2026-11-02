-- =====================================================================
-- ProdTrack — commandes de gâteaux (vendeuse → boutique de fabrication)
-- Statuts via RPC ; CA des commandes récupérées dans ca_journalier.
-- =====================================================================

create type public.statut_commande as enum ('a_faire', 'prete', 'recuperee', 'annulee');

create table public.commandes (
  id                       uuid primary key default gen_random_uuid(),
  entreprise_id            uuid not null references public.entreprises(id),
  boutique_fabrication_id  uuid not null references public.boutiques(id),
  boutique_retrait_id      uuid not null references public.boutiques(id),
  client_nom               text not null check (length(trim(client_nom)) > 0),
  client_telephone         text not null check (length(trim(client_telephone)) > 0),
  client_email             text,
  gateau                   text not null check (length(trim(gateau)) > 0),
  nb_parts                 integer not null check (nb_parts > 0),
  demandes                 text,
  inscription              text,
  retrait_le               timestamptz not null,
  prix_centimes            integer check (prix_centimes is null or prix_centimes >= 0),
  acompte_centimes         integer check (acompte_centimes is null or acompte_centimes >= 0),
  statut                   public.statut_commande not null default 'a_faire',
  cree_par                 uuid not null default auth.uid() references public.profils(id),
  cree_le                  timestamptz not null default now(),
  fabricant_id             uuid references public.profils(id),
  prete_le                 timestamptz,
  recuperee_le             timestamptz,
  recuperee_par            uuid references public.profils(id),
  annulee_le               timestamptz,
  modifie_le               timestamptz not null default now(),
  check (
    prix_centimes is null
    or acompte_centimes is null
    or acompte_centimes <= prix_centimes
  )
);

create index commandes_entreprise_retrait on public.commandes (entreprise_id, retrait_le);
create index commandes_fabrication_statut on public.commandes (boutique_fabrication_id, statut);
create index commandes_retrait_statut on public.commandes (boutique_retrait_id, statut);

-- ---------------------------------------------------------------------
-- Remplissage / contrôles avant écriture
-- ---------------------------------------------------------------------
create or replace function public.preparer_commande()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ent_fab uuid;
  v_ent_ret uuid;
begin
  if tg_op = 'INSERT' then
    new.entreprise_id := public.mon_entreprise();
    if new.entreprise_id is null then
      raise exception 'Profil introuvable.';
    end if;
    if new.cree_par is null then
      new.cree_par := auth.uid();
    end if;
    new.statut := 'a_faire';
    new.fabricant_id := null;
    new.prete_le := null;
    new.recuperee_le := null;
    new.recuperee_par := null;
    new.annulee_le := null;
    if new.retrait_le < now() then
      raise exception 'La date et l''heure de retrait ne peuvent pas être dans le passé.';
    end if;
  end if;

  select entreprise_id into v_ent_fab from boutiques where id = new.boutique_fabrication_id;
  select entreprise_id into v_ent_ret from boutiques where id = new.boutique_retrait_id;
  if v_ent_fab is null or v_ent_ret is null then
    raise exception 'Boutique introuvable.';
  end if;
  if v_ent_fab is distinct from new.entreprise_id or v_ent_ret is distinct from new.entreprise_id then
    raise exception 'Les boutiques doivent appartenir à votre entreprise.';
  end if;

  new.client_nom := trim(new.client_nom);
  new.client_telephone := trim(new.client_telephone);
  new.gateau := trim(new.gateau);
  if new.client_email is not null then
    new.client_email := nullif(trim(new.client_email), '');
  end if;
  if new.demandes is not null then
    new.demandes := nullif(trim(new.demandes), '');
  end if;
  if new.inscription is not null then
    new.inscription := nullif(trim(new.inscription), '');
  end if;

  new.modifie_le := now();
  return new;
end;
$$;

create trigger commandes_preparer
  before insert or update on public.commandes
  for each row execute function public.preparer_commande();

-- Empêche de changer statut / fabricant / dates de statut hors RPC.
create or replace function public.proteger_statut_commande()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('prodtrack.commande_rpc', true), '') = '1' then
    return new;
  end if;
  if new.statut is distinct from old.statut
     or new.fabricant_id is distinct from old.fabricant_id
     or new.prete_le is distinct from old.prete_le
     or new.recuperee_le is distinct from old.recuperee_le
     or new.recuperee_par is distinct from old.recuperee_par
     or new.annulee_le is distinct from old.annulee_le then
    raise exception 'Le statut de la commande se change uniquement via les actions prévues.';
  end if;
  return new;
end;
$$;

create trigger commandes_proteger_statut
  before update on public.commandes
  for each row execute function public.proteger_statut_commande();

-- ---------------------------------------------------------------------
-- Notifications aux pâtissiers de la boutique de fabrication
-- ---------------------------------------------------------------------
create or replace function public.notifier_nouvelle_commande()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retrait text;
  v_boutique text;
  v_message text;
  r record;
begin
  select b.nom into v_boutique from boutiques b where b.id = new.boutique_retrait_id;
  v_retrait :=
    to_char(new.retrait_le at time zone 'Europe/Paris', 'DD/MM')
    || ' à '
    || to_char(new.retrait_le at time zone 'Europe/Paris', 'HH24')
    || 'h'
    || to_char(new.retrait_le at time zone 'Europe/Paris', 'MI');
  v_message :=
    new.nb_parts::text
    || ' parts · retrait le '
    || v_retrait
    || ' ('
    || coalesce(v_boutique, '—')
    || ')';

  for r in
    select p.id
    from profils p
    where p.boutique_id = new.boutique_fabrication_id
      and p.role = 'patissier'
      and p.archive_le is null
  loop
    insert into notifications (profil_id, titre, message)
    values (r.id, 'Nouvelle commande : ' || new.gateau, v_message);
  end loop;
  return new;
end;
$$;

create trigger commandes_apres_insert_notif
  after insert on public.commandes
  for each row execute function public.notifier_nouvelle_commande();

-- ---------------------------------------------------------------------
-- RPC de changement de statut
-- ---------------------------------------------------------------------
create or replace function public.marquer_commande_prete(p_commande uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.commandes%rowtype;
begin
  select * into c from commandes where id = p_commande;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  if public.mon_role() is distinct from 'patissier' or public.ma_boutique() is null then
    raise exception 'Réservé aux pâtissiers de la boutique qui fabrique.';
  end if;
  if c.boutique_fabrication_id is distinct from public.ma_boutique() then
    raise exception 'Cette commande n''est pas fabriquée dans votre boutique.';
  end if;
  if c.statut is distinct from 'a_faire' then
    raise exception 'Seule une commande « À faire » peut être marquée prête.';
  end if;

  perform set_config('prodtrack.commande_rpc', '1', true);
  update commandes
  set statut = 'prete',
      fabricant_id = auth.uid(),
      prete_le = now()
  where id = p_commande;
end;
$$;

create or replace function public.annuler_commande_prete(p_commande uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.commandes%rowtype;
begin
  select * into c from commandes where id = p_commande;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  if c.statut is distinct from 'prete' then
    raise exception 'Cette commande n''est pas marquée prête.';
  end if;
  if c.fabricant_id is distinct from auth.uid() then
    raise exception 'Seul le pâtissier qui a marqué la commande prête peut annuler.';
  end if;

  perform set_config('prodtrack.commande_rpc', '1', true);
  update commandes
  set statut = 'a_faire',
      fabricant_id = null,
      prete_le = null
  where id = p_commande;
end;
$$;

create or replace function public.marquer_commande_recuperee(p_commande uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.commandes%rowtype;
begin
  select * into c from commandes where id = p_commande;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  if not (public.mon_role() = 'vendeuse' or public.est_admin()) then
    raise exception 'Réservé à l''équipe de vente ou à l''admin.';
  end if;
  if c.entreprise_id is distinct from public.mon_entreprise() then
    raise exception 'Commande inaccessible.';
  end if;
  if c.statut is distinct from 'prete' then
    raise exception 'La commande n''est pas encore prête.';
  end if;

  perform set_config('prodtrack.commande_rpc', '1', true);
  update commandes
  set statut = 'recuperee',
      recuperee_le = now(),
      recuperee_par = auth.uid()
  where id = p_commande;
end;
$$;

create or replace function public.annuler_commande(p_commande uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.commandes%rowtype;
begin
  select * into c from commandes where id = p_commande;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  if not (public.mon_role() = 'vendeuse' or public.est_admin()) then
    raise exception 'Réservé à l''équipe de vente ou à l''admin.';
  end if;
  if c.entreprise_id is distinct from public.mon_entreprise() then
    raise exception 'Commande inaccessible.';
  end if;
  if c.statut not in ('a_faire', 'prete') then
    raise exception 'Cette commande ne peut plus être annulée.';
  end if;

  perform set_config('prodtrack.commande_rpc', '1', true);
  update commandes
  set statut = 'annulee',
      annulee_le = now()
  where id = p_commande;
end;
$$;

revoke all on function public.marquer_commande_prete(uuid) from public;
revoke all on function public.annuler_commande_prete(uuid) from public;
revoke all on function public.marquer_commande_recuperee(uuid) from public;
revoke all on function public.annuler_commande(uuid) from public;
revoke execute on function public.marquer_commande_prete(uuid) from anon;
revoke execute on function public.annuler_commande_prete(uuid) from anon;
revoke execute on function public.marquer_commande_recuperee(uuid) from anon;
revoke execute on function public.annuler_commande(uuid) from anon;
grant execute on function public.marquer_commande_prete(uuid) to authenticated;
grant execute on function public.annuler_commande_prete(uuid) to authenticated;
grant execute on function public.marquer_commande_recuperee(uuid) to authenticated;
grant execute on function public.annuler_commande(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.commandes enable row level security;

create policy commandes_select on public.commandes for select
  using (
    public.mon_entreprise() is not null
    and entreprise_id = public.mon_entreprise()
  );

create policy commandes_insert on public.commandes for insert
  with check (
    (public.mon_role() = 'vendeuse' or public.est_admin())
    and public.mon_entreprise() is not null
  );

create policy commandes_update on public.commandes for update
  using (
    (public.mon_role() = 'vendeuse' or public.est_admin())
    and entreprise_id = public.mon_entreprise()
    and statut = 'a_faire'
  )
  with check (
    (public.mon_role() = 'vendeuse' or public.est_admin())
    and entreprise_id = public.mon_entreprise()
    and statut = 'a_faire'
  );

-- Lecture des prénoms (qui a pris / fait la commande) dans toute l'entreprise.
create policy profils_select_entreprise on public.profils for select
  using (
    public.mon_entreprise() is not null
    and entreprise_id = public.mon_entreprise()
  );

-- ---------------------------------------------------------------------
-- CA journalier : ventes + commandes récupérées avec prix
-- ---------------------------------------------------------------------
create or replace view public.ca_journalier
with (security_invoker = true)
as
select
  s.jour,
  p.boutique_id,
  s.fabricant_id,
  s.produit_id,
  p.nom as produit_nom,
  s.vendu,
  s.jete,
  s.reste,
  s.prix_unitaire_centimes,
  (s.vendu * s.prix_unitaire_centimes) as ca_centimes,
  null::uuid as commande_id
from public.saisies_vente s
join public.produits p on p.id = s.produit_id
union all
select
  (c.recuperee_le at time zone 'Europe/Paris')::date as jour,
  c.boutique_fabrication_id as boutique_id,
  c.fabricant_id,
  null::uuid as produit_id,
  ('Commande : ' || c.gateau) as produit_nom,
  1 as vendu,
  0 as jete,
  0 as reste,
  c.prix_centimes as prix_unitaire_centimes,
  c.prix_centimes as ca_centimes,
  c.id as commande_id
from public.commandes c
where c.statut = 'recuperee'
  and c.prix_centimes is not null
  and (
    public.est_admin()
    or c.fabricant_id = auth.uid()
    or (
      public.mon_role() = 'vendeuse'
      and c.boutique_fabrication_id = public.ma_boutique()
    )
  );

grant select on public.ca_journalier to authenticated;
