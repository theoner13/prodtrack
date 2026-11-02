-- =====================================================================
-- ProdTrack — un pâtissier ne voit que les commandes fabriquées chez lui
-- (boutique_fabrication_id = ma_boutique()). Vendeuse et admin inchangés.
-- RPC, notifications et vue ca_journalier : inchangés (cohérents).
-- =====================================================================

drop policy if exists commandes_select on public.commandes;
create policy commandes_select on public.commandes for select
  using (
    public.mon_entreprise() is not null
    and entreprise_id = public.mon_entreprise()
    and (
      public.est_admin()
      or (
        public.mon_role() = 'patissier'
        and boutique_fabrication_id = public.ma_boutique()
      )
      or (
        public.mon_role() = 'vendeuse'
        and boutique_retrait_id = public.ma_boutique()
      )
    )
  );
