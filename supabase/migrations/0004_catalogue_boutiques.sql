-- =====================================================================
-- ProdTrack — catalogue des autres boutiques (pâtissiers)
-- Voir les produits / recettes des autres boutiques de la même entreprise,
-- sans exposer fabricant, ventes, stock, CA, prévisions ni code d'invitation.
-- =====================================================================

-- Boutique appartenant à l'entreprise du compte connecté (actif).
create or replace function public.boutique_de_mon_entreprise(p_boutique uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_boutique is not null
    and public.mon_entreprise() is not null
    and exists (
      select 1 from public.boutiques b
      where b.id = p_boutique
        and b.entreprise_id = public.mon_entreprise()
    )
$$;

-- Autres boutiques de mon entreprise (pas la mienne).
create or replace function public.catalogue_boutiques()
returns table (id uuid, nom text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.mon_role() is distinct from 'patissier' then
    return;
  end if;
  return query
    select b.id, b.nom
    from public.boutiques b
    where b.entreprise_id = public.mon_entreprise()
      and b.id is distinct from public.ma_boutique()
    order by b.nom;
end
$$;

-- Produits actifs d'une autre boutique de mon entreprise.
create or replace function public.catalogue_produits(p_boutique uuid)
returns table (
  id uuid,
  nom text,
  photo_url text,
  prix_centimes integer,
  conservation public.type_conservation,
  duree_conservation_jours integer
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
  -- Pas ma boutique, et bien dans mon entreprise.
  if p_boutique is null
     or p_boutique = public.ma_boutique()
     or not public.boutique_de_mon_entreprise(p_boutique) then
    return;
  end if;
  return query
    select p.id, p.nom, p.photo_url, p.prix_centimes, p.conservation, p.duree_conservation_jours
    from public.produits p
    where p.boutique_id = p_boutique
      and p.archive_le is null
    order by p.nom;
end
$$;

-- Recette d'un produit d'une autre boutique de mon entreprise.
create or replace function public.catalogue_recette(p_produit uuid)
returns table (
  ingredient text,
  quantite numeric,
  unite text,
  ordre integer
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
  if p_produit is null or not exists (
    select 1
    from public.produits p
    where p.id = p_produit
      and p.archive_le is null
      and p.boutique_id is distinct from public.ma_boutique()
      and public.boutique_de_mon_entreprise(p.boutique_id)
  ) then
    return;
  end if;
  return query
    select r.ingredient, r.quantite, r.unite, r.ordre
    from public.ingredients_recette r
    where r.produit_id = p_produit
    order by r.ordre;
end
$$;

revoke all on function public.boutique_de_mon_entreprise(uuid) from public;
revoke all on function public.catalogue_boutiques() from public;
revoke all on function public.catalogue_produits(uuid) from public;
revoke all on function public.catalogue_recette(uuid) from public;

revoke execute on function public.boutique_de_mon_entreprise(uuid) from anon;
revoke execute on function public.catalogue_boutiques() from anon;
revoke execute on function public.catalogue_produits(uuid) from anon;
revoke execute on function public.catalogue_recette(uuid) from anon;

grant execute on function public.boutique_de_mon_entreprise(uuid) to authenticated;
grant execute on function public.catalogue_boutiques() to authenticated;
grant execute on function public.catalogue_produits(uuid) to authenticated;
grant execute on function public.catalogue_recette(uuid) to authenticated;

-- Lecture des photos de produits des boutiques de mon entreprise (pâtissier).
create policy photos_produits_catalogue_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.mon_role() = 'patissier'
    and public.boutique_de_mon_entreprise(public.chemin_photo_uuid(name, 'produits'))
  );
