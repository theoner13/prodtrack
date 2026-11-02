-- =====================================================================
-- ProdTrack — règles finales des commandes (après 0016)
-- Boutique de retrait = boutique de prise ; statut « reçue » ; signalement
-- non reçu ; RLS resserrée ; CA vendeuse = commandes de sa boutique.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enum + colonnes
-- ---------------------------------------------------------------------
alter type public.statut_commande add value if not exists 'recue' after 'prete';

alter table public.commandes
  add column if not exists recue_le timestamptz,
  add column if not exists recue_par uuid references public.profils(id),
  add column if not exists non_recue_signalee_le timestamptz,
  add column if not exists non_recue_signalee_par uuid references public.profils(id);

-- ---------------------------------------------------------------------
-- Préparation : boutique de retrait = boutique de la vendeuse
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
    -- Boutique de retrait = boutique de prise (vendeuse) ; admin doit la choisir.
    if public.mon_role() = 'vendeuse' then
      if public.ma_boutique() is null then
        raise exception 'Boutique introuvable.';
      end if;
      new.boutique_retrait_id := public.ma_boutique();
    elsif public.est_admin() then
      if new.boutique_retrait_id is null then
        raise exception 'Choisissez la boutique de prise de la commande.';
      end if;
    else
      raise exception 'Réservé à l''équipe de vente ou à l''admin.';
    end if;
    new.statut := 'a_faire';
    new.fabricant_id := null;
    new.prete_le := null;
    new.recue_le := null;
    new.recue_par := null;
    new.recuperee_le := null;
    new.recuperee_par := null;
    new.annulee_le := null;
    new.non_recue_signalee_le := null;
    new.non_recue_signalee_par := null;
    if new.retrait_le < now() then
      raise exception 'La date et l''heure de retrait ne peuvent pas être dans le passé.';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    -- Boutique de retrait figée après création.
    new.boutique_retrait_id := old.boutique_retrait_id;
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

-- Empêche de changer statut / fabricant / dates hors RPC.
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
     or new.recue_le is distinct from old.recue_le
     or new.recue_par is distinct from old.recue_par
     or new.recuperee_le is distinct from old.recuperee_le
     or new.recuperee_par is distinct from old.recuperee_par
     or new.annulee_le is distinct from old.annulee_le
     or new.non_recue_signalee_le is distinct from old.non_recue_signalee_le
     or new.non_recue_signalee_par is distinct from old.non_recue_signalee_par then
    raise exception 'Le statut de la commande se change uniquement via les actions prévues.';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS (remplace commandes_select / update de 0016)
-- ---------------------------------------------------------------------
drop policy if exists commandes_select on public.commandes;
create policy commandes_select on public.commandes for select
  using (
    public.mon_entreprise() is not null
    and entreprise_id = public.mon_entreprise()
    and (
      public.est_admin()
      or public.mon_role() = 'patissier'
      or (
        public.mon_role() = 'vendeuse'
        and boutique_retrait_id = public.ma_boutique()
      )
    )
  );

drop policy if exists commandes_update on public.commandes;
create policy commandes_update on public.commandes for update
  using (
    entreprise_id = public.mon_entreprise()
    and statut = 'a_faire'
    and (
      public.est_admin()
      or (
        public.mon_role() = 'vendeuse'
        and boutique_retrait_id = public.ma_boutique()
      )
    )
  )
  with check (
    entreprise_id = public.mon_entreprise()
    and statut = 'a_faire'
    and (
      public.est_admin()
      or (
        public.mon_role() = 'vendeuse'
        and boutique_retrait_id = public.ma_boutique()
      )
    )
  );

-- profils_select_entreprise (0016) : conservée telle quelle.

-- ---------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------
create or replace function public.marquer_commande_prete(p_commande uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.commandes%rowtype;
  v_meme_boutique boolean;
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

  v_meme_boutique := c.boutique_fabrication_id = c.boutique_retrait_id;

  perform set_config('prodtrack.commande_rpc', '1', true);
  if v_meme_boutique then
    -- Même boutique : prêt = déjà reçu sur place.
    update commandes
    set statut = 'recue',
        fabricant_id = auth.uid(),
        prete_le = now(),
        recue_le = now(),
        recue_par = auth.uid(),
        non_recue_signalee_le = null,
        non_recue_signalee_par = null
    where id = p_commande;
  else
    update commandes
    set statut = 'prete',
        fabricant_id = auth.uid(),
        prete_le = now()
    where id = p_commande;
  end if;
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

create or replace function public.marquer_commande_recue(p_commande uuid)
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
  if public.mon_role() = 'vendeuse' and c.boutique_retrait_id is distinct from public.ma_boutique() then
    raise exception 'Seule la boutique qui a pris la commande peut la marquer reçue.';
  end if;
  if c.statut is distinct from 'prete' then
    raise exception 'La commande n''est pas encore prête.';
  end if;

  perform set_config('prodtrack.commande_rpc', '1', true);
  update commandes
  set statut = 'recue',
      recue_le = now(),
      recue_par = auth.uid(),
      non_recue_signalee_le = null,
      non_recue_signalee_par = null
  where id = p_commande;
end;
$$;

create or replace function public.annuler_commande_recue(p_commande uuid)
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
  if public.mon_role() = 'vendeuse' and c.boutique_retrait_id is distinct from public.ma_boutique() then
    raise exception 'Seule la boutique qui a pris la commande peut annuler la réception.';
  end if;
  if c.statut is distinct from 'recue' then
    raise exception 'Cette commande n''est pas marquée reçue.';
  end if;

  perform set_config('prodtrack.commande_rpc', '1', true);
  update commandes
  set statut = 'prete',
      recue_le = null,
      recue_par = null
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
  if public.mon_role() = 'vendeuse' and c.boutique_retrait_id is distinct from public.ma_boutique() then
    raise exception 'Seule la boutique qui a pris la commande peut la marquer récupérée.';
  end if;
  if c.statut is distinct from 'recue' then
    raise exception 'La commande doit d''abord être marquée reçue.';
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
  if public.mon_role() = 'vendeuse' and c.boutique_retrait_id is distinct from public.ma_boutique() then
    raise exception 'Seule la boutique qui a pris la commande peut l''annuler.';
  end if;
  if c.statut not in ('a_faire', 'prete', 'recue') then
    raise exception 'Cette commande ne peut plus être annulée.';
  end if;

  perform set_config('prodtrack.commande_rpc', '1', true);
  update commandes
  set statut = 'annulee',
      annulee_le = now()
  where id = p_commande;
end;
$$;

create or replace function public.signaler_commande_non_recue(p_commande uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.commandes%rowtype;
  v_seuil timestamptz;
  v_heure text;
  v_boutique text;
  v_titre text;
  v_message text;
  r record;
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
  if public.mon_role() = 'vendeuse' and c.boutique_retrait_id is distinct from public.ma_boutique() then
    raise exception 'Seule la boutique qui a pris la commande peut signaler un non-reçu.';
  end if;
  if c.statut not in ('a_faire', 'prete') then
    raise exception 'Cette commande a déjà été reçue ou clôturée.';
  end if;
  if c.non_recue_signalee_le is not null then
    raise exception 'Cette commande a déjà été signalée non reçue.';
  end if;

  v_seuil := c.retrait_le - interval '1 hour';
  if now() < v_seuil then
    v_heure :=
      to_char(v_seuil at time zone 'Europe/Paris', 'HH24')
      || 'h'
      || to_char(v_seuil at time zone 'Europe/Paris', 'MI');
    raise exception 'Vous pourrez signaler un gâteau non reçu à partir de %.', v_heure;
  end if;

  select b.nom into v_boutique from boutiques b where b.id = c.boutique_retrait_id;
  v_heure :=
    to_char(c.retrait_le at time zone 'Europe/Paris', 'HH24')
    || 'h'
    || to_char(c.retrait_le at time zone 'Europe/Paris', 'MI');
  v_titre := 'Commande non reçue : ' || c.gateau;
  v_message :=
    'Retrait prévu à '
    || v_heure
    || ' à '
    || coalesce(v_boutique, '—')
    || ', client '
    || c.client_nom;

  perform set_config('prodtrack.commande_rpc', '1', true);
  update commandes
  set non_recue_signalee_le = now(),
      non_recue_signalee_par = auth.uid()
  where id = p_commande;

  for r in
    select p.id
    from profils p
    where p.boutique_id = c.boutique_fabrication_id
      and p.role = 'patissier'
      and p.archive_le is null
  loop
    insert into notifications (profil_id, titre, message)
    values (r.id, v_titre, v_message);
  end loop;
end;
$$;

revoke all on function public.marquer_commande_recue(uuid) from public;
revoke all on function public.annuler_commande_recue(uuid) from public;
revoke all on function public.signaler_commande_non_recue(uuid) from public;
revoke execute on function public.marquer_commande_recue(uuid) from anon;
revoke execute on function public.annuler_commande_recue(uuid) from anon;
revoke execute on function public.signaler_commande_non_recue(uuid) from anon;
grant execute on function public.marquer_commande_recue(uuid) to authenticated;
grant execute on function public.annuler_commande_recue(uuid) to authenticated;
grant execute on function public.signaler_commande_non_recue(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- CA journalier : vendeuse = commandes prises dans sa boutique
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
      and c.boutique_retrait_id = public.ma_boutique()
    )
  );

grant select on public.ca_journalier to authenticated;
