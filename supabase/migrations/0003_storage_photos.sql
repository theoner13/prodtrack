-- =====================================================================
-- ProdTrack — accès au bucket privé « photos »
-- Chemins : produits/{boutique_id}/{fichier} et profils/{user_id}/{fichier}
-- =====================================================================

-- Taille max d'un fichier : 5 Mo (les photos sont déjà réduites dans l'appli).
update storage.buckets
set file_size_limit = 5242880
where id = 'photos';

-- Extrait l'identifiant du 2e dossier, seulement si le 1er est le dossier attendu.
create or replace function public.chemin_photo_uuid(p_nom text, p_dossier text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when (storage.foldername(p_nom))[1] = p_dossier
     and coalesce((storage.foldername(p_nom))[2], '')
         ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then ((storage.foldername(p_nom))[2])::uuid
    else null
  end
$$;

-- Le pâtissier de la boutique, ou le patron qui peut voir cette boutique.
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

-- La personne elle-même, ou le patron de son entreprise.
create or replace function public.peut_lire_photo_profil(p_profil uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_profil is not null and exists (
    select 1 from public.profils cible
    where cible.id = p_profil
      and (
        cible.id = auth.uid()
        or (public.est_admin() and cible.entreprise_id = public.mon_entreprise())
      )
  )
$$;

revoke all on function public.chemin_photo_uuid(text, text) from public;
revoke all on function public.peut_ecrire_photo_produit(uuid) from public;
revoke all on function public.peut_lire_photo_profil(uuid) from public;
grant execute on function public.chemin_photo_uuid(text, text) to authenticated;
grant execute on function public.peut_ecrire_photo_produit(uuid) to authenticated;
grant execute on function public.peut_lire_photo_profil(uuid) to authenticated;

-- Photos de produits : lecture pour qui peut voir la boutique.
create policy photos_produits_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.peut_voir_boutique(public.chemin_photo_uuid(name, 'produits'))
  );

create policy photos_produits_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.peut_ecrire_photo_produit(public.chemin_photo_uuid(name, 'produits'))
  );

create policy photos_produits_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos'
    and public.peut_ecrire_photo_produit(public.chemin_photo_uuid(name, 'produits'))
  )
  with check (
    bucket_id = 'photos'
    and public.peut_ecrire_photo_produit(public.chemin_photo_uuid(name, 'produits'))
  );

create policy photos_produits_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and public.peut_ecrire_photo_produit(public.chemin_photo_uuid(name, 'produits'))
  );

-- Photos de profil : soi-même, et le patron pour la lecture.
create policy photos_profils_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.peut_lire_photo_profil(public.chemin_photo_uuid(name, 'profils'))
  );

create policy photos_profils_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.chemin_photo_uuid(name, 'profils') = auth.uid()
  );

create policy photos_profils_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos'
    and public.chemin_photo_uuid(name, 'profils') = auth.uid()
  )
  with check (
    bucket_id = 'photos'
    and public.chemin_photo_uuid(name, 'profils') = auth.uid()
  );

create policy photos_profils_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and public.chemin_photo_uuid(name, 'profils') = auth.uid()
  );
