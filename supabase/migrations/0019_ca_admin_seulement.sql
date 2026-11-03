-- =====================================================================
-- ProdTrack — CA journalier réservé à l'admin
-- Recrée ca_journalier (mêmes colonnes) : aucune ligne si pas est_admin().
-- Ne touche pas aux politiques de saisies_vente, produits ni commandes.
-- =====================================================================

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
where public.est_admin()
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
  and public.est_admin();

grant select on public.ca_journalier to authenticated;
