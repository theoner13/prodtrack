-- =====================================================================
-- ProdTrack — Laboratoire (étape 2)
-- Commandes au labo, prix figé des sorties, CA laboratoire, prévision.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table commandes_labo
-- ---------------------------------------------------------------------
create table public.commandes_labo (
  id               uuid primary key default gen_random_uuid(),
  laboratoire_id   uuid not null references public.boutiques(id),
  produit_id       uuid not null references public.produits(id),
  quantite         integer not null check (quantite > 0),
  pour_le          date not null,
  client           text,
  note             text,
  cree_par         uuid not null default auth.uid() references public.profils(id),
  created_at       timestamptz not null default now(),
  annulee_le       timestamptz
);

create index commandes_labo_labo_pour_le
  on public.commandes_labo (laboratoire_id, pour_le);
create index commandes_labo_produit_pour_le
  on public.commandes_labo (produit_id, pour_le)
  where annulee_le is null;

-- Contrôles à l'écriture : produit du labo, même entreprise, trim.
create or replace function public.preparer_commande_labo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boutique_produit uuid;
  v_est_labo boolean;
  v_ent_labo uuid;
  v_ent_prod uuid;
begin
  if tg_op = 'INSERT' then
    if new.cree_par is null then
      new.cree_par := auth.uid();
    end if;
    new.annulee_le := null;
  end if;

  select b.est_laboratoire, b.entreprise_id
    into v_est_labo, v_ent_labo
  from public.boutiques b where b.id = new.laboratoire_id;
  if not found or not coalesce(v_est_labo, false) then
    raise exception 'Le destinataire doit être un laboratoire.';
  end if;

  select p.boutique_id, b.entreprise_id
    into v_boutique_produit, v_ent_prod
  from public.produits p
  join public.boutiques b on b.id = p.boutique_id
  where p.id = new.produit_id;
  if not found then
    raise exception 'Produit introuvable.';
  end if;
  if v_boutique_produit is distinct from new.laboratoire_id then
    raise exception 'Le produit doit appartenir à ce laboratoire.';
  end if;
  if v_ent_labo is null or v_ent_prod is null or v_ent_labo is distinct from v_ent_prod then
    raise exception 'Laboratoire et produit doivent être de la même entreprise.';
  end if;

  if new.client is not null then
    new.client := nullif(trim(new.client), '');
  end if;
  if new.note is not null then
    new.note := nullif(trim(new.note), '');
  end if;

  return new;
end;
$$;

create trigger commandes_labo_preparer
  before insert or update on public.commandes_labo
  for each row execute function public.preparer_commande_labo();

-- Laboratoire : ne peut qu'annuler (poser annulee_le). Admin : tout.
create or replace function public.proteger_commande_labo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.est_admin() then
    return new;
  end if;
  if old.annulee_le is not null then
    raise exception 'Cette commande est déjà annulée.';
  end if;
  if new.annulee_le is null then
    raise exception 'Seule l''annulation est autorisée.';
  end if;
  new.laboratoire_id := old.laboratoire_id;
  new.produit_id := old.produit_id;
  new.quantite := old.quantite;
  new.pour_le := old.pour_le;
  new.client := old.client;
  new.note := old.note;
  new.cree_par := old.cree_par;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger commandes_labo_proteger
  before update on public.commandes_labo
  for each row execute function public.proteger_commande_labo();

-- Notification au fabricant à la création.
create or replace function public.notifier_commande_labo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produit text;
  v_fabricant uuid;
  v_message text;
begin
  select p.nom, p.fabricant_id into v_produit, v_fabricant
  from public.produits p where p.id = new.produit_id;
  if v_fabricant is null then
    return new;
  end if;

  v_message := 'Pour le ' || to_char(new.pour_le, 'DD/MM');
  if new.client is not null and length(new.client) > 0 then
    v_message := v_message || ' · ' || new.client;
  end if;

  insert into public.notifications (profil_id, titre, message)
  values (
    v_fabricant,
    'Commande labo : ' || new.quantite::text || ' ' || coalesce(v_produit, 'produit'),
    v_message
  );
  return new;
end;
$$;

create trigger commandes_labo_apres_insert_notif
  after insert on public.commandes_labo
  for each row execute function public.notifier_commande_labo();

alter table public.commandes_labo enable row level security;

create policy commandes_labo_select on public.commandes_labo for select
  using (
    public.est_admin()
    or (
      public.mon_role() = 'laboratoire'
      and laboratoire_id = public.ma_boutique()
    )
    or exists (
      select 1 from public.produits p
      where p.id = produit_id and p.fabricant_id = auth.uid()
    )
  );

create policy commandes_labo_insert on public.commandes_labo for insert
  with check (
    cree_par = auth.uid()
    and (
      public.est_admin()
      or (
        public.mon_role() = 'laboratoire'
        and laboratoire_id = public.ma_boutique()
      )
    )
  );

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

-- ---------------------------------------------------------------------
-- 2. Prix figé des sorties de laboratoire
-- ---------------------------------------------------------------------
alter table public.mouvements_stock
  add column if not exists prix_unitaire_centimes integer
  check (prix_unitaire_centimes is null or prix_unitaire_centimes >= 0);

create or replace function public.figer_prix_sortie_labo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prix integer;
  v_est_labo boolean;
begin
  if new.type is distinct from 'sortie' then
    return new;
  end if;
  select p.prix_centimes, b.est_laboratoire
    into v_prix, v_est_labo
  from public.produits p
  join public.boutiques b on b.id = p.boutique_id
  where p.id = new.produit_id;
  if coalesce(v_est_labo, false) then
    new.prix_unitaire_centimes := coalesce(v_prix, 0);
  end if;
  return new;
end;
$$;

drop trigger if exists mouvements_figer_prix_labo on public.mouvements_stock;
create trigger mouvements_figer_prix_labo
  before insert on public.mouvements_stock
  for each row execute function public.figer_prix_sortie_labo();

-- ---------------------------------------------------------------------
-- 3. Vue CA laboratoire (admin seulement, séparée de ca_journalier)
-- ---------------------------------------------------------------------
create or replace view public.ca_laboratoire
with (security_invoker = true)
as
select
  m.jour,
  p.boutique_id as laboratoire_id,
  p.fabricant_id,
  m.produit_id,
  p.nom as produit_nom,
  m.quantite,
  m.prix_unitaire_centimes,
  (m.quantite * coalesce(m.prix_unitaire_centimes, 0)) as ca_centimes
from public.mouvements_stock m
join public.produits p on p.id = m.produit_id
join public.boutiques b on b.id = p.boutique_id
where m.type = 'sortie'
  and b.est_laboratoire
  and public.est_admin();

grant select on public.ca_laboratoire to authenticated;

-- ---------------------------------------------------------------------
-- 4. Prévision : sorties habituelles + commandes labo non annulées
-- Risque de double comptage si une commande est aussi une habitude : accepté.
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
            and c.annulee_le is null;
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
              and c.annulee_le is null;
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
