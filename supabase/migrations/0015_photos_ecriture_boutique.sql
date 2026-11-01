-- =====================================================================
-- ProdTrack — resserrer l'écriture des photos produits
-- Revient à la règle de 0003 : pâtissier = sa boutique seulement ;
-- admin = boutiques visibles. La lecture entreprise reste dans 0014.
-- =====================================================================

create or replace function public.peut_ecrire_photo_produit(p_boutique uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_boutique is not null and (
    (public.mon_role() = 'patissier' and public.ma_boutique() = p_boutique)
    or (public.est_admin() and public.peut_voir_boutique(p_boutique))
  )
$$;
