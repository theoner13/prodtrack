-- =====================================================================
-- ProdTrack — calcul automatique des prévisions chaque nuit
-- AVANT de lancer ce fichier : Supabase > Database > Extensions > activer "pg_cron"
-- =====================================================================

-- Tous les jours à 3h UTC (4h ou 5h heure française)
select cron.schedule(
  'previsions-quotidiennes',
  '0 3 * * *',
  $$ select public.calculer_previsions(); $$
);

-- Pour tester tout de suite, sans attendre la nuit :
-- select public.calculer_previsions();
-- select * from public.previsions;
