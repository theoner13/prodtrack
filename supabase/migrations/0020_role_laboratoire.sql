-- =====================================================================
-- ProdTrack — rôle Laboratoire (valeur d'enum seule)
-- Doit rester dans sa propre migration : une valeur d'enum ne peut pas
-- servir dans la même transaction que son ajout.
-- =====================================================================

alter type public.role_employe add value if not exists 'laboratoire';
