-- =====================================================================
-- ProdTrack — disponible du jour pour les produits frais
-- Les frais n'ont pas de stock de congélateur : on suit production du jour
-- + restes de la veille − pertes − vendus − jetés (décision 31/10/2026).
-- Les colonnes jour des tables sont déjà en date Europe/Paris (aujourdhui()).
-- =====================================================================

create or replace view public.disponible_frais with (security_invoker = true) as
select
  p.id as produit_id,
  p.boutique_id,
  p.fabricant_id,
  p.nom,
  public.aujourdhui() as jour,
  coalesce(prod.qte, 0)::int as production_jour,
  coalesce(restes.reste, 0)::int as restes_veille,
  coalesce(pertes.qte, 0)::int as pertes_jour,
  coalesce(vente.vendu, 0)::int as vendus_jour,
  coalesce(vente.jete, 0)::int as jetes_jour,
  greatest(
    coalesce(prod.qte, 0)
      + coalesce(restes.reste, 0)
      - coalesce(pertes.qte, 0)
      - coalesce(vente.vendu, 0)
      - coalesce(vente.jete, 0),
    0
  )::int as disponible
from public.produits p
left join (
  select produit_id, sum(quantite) as qte
  from public.mouvements_stock
  where type = 'production'
    and jour = public.aujourdhui()
  group by produit_id
) prod on prod.produit_id = p.id
left join (
  select produit_id, reste
  from public.saisies_vente
  where jour = public.aujourdhui() - 1
) restes on restes.produit_id = p.id
left join (
  select produit_id, sum(quantite) as qte
  from public.pertes_production
  where jour = public.aujourdhui()
  group by produit_id
) pertes on pertes.produit_id = p.id
left join (
  select produit_id, vendu, jete
  from public.saisies_vente
  where jour = public.aujourdhui()
) vente on vente.produit_id = p.id
where p.archive_le is null
  and p.conservation = 'frais';

grant select on public.disponible_frais to authenticated;
