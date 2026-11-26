-- =====================================================================
-- 0025 : planning du pâtissier — production pour les boutiques
--        + planning de la démo plus fourni
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Production prévue pour les boutiques (produits frais du pâtissier connecté)
-- Quantité à produire un jour J = moyenne vendue les 4 mêmes jours de semaine
-- précédents (J-7, J-14, J-21, J-28, avant aujourd'hui), arrondie au-dessus.
-- deja_produit = production déjà saisie ce jour-là.
-- ---------------------------------------------------------------------
create or replace function public.production_boutiques(p_debut date, p_jours int)
returns table (
  jour date,
  produit_id uuid,
  nom text,
  boutique_id uuid,
  boutique_nom text,
  quantite int,
  deja_produit int
)
language sql stable security definer set search_path = public as $$
  with jours as (
    select (p_debut + g)::date as jour
    from generate_series(0, greatest(least(p_jours, 14), 1) - 1) g
  ),
  mes_produits as (
    select p.id, p.nom, p.boutique_id, b.nom as boutique_nom
    from produits p
    join boutiques b on b.id = p.boutique_id
    where p.fabricant_id = auth.uid()
      and p.archive_le is null
      and p.conservation = 'frais'
      and not p.intermediaire
  ),
  calcul as (
    select j.jour, mp.id as produit_id, mp.nom, mp.boutique_id, mp.boutique_nom,
      (select ceil(avg(s.vendu))::int
         from saisies_vente s
         where s.produit_id = mp.id
           and s.jour in (j.jour - 7, j.jour - 14, j.jour - 21, j.jour - 28)
           and s.jour < public.aujourdhui()) as quantite,
      (select coalesce(sum(m.quantite), 0)::int
         from mouvements_stock m
         where m.produit_id = mp.id and m.type = 'production' and m.jour = j.jour) as deja_produit
    from jours j cross join mes_produits mp
  )
  select jour, produit_id, nom, boutique_id, boutique_nom, coalesce(quantite, 0), deja_produit
  from calcul
  where coalesce(quantite, 0) > 0 or deja_produit > 0
  order by jour, nom, boutique_nom;
$$;

revoke execute on function public.production_boutiques(date, int) from public, anon;
grant execute on function public.production_boutiques(date, int) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Démo : données plus parlantes pour le planning de Julien (Boutique Gare)
-- (dates de la copie : le 02/11/2026 devient « aujourd'hui »)
-- ---------------------------------------------------------------------

-- Ancienneté des produits calée sur le début des données (sinon les moyennes de
-- prévision partent de la date de création réelle).
update demo.produits
set created_at = least(created_at, timestamptz '2026-09-18 08:00+02');

-- Surgelés de Julien : plus de sorties ces 2 dernières semaines, le stock
-- se rapproche du seuil (fabrication à prévoir dans la semaine).
insert into demo.mouvements_stock (id, produit_id, type, quantite, jour, saisi_par, created_at, prix_unitaire_centimes)
select gen_random_uuid(), p.id, 'sortie',
       case p.nom
         when 'Moelleux nutella' then 3
         when 'Moelleux pistache' then 2
         else 1 + (g % 2)
       end,
       date '2026-11-02' - g,
       p.fabricant_id,
       (date '2026-11-02' - g) + time '07:40',
       null
from demo.produits p
cross join generate_series(0, 13) g
where p.fabricant_id = '31e34a42-fcdd-4d3a-9616-b9f518eae809'
  and p.conservation = 'surgele'
  and p.archive_le is null;

-- Commandes de gâteaux fabriquées à la Boutique Gare, réparties sur la semaine.
insert into demo.commandes (
  id, entreprise_id, boutique_fabrication_id, boutique_retrait_id, client_nom, client_telephone,
  gateau, nb_parts, demandes, inscription, retrait_le, prix_centimes, acompte_centimes,
  statut, cree_par, cree_le, fabricant_id, prete_le, modifie_le)
select gen_random_uuid(), r.entreprise_id, gare.id, case when c.retrait_centre then centre.id else gare.id end,
       c.client, c.tel, c.gateau, c.parts, c.demandes, c.inscription,
       c.retrait, c.prix, c.acompte, c.statut::statut_commande,
       '146b2bfd-4fbd-4a3f-b81e-aada483992be', c.retrait - interval '4 days',
       case when c.statut = 'prete' then '31e34a42-fcdd-4d3a-9616-b9f518eae809'::uuid end,
       case when c.statut = 'prete' then c.retrait - interval '3 hours' end,
       c.retrait - interval '3 hours'
from demo.reglages r
join demo.boutiques gare on gare.nom = 'Boutique Gare'
join demo.boutiques centre on centre.nom = 'Boutique Centre'
cross join (values
  ('Anniversaire Léo', '06 12 48 75 30', 'Fraisier', 10, 'Sans alcool', 'Joyeux anniversaire Léo',
     timestamptz '2026-11-02 16:00+01', 4200, 1500, 'prete', false),
  ('Mme Lambert', '06 71 22 09 84', 'Tarte aux fraises', 8, null, null,
     timestamptz '2026-11-02 18:30+01', 3500, 0, 'a_faire', false),
  ('Restaurant Le Quai', '04 78 55 12 60', 'Tartelettes chocolat (lot)', 24, 'Livrer en boîtes de 6', null,
     timestamptz '2026-11-04 11:00+01', 8400, 3000, 'a_faire', true),
  ('Thomas Garnier', '07 66 31 40 12', 'Baba au rhum', 12, 'Rhum à part', null,
     timestamptz '2026-11-05 17:30+01', 5400, 2000, 'a_faire', false),
  ('Mairie (vin d''honneur)', '04 78 90 11 22', 'Tarte normande (plaques)', 40, 'Découpe en carrés', null,
     timestamptz '2026-11-06 10:00+01', 12000, 5000, 'a_faire', true),
  ('Lucie Perrin', '06 08 19 57 43', 'Tarte au citron meringuée', 8, null, 'Bonne retraite Michel',
     timestamptz '2026-11-07 15:00+01', 3600, 1000, 'a_faire', false),
  ('Famille Robert', '06 52 77 81 06', 'Saint-Honoré', 12, 'Crème vanille', 'Félicitations',
     timestamptz '2026-11-08 12:00+01', 6000, 2000, 'a_faire', false)
) as c(client, tel, gateau, parts, demandes, inscription, retrait, prix, acompte, statut, retrait_centre);

-- ---------------------------------------------------------------------
-- 3. Remise à zéro : décale aussi la date de création des produits
--    et recalcule tout de suite les prévisions (planning jamais vide).
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

  alter table profils disable trigger user;
  alter table produits disable trigger user;
  alter table saisies_vente disable trigger user;
  alter table notifications disable trigger user;
  alter table commandes disable trigger user;
  alter table mouvements_stock disable trigger user;

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

  update entreprises set nom = v_nom where id = v_ent;
  insert into boutiques select * from demo.boutiques;
  insert into profils select * from demo.profils;
  insert into produits select * from demo.produits;
  update produits set created_at = created_at + v_decal where id in (select id from demo.produits);
  insert into ingredients_recette select * from demo.ingredients_recette;
  insert into commandes select * from demo.commandes;
  insert into notifications select * from demo.notifications;

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

  -- Planning à jour dès la remise à zéro (le calcul de 3 h le refera à l'identique).
  perform public.calculer_previsions();
end $$;

revoke execute on function demo.reinitialiser() from public, anon, authenticated;

select demo.reinitialiser();
