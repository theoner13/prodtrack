-- =====================================================================
-- ProdTrack — schéma initial de la base de données (Supabase / Postgres)
-- À coller tel quel dans Supabase > SQL Editor > New query > Run
-- Voir docs/01-ARCHITECTURE.md pour les explications.
-- =====================================================================

-- ---------- Types ----------
create type public.role_employe as enum ('admin', 'patissier', 'vendeuse');
create type public.type_mouvement as enum ('production', 'sortie', 'ajustement');
create type public.type_conservation as enum ('frais', 'surgele');

-- Date du jour en heure française (le serveur est en UTC)
create or replace function public.aujourdhui() returns date
language sql stable as $$ select (now() at time zone 'Europe/Paris')::date $$;

-- =====================================================================
-- TABLES
-- =====================================================================

-- Une entreprise = un patron et ses boutiques
create table public.entreprises (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  created_at  timestamptz not null default now()
);

create table public.boutiques (
  id               uuid primary key default gen_random_uuid(),
  entreprise_id    uuid not null references public.entreprises(id) on delete cascade,
  nom              text not null,
  adresse          text,
  -- Code à donner aux employés pour rejoindre la boutique
  code_invitation  text not null unique
                   default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  created_at       timestamptz not null default now()
);

-- Profil = un employé (ou le patron). Jamais supprimé : archivé.
create table public.profils (
  id              uuid primary key references auth.users(id),
  entreprise_id   uuid not null references public.entreprises(id),
  boutique_id     uuid references public.boutiques(id),       -- null pour l'admin
  role            public.role_employe not null,
  prenom          text not null,
  nom             text not null,
  photo_url       text,
  equipe          text check (equipe in ('jour', 'nuit')),     -- pâtissiers
  information_rgpd_acceptee_le timestamptz,
  archive_le      timestamptz,
  created_at      timestamptz not null default now(),
  check (role = 'admin' or boutique_id is not null)
);

-- Un produit appartient à une boutique et a UN SEUL fabricant
create table public.produits (
  id                       uuid primary key default gen_random_uuid(),
  boutique_id              uuid not null references public.boutiques(id),
  fabricant_id             uuid not null references public.profils(id),
  nom                      text not null check (length(trim(nom)) > 0),
  prix_centimes            integer not null check (prix_centimes >= 0),
  photo_url                text,
  conservation             public.type_conservation not null default 'frais',
  duree_conservation_jours integer check (duree_conservation_jours > 0),
  seuil_min                integer not null default 0 check (seuil_min >= 0),
  impose_par_admin         boolean not null default false,   -- gamme obligatoire
  archive_le               timestamptz,
  created_at               timestamptz not null default now()
);
-- Pas deux produits actifs avec le même nom dans une boutique
create unique index produits_nom_unique
  on public.produits (boutique_id, lower(trim(nom))) where archive_le is null;

create table public.ingredients_recette (
  id          uuid primary key default gen_random_uuid(),
  produit_id  uuid not null references public.produits(id) on delete cascade,
  ingredient  text not null,
  quantite    numeric not null check (quantite > 0),
  unite       text not null,          -- g, kg, ml, l, pièce...
  ordre       integer not null default 0
);

-- Mouvements du stock (congélateur / frigo)
-- production : +quantite | sortie : -quantite | ajustement : quantite signée (admin)
create table public.mouvements_stock (
  id          uuid primary key default gen_random_uuid(),
  produit_id  uuid not null references public.produits(id),
  type        public.type_mouvement not null,
  quantite    integer not null,
  jour        date not null default public.aujourdhui(),
  saisi_par   uuid not null default auth.uid() references public.profils(id),
  created_at  timestamptz not null default now(),
  check ((type in ('production', 'sortie') and quantite > 0) or (type = 'ajustement' and quantite <> 0))
);
create index mouvements_produit_jour on public.mouvements_stock (produit_id, jour);

-- Saisie de fin de journée de la vendeuse : 1 ligne par produit et par jour
create table public.saisies_vente (
  id                      uuid primary key default gen_random_uuid(),
  produit_id              uuid not null references public.produits(id),
  jour                    date not null default public.aujourdhui(),
  vendu                   integer not null default 0 check (vendu >= 0),
  jete                    integer not null default 0 check (jete >= 0),
  reste                   integer not null default 0 check (reste >= 0),
  -- Copiés automatiquement à la création (trigger) : le CA garde le prix
  -- et le fabricant du jour de la vente, même si on les change ensuite.
  prix_unitaire_centimes  integer not null,
  fabricant_id            uuid not null references public.profils(id),
  saisi_par               uuid not null default auth.uid() references public.profils(id),
  modifie_le              timestamptz not null default now(),
  unique (produit_id, jour)
);
create index saisies_fabricant_jour on public.saisies_vente (fabricant_id, jour);

-- Résultat du calcul de prévision (1 ligne par produit, recalculée chaque nuit)
create table public.previsions (
  produit_id         uuid primary key references public.produits(id) on delete cascade,
  calcule_le         timestamptz not null default now(),
  stock_actuel       integer not null,
  jour_fabrication   date,              -- null = rien à fabriquer dans les 14 jours
  quantite_suggeree  integer,
  fiable             boolean not null,  -- false = moins de 8 semaines d'historique
  detail             jsonb not null     -- [{jour, prevu, stock_fin}] sur 14 jours
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  profil_id   uuid not null references public.profils(id),
  titre       text not null,
  message     text not null,
  lu          boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_profil on public.notifications (profil_id, created_at desc);

-- =====================================================================
-- FONCTIONS D'AIDE POUR LES DROITS (security definer = évite les boucles RLS)
-- =====================================================================

create or replace function public.mon_role() returns public.role_employe
language sql stable security definer set search_path = public as $$
  select role from profils where id = auth.uid() and archive_le is null
$$;

create or replace function public.mon_entreprise() returns uuid
language sql stable security definer set search_path = public as $$
  select entreprise_id from profils where id = auth.uid() and archive_le is null
$$;

create or replace function public.ma_boutique() returns uuid
language sql stable security definer set search_path = public as $$
  select boutique_id from profils where id = auth.uid() and archive_le is null
$$;

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profils
                   where id = auth.uid() and archive_le is null), false)
$$;

create or replace function public.peut_voir_boutique(p_boutique uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profils pr join boutiques b on b.id = p_boutique
    where pr.id = auth.uid() and pr.archive_le is null
      and (pr.boutique_id = b.id or (pr.role = 'admin' and pr.entreprise_id = b.entreprise_id))
  )
$$;

create or replace function public.produit_boutique(p_produit uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select boutique_id from produits where id = p_produit
$$;

create or replace function public.peut_voir_produit(p_produit uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.peut_voir_boutique(public.produit_boutique(p_produit))
$$;

create or replace function public.peut_modifier_produit(p_produit uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from produits p where p.id = p_produit and (
      (p.fabricant_id = auth.uid() and public.mon_role() = 'patissier')
      or (public.est_admin() and public.peut_voir_boutique(p.boutique_id))
    )
  )
$$;

-- =====================================================================
-- TRIGGERS (règles métier garanties par la base)
-- =====================================================================

-- Un employé ne peut pas changer lui-même son rôle, sa boutique ni son archivage
create or replace function public.proteger_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() est null quand on passe par l'éditeur SQL Supabase : pas de contrôle
  if auth.uid() is not null and not public.est_admin() then
    if new.role is distinct from old.role
       or new.boutique_id is distinct from old.boutique_id
       or new.entreprise_id is distinct from old.entreprise_id
       or new.archive_le is distinct from old.archive_le then
      raise exception 'Modification non autorisée';
    end if;
  end if;
  return new;
end $$;
create trigger proteger_profil before update on public.profils
  for each row execute function public.proteger_profil();

-- Fabricant valide + protection de la gamme obligatoire
create or replace function public.verifier_produit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.fabricant_id <> old.fabricant_id then
    if not exists (select 1 from profils
                   where id = new.fabricant_id and role = 'patissier'
                     and boutique_id = new.boutique_id and archive_le is null) then
      raise exception 'Le fabricant doit être un pâtissier actif de cette boutique';
    end if;
  end if;
  if tg_op = 'UPDATE' and auth.uid() is not null and not public.est_admin() then
    if new.fabricant_id <> old.fabricant_id or new.boutique_id <> old.boutique_id
       or new.impose_par_admin <> old.impose_par_admin then
      raise exception 'Seul le patron peut modifier ce champ';
    end if;
    if old.impose_par_admin and (new.archive_le is distinct from old.archive_le or new.nom <> old.nom) then
      raise exception 'Produit imposé par le patron : impossible de le retirer ou de le renommer';
    end if;
  end if;
  return new;
end $$;
create trigger verifier_produit before insert or update on public.produits
  for each row execute function public.verifier_produit();

-- Saisie vendeuse : copie prix + fabricant à la création, trace qui a modifié
create or replace function public.preparer_saisie_vente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select prix_centimes, fabricant_id into new.prix_unitaire_centimes, new.fabricant_id
    from produits where id = new.produit_id;
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
create trigger preparer_saisie_vente before insert or update on public.saisies_vente
  for each row execute function public.preparer_saisie_vente();

-- =====================================================================
-- VUES (calculs prêts à lire par l'application)
-- =====================================================================

-- Stock = production - sorties + ajustements (règle 4.1)
create view public.stock_actuel with (security_invoker = true) as
select p.id as produit_id, p.boutique_id, p.fabricant_id, p.nom, p.seuil_min,
       coalesce(sum(case m.type when 'sortie' then -m.quantite else m.quantite end), 0)::int as stock
from public.produits p
left join public.mouvements_stock m on m.produit_id = p.id
where p.archive_le is null
group by p.id;

-- CA = vendu x prix du jour, attribué au fabricant (règle 4.2)
create view public.ca_journalier with (security_invoker = true) as
select s.jour, p.boutique_id, s.fabricant_id, s.produit_id, p.nom as produit_nom,
       s.vendu, s.jete, s.reste, s.prix_unitaire_centimes,
       (s.vendu * s.prix_unitaire_centimes) as ca_centimes
from public.saisies_vente s
join public.produits p on p.id = s.produit_id;

-- =====================================================================
-- DROITS D'ACCÈS (Row Level Security)
-- =====================================================================

alter table public.entreprises         enable row level security;
alter table public.boutiques           enable row level security;
alter table public.profils             enable row level security;
alter table public.produits            enable row level security;
alter table public.ingredients_recette enable row level security;
alter table public.mouvements_stock    enable row level security;
alter table public.saisies_vente       enable row level security;
alter table public.previsions          enable row level security;
alter table public.notifications       enable row level security;

-- Entreprises
create policy entreprises_select on public.entreprises for select
  using (id = public.mon_entreprise());
create policy entreprises_update on public.entreprises for update
  using (public.est_admin() and id = public.mon_entreprise());

-- Boutiques
create policy boutiques_select on public.boutiques for select
  using (public.peut_voir_boutique(id));
create policy boutiques_insert on public.boutiques for insert
  with check (public.est_admin() and entreprise_id = public.mon_entreprise());
create policy boutiques_update on public.boutiques for update
  using (public.est_admin() and entreprise_id = public.mon_entreprise());

-- Profils (création uniquement via les fonctions creer_entreprise / rejoindre_boutique)
create policy profils_select on public.profils for select using (
  id = auth.uid()
  or (public.est_admin() and entreprise_id = public.mon_entreprise())
  or (boutique_id is not null and boutique_id = public.ma_boutique())
);
create policy profils_update_soi on public.profils for update using (id = auth.uid());
create policy profils_update_admin on public.profils for update
  using (public.est_admin() and entreprise_id = public.mon_entreprise());

-- Produits
create policy produits_select on public.produits for select
  using (public.peut_voir_boutique(boutique_id));
create policy produits_insert_patissier on public.produits for insert with check (
  public.mon_role() = 'patissier' and boutique_id = public.ma_boutique()
  and fabricant_id = auth.uid() and impose_par_admin = false
);
create policy produits_insert_admin on public.produits for insert
  with check (public.est_admin() and public.peut_voir_boutique(boutique_id));
create policy produits_update on public.produits for update
  using (public.peut_modifier_produit(id));

-- Recettes
create policy recettes_select on public.ingredients_recette for select
  using (public.peut_voir_produit(produit_id));
create policy recettes_insert on public.ingredients_recette for insert
  with check (public.peut_modifier_produit(produit_id));
create policy recettes_update on public.ingredients_recette for update
  using (public.peut_modifier_produit(produit_id));
create policy recettes_delete on public.ingredients_recette for delete
  using (public.peut_modifier_produit(produit_id));

-- Mouvements de stock
create policy mouvements_select on public.mouvements_stock for select
  using (public.peut_voir_produit(produit_id));
create policy mouvements_insert on public.mouvements_stock for insert with check (
  saisi_par = auth.uid() and (
    -- production : uniquement le fabricant du produit
    (type = 'production' and exists (select 1 from public.produits
       where id = produit_id and fabricant_id = auth.uid()))
    -- sortie : n'importe quel pâtissier de la boutique (règle 3.2.4)
    or (type = 'sortie' and public.mon_role() = 'patissier'
        and public.produit_boutique(produit_id) = public.ma_boutique())
    -- ajustement (inventaire, correction) : le patron
    or (type = 'ajustement' and public.est_admin() and public.peut_voir_produit(produit_id))
  )
);
-- Corriger une erreur : on peut annuler sa propre saisie du jour
create policy mouvements_delete on public.mouvements_stock for delete
  using (saisi_par = auth.uid() and jour = public.aujourdhui());

-- Saisies vendeuse : visibles par le patron, les vendeuses de la boutique
-- et le fabricant concerné (un pâtissier ne voit pas le CA des autres)
create policy saisies_select on public.saisies_vente for select using (
  (public.est_admin() and public.peut_voir_produit(produit_id))
  or (public.mon_role() = 'vendeuse' and public.produit_boutique(produit_id) = public.ma_boutique())
  or fabricant_id = auth.uid()
);
create policy saisies_insert on public.saisies_vente for insert with check (
  (public.mon_role() = 'vendeuse' and public.produit_boutique(produit_id) = public.ma_boutique())
  or (public.est_admin() and public.peut_voir_produit(produit_id))
);
create policy saisies_update on public.saisies_vente for update using (
  (public.mon_role() = 'vendeuse' and public.produit_boutique(produit_id) = public.ma_boutique())
  or (public.est_admin() and public.peut_voir_produit(produit_id))
);

-- Prévisions (écrites uniquement par le calcul de nuit)
create policy previsions_select on public.previsions for select
  using (public.peut_voir_produit(produit_id));

-- Notifications
create policy notifications_select on public.notifications for select
  using (profil_id = auth.uid());
create policy notifications_update on public.notifications for update
  using (profil_id = auth.uid());

-- =====================================================================
-- INSCRIPTION (appelées par l'app après création du compte email)
-- =====================================================================

-- Le patron crée son entreprise (et éventuellement sa première boutique)
create or replace function public.creer_entreprise(
  p_nom_entreprise text, p_prenom text, p_nom text, p_nom_boutique text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_entreprise uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if exists (select 1 from profils where id = auth.uid()) then
    raise exception 'Ce compte a déjà un profil';
  end if;
  insert into entreprises (nom) values (p_nom_entreprise) returning id into v_entreprise;
  insert into profils (id, entreprise_id, role, prenom, nom)
    values (auth.uid(), v_entreprise, 'admin', p_prenom, p_nom);
  if p_nom_boutique is not null and length(trim(p_nom_boutique)) > 0 then
    insert into boutiques (entreprise_id, nom) values (v_entreprise, p_nom_boutique);
  end if;
  return v_entreprise;
end $$;

-- Un employé rejoint une boutique avec le code donné par le patron
create or replace function public.rejoindre_boutique(
  p_code text, p_role public.role_employe, p_prenom text, p_nom text, p_equipe text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_boutique public.boutiques;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if exists (select 1 from profils where id = auth.uid()) then
    raise exception 'Ce compte a déjà un profil';
  end if;
  if p_role = 'admin' then raise exception 'Rôle non autorisé'; end if;
  select * into v_boutique from boutiques where code_invitation = upper(trim(p_code));
  if not found then raise exception 'Code boutique invalide'; end if;
  insert into profils (id, entreprise_id, boutique_id, role, prenom, nom, equipe)
    values (auth.uid(), v_boutique.entreprise_id, v_boutique.id, p_role, p_prenom, p_nom,
            case when p_role = 'patissier' then p_equipe else null end);
  return v_boutique.id;
end $$;

-- =====================================================================
-- PRÉVISION ET PLANNING (règle 4.3) — lancée chaque nuit (voir 0002_cron.sql)
-- Base : les SORTIES de stock (c'est ce qui fait baisser le stock).
-- >= 8 semaines d'historique : moyenne par jour de la semaine (10 dernières semaines max)
-- <  8 semaines              : moyenne simple par jour, fiable = false (avertissement)
-- Jour de fabrication = dernier jour avant que le stock prévu passe sous le seuil.
-- Quantité suggérée = de quoi couvrir min(7 jours, durée de conservation) + le seuil.
-- =====================================================================

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
  for p in select * from produits where archive_le is null loop
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

-- Le calcul ne peut pas être lancé depuis l'application
revoke execute on function public.calculer_previsions() from public, anon, authenticated;

-- =====================================================================
-- STOCKAGE DES PHOTOS (bucket privé ; règles d'accès ajoutées en phase 5)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;
