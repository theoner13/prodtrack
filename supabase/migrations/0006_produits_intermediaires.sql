-- =====================================================================
-- ProdTrack — produits intermédiaires
-- Produits qui servent à la production (ex. biscuit cuillère), non vendus
-- en boutique. Stock suivi comme les autres ; production partagée entre
-- tous les pâtissiers de la boutique.
-- =====================================================================

alter table public.produits
  add column intermediaire boolean not null default false;

alter table public.produits
  add constraint produits_intermediaire_prix_check
  check (not intermediaire or prix_centimes = 0);

-- Production : fabricant du produit, OU tout pâtissier de la boutique
-- si le produit est intermédiaire. Sortie / ajustement inchangés.
drop policy mouvements_insert on public.mouvements_stock;
create policy mouvements_insert on public.mouvements_stock for insert with check (
  saisi_par = auth.uid() and (
    (type = 'production' and (
      exists (select 1 from public.produits
        where id = produit_id and fabricant_id = auth.uid())
      or (
        exists (select 1 from public.produits
          where id = produit_id and intermediaire)
        and public.mon_role() = 'patissier'
        and public.produit_boutique(produit_id) = public.ma_boutique()
      )
    ))
    or (type = 'sortie' and public.mon_role() = 'patissier'
        and public.produit_boutique(produit_id) = public.ma_boutique())
    or (type = 'ajustement' and public.est_admin() and public.peut_voir_produit(produit_id))
  )
);

-- Pas de vente sur un produit intermédiaire.
drop policy saisies_insert on public.saisies_vente;
create policy saisies_insert on public.saisies_vente for insert with check (
  (
    (public.mon_role() = 'vendeuse' and public.produit_boutique(produit_id) = public.ma_boutique())
    or (public.est_admin() and public.peut_voir_produit(produit_id))
  )
  and exists (
    select 1 from public.produits
    where id = produit_id and not intermediaire
  )
);

drop policy saisies_update on public.saisies_vente;
create policy saisies_update on public.saisies_vente for update using (
  (
    (public.mon_role() = 'vendeuse' and public.produit_boutique(produit_id) = public.ma_boutique())
    or (public.est_admin() and public.peut_voir_produit(produit_id))
  )
  and exists (
    select 1 from public.produits
    where id = produit_id and not intermediaire
  )
);

-- Catalogue : même sécurité, colonne intermediaire en plus.
drop function public.catalogue_produits(uuid);
create function public.catalogue_produits(p_boutique uuid)
returns table (
  id uuid,
  nom text,
  photo_url text,
  prix_centimes integer,
  conservation public.type_conservation,
  duree_conservation_jours integer,
  intermediaire boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.mon_role() is distinct from 'patissier' then
    return;
  end if;
  if p_boutique is null
     or p_boutique = public.ma_boutique()
     or not public.boutique_de_mon_entreprise(p_boutique) then
    return;
  end if;
  return query
    select p.id, p.nom, p.photo_url, p.prix_centimes, p.conservation,
           p.duree_conservation_jours, p.intermediaire
    from public.produits p
    where p.boutique_id = p_boutique
      and p.archive_le is null
    order by p.nom;
end
$$;

revoke all on function public.catalogue_produits(uuid) from public;
revoke execute on function public.catalogue_produits(uuid) from anon;
grant execute on function public.catalogue_produits(uuid) to authenticated;
