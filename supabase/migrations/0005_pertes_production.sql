-- =====================================================================
-- ProdTrack — pertes en production (déclarées par les pâtissiers)
-- Explique un écart (produits déjà sortis) ou retire du stock
-- (produits encore en stock, ex. panne de congélateur).
-- =====================================================================

create table public.pertes_production (
  id            uuid primary key default gen_random_uuid(),
  produit_id    uuid not null references public.produits(id),
  jour          date not null default public.aujourdhui(),
  quantite      integer not null check (quantite > 0),
  motif         text not null check (motif in ('brule', 'tombe', 'rate', 'autre')),
  dans_le_stock boolean not null default false,
  saisi_par     uuid not null default auth.uid() references public.profils(id),
  created_at    timestamptz not null default now()
);

create index pertes_production_produit_jour
  on public.pertes_production (produit_id, jour);

alter table public.pertes_production enable row level security;

create policy pertes_select on public.pertes_production for select
  using (public.peut_voir_produit(produit_id));

create policy pertes_insert on public.pertes_production for insert with check (
  saisi_par = auth.uid()
  and public.mon_role() = 'patissier'
  and public.produit_boutique(produit_id) = public.ma_boutique()
);

create policy pertes_delete on public.pertes_production for delete
  using (saisi_par = auth.uid() and jour = public.aujourdhui());

-- Stock = production - sorties + ajustements - pertes encore en stock
-- Sous-requêtes agrégées séparées pour éviter les doublons de jointure.
create or replace view public.stock_actuel with (security_invoker = true) as
select
  p.id as produit_id,
  p.boutique_id,
  p.fabricant_id,
  p.nom,
  p.seuil_min,
  (coalesce(mvt.solde, 0) - coalesce(pertes.qte, 0))::int as stock
from public.produits p
left join (
  select
    produit_id,
    sum(case type when 'sortie' then -quantite else quantite end) as solde
  from public.mouvements_stock
  group by produit_id
) mvt on mvt.produit_id = p.id
left join (
  select produit_id, sum(quantite) as qte
  from public.pertes_production
  where dans_le_stock = true
  group by produit_id
) pertes on pertes.produit_id = p.id
where p.archive_le is null;
