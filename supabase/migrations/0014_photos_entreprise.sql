-- Lecture des photos produits de toute l'entreprise (ex. produit extérieur
-- dont la photo est encore sous le dossier de la boutique de provenance).
create policy photos_produits_entreprise_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.boutique_de_mon_entreprise(public.chemin_photo_uuid(name, 'produits'))
  );
