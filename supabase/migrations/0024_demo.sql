-- =====================================================================
-- 0024 : version démo
-- Copie figée de l'entreprise « Boulangerie Démo » (données de test réalistes).
-- Chaque nuit, demo.reinitialiser() efface ce que les visiteurs ont changé
-- et remet la copie, dates décalées pour que le dernier jour soit aujourd'hui.
-- =====================================================================

create schema if not exists demo;
revoke all on schema demo from public, anon, authenticated;

-- Jour de référence : dernier jour de données de la copie (devient « aujourd'hui »).
create table demo.reglages as
select '35be7342-d21e-4d15-8784-8002259625ad'::uuid as entreprise_id,
       'Boulangerie Démo'::text as nom,
       date '2026-11-02' as jour_reference;

-- Les 3 comptes ouverts depuis la page /demo (mot de passe public, remis chaque nuit).
create table demo.comptes as
select u.id, u.email
from auth.users u
where u.id in (
  'a9b2a801-5f81-43bf-8a70-6a8925bfee42', -- Claire Martin, admin
  '31e34a42-fcdd-4d3a-9616-b9f518eae809', -- Julien Girard, pâtissier Boutique Gare
  '146b2bfd-4fbd-4a3f-b81e-aada483992be'  -- Nadia Benali, vente Boutique Gare
);

create table demo.boutiques as
select * from public.boutiques
where entreprise_id = (select entreprise_id from demo.reglages);

create table demo.profils as
select * from public.profils
where entreprise_id = (select entreprise_id from demo.reglages);

create table demo.produits as
select * from public.produits
where boutique_id in (select id from demo.boutiques);

create table demo.ingredients_recette as
select * from public.ingredients_recette where produit_id in (select id from demo.produits);

create table demo.mouvements_stock as
select * from public.mouvements_stock where produit_id in (select id from demo.produits);

create table demo.saisies_vente as
select * from public.saisies_vente where produit_id in (select id from demo.produits);

create table demo.pertes_production as
select * from public.pertes_production where produit_id in (select id from demo.produits);

create table demo.commandes as
select * from public.commandes where entreprise_id = (select entreprise_id from demo.reglages);

create table demo.notifications as
select * from public.notifications
where profil_id in (select id from demo.profils)
  and created_at < (select jour_reference + 1 from demo.reglages);

-- ---------------------------------------------------------------------
-- Remise à zéro
-- ---------------------------------------------------------------------
create or replace function demo.reinitialiser() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ent   uuid;
  v_nom   text;
  v_jours int;
  v_decal interval;
begin
  select entreprise_id, nom, public.aujourdhui() - jour_reference
    into v_ent, v_nom, v_jours
    from demo.reglages;
  v_decal := make_interval(days => v_jours);

  -- Pas de déclencheurs (notifications, contrôles des rôles, prix) pendant la copie.
  -- Remis à la fin ; en cas d'erreur, tout est annulé, déclencheurs compris.
  alter table profils disable trigger user;
  alter table produits disable trigger user;
  alter table saisies_vente disable trigger user;
  alter table notifications disable trigger user;
  alter table commandes disable trigger user;
  alter table mouvements_stock disable trigger user;

  -- 1. Tout ce qui existe aujourd'hui dans l'entreprise démo (y compris ajouté par les visiteurs)
  create temp table t_produits on commit drop as
    select p.id from produits p join boutiques b on b.id = p.boutique_id where b.entreprise_id = v_ent;
  create temp table t_profils on commit drop as
    select id from profils where entreprise_id = v_ent;

  delete from notifications where profil_id in (select id from t_profils);
  delete from push_tokens where profil_id in (select id from t_profils);
  delete from commandes where entreprise_id = v_ent;
  delete from mouvements_stock where produit_id in (select id from t_produits);
  delete from saisies_vente where produit_id in (select id from t_produits);
  delete from pertes_production where produit_id in (select id from t_produits);
  delete from ingredients_recette where produit_id in (select id from t_produits);
  delete from previsions where produit_id in (select id from t_produits);
  delete from produits where id in (select id from t_produits);
  delete from profils where id in (select id from t_profils);
  delete from boutiques where entreprise_id = v_ent;

  -- 2. Copie figée
  update entreprises set nom = v_nom where id = v_ent;
  insert into boutiques select * from demo.boutiques;
  insert into profils select * from demo.profils;
  insert into produits select * from demo.produits;
  insert into ingredients_recette select * from demo.ingredients_recette;
  insert into commandes select * from demo.commandes;
  insert into notifications select * from demo.notifications;

  -- 3. Dates décalées : le dernier jour de la copie devient aujourd'hui
  insert into mouvements_stock (id, produit_id, type, quantite, jour, saisi_par, created_at, prix_unitaire_centimes)
    select id, produit_id, type, quantite, jour + v_jours, saisi_par, created_at + v_decal, prix_unitaire_centimes
    from demo.mouvements_stock;
  insert into saisies_vente (id, produit_id, jour, vendu, jete, reste, prix_unitaire_centimes, fabricant_id, saisi_par, modifie_le)
    select id, produit_id, jour + v_jours, vendu, jete, reste, prix_unitaire_centimes, fabricant_id, saisi_par, modifie_le + v_decal
    from demo.saisies_vente;
  insert into pertes_production (id, produit_id, jour, quantite, motif, dans_le_stock, saisi_par, created_at)
    select id, produit_id, jour + v_jours, quantite, motif, dans_le_stock, saisi_par, created_at + v_decal
    from demo.pertes_production;
  update notifications set created_at = created_at + v_decal
    where profil_id in (select id from demo.profils);
  update commandes set
      retrait_le = retrait_le + v_decal,
      cree_le = cree_le + v_decal,
      modifie_le = modifie_le + v_decal,
      prete_le = prete_le + v_decal,
      recue_le = recue_le + v_decal,
      recuperee_le = recuperee_le + v_decal,
      annulee_le = annulee_le + v_decal,
      non_recue_signalee_le = non_recue_signalee_le + v_decal
    where entreprise_id = v_ent;

  -- 4. Comptes démo : email et mot de passe d'origine (un visiteur a pu les changer)
  update auth.users u set
      email = c.email,
      encrypted_password = crypt('demo-prodtrack', gen_salt('bf')),
      email_confirmed_at = coalesce(u.email_confirmed_at, now()),
      banned_until = null
    from demo.comptes c
    where u.id = c.id;

  alter table profils enable trigger user;
  alter table produits enable trigger user;
  alter table saisies_vente enable trigger user;
  alter table notifications enable trigger user;
  alter table commandes enable trigger user;
  alter table mouvements_stock enable trigger user;
end $$;

revoke execute on function demo.reinitialiser() from public, anon, authenticated;

-- Chaque nuit à 1 h 45 UTC (2 h 45 ou 3 h 45 à Paris), avant les prévisions de 3 h UTC
-- qui recalculent le planning.
select cron.schedule('demo-reinitialiser', '45 1 * * *', 'select demo.reinitialiser();');

-- Première mise en place, puis prévisions à jour pour le planning.
select demo.reinitialiser();
select public.calculer_previsions();
