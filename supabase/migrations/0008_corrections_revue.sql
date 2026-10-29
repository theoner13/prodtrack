-- =====================================================================
-- ProdTrack — corrections après revue complète (phases 1 à 11)
-- 1. Ajustement de stock par le patron (D8)
-- 2. Compte archivé : plus d'écriture si mon_role() est null
-- 3. Photos de profil lisibles par les collègues de la même boutique
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ajustement de stock (calcul dans la base)
-- ---------------------------------------------------------------------
create or replace function public.ajuster_stock(
  p_produit uuid,
  p_stock_reel int,
  p_motif text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock int;
  v_ecart int;
begin
  if not public.est_admin() then
    raise exception 'Réservé au patron.';
  end if;
  if not public.peut_voir_produit(p_produit) then
    raise exception 'Produit inaccessible.';
  end if;
  if p_stock_reel < 0 then
    raise exception 'Le stock réel ne peut pas être négatif.';
  end if;

  -- p_motif ignoré : mouvements_stock n'a pas de colonne commentaire.

  select s.stock into v_stock
  from public.stock_actuel s
  where s.produit_id = p_produit;

  if not found then
    v_stock := 0;
  end if;

  v_ecart := p_stock_reel - v_stock;
  if v_ecart <> 0 then
    insert into public.mouvements_stock (produit_id, type, quantite, saisi_par)
    values (p_produit, 'ajustement', v_ecart, auth.uid());
  end if;

  return p_stock_reel;
end;
$$;

revoke all on function public.ajuster_stock(uuid, int, text) from public;
revoke execute on function public.ajuster_stock(uuid, int, text) from anon;
grant execute on function public.ajuster_stock(uuid, int, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Compte archivé : mon_role() null → plus d'écriture
-- Identique à 0006 + mon_role() = 'patissier' sur la branche fabricant.
-- ---------------------------------------------------------------------
drop policy mouvements_insert on public.mouvements_stock;
create policy mouvements_insert on public.mouvements_stock for insert with check (
  saisi_par = auth.uid() and (
    (type = 'production' and (
      (
        exists (select 1 from public.produits
          where id = produit_id and fabricant_id = auth.uid())
        and public.mon_role() = 'patissier'
      )
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

drop policy mouvements_delete on public.mouvements_stock;
create policy mouvements_delete on public.mouvements_stock for delete
  using (
    saisi_par = auth.uid()
    and jour = public.aujourdhui()
    and public.mon_role() is not null
  );

drop policy pertes_delete on public.pertes_production;
create policy pertes_delete on public.pertes_production for delete
  using (
    saisi_par = auth.uid()
    and jour = public.aujourdhui()
    and public.mon_role() is not null
  );

-- pertes_insert passe déjà par mon_role() = 'patissier' : inchangé.

-- ---------------------------------------------------------------------
-- 3. Photos de profil : collègues de la même boutique (tablette partagée)
-- ---------------------------------------------------------------------
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
        or (
          public.ma_boutique() is not null
          and cible.boutique_id = public.ma_boutique()
        )
      )
  )
$$;

revoke all on function public.peut_lire_photo_profil(uuid) from public;
grant execute on function public.peut_lire_photo_profil(uuid) to authenticated;
