-- Prévisions, notifications de fabrication et planning : produits surgelés uniquement.
-- Les produits frais sont fabriqués chaque jour sans seuil ni planning (décision 30/10/2026).

-- Supprimer les prévisions déjà calculées pour les produits frais.
delete from public.previsions
where produit_id in (
  select id from public.produits where conservation = 'frais'
);

create or replace function public.calculer_previsions() returns void
language plpgsql security definer set search_path = public as $$
declare
  p            record;
  v_auj        date := public.aujourdhui();
  v_stock      int;
  v_jours      int;
  v_semaines   int;
  v_fiable     boolean;
  v_moy        numeric[];
  v_moy_simple numeric;
  v_fin        numeric[];
  v_prevu      numeric;
  v_stock_fin  numeric;
  v_detail     jsonb;
  v_jour       date;
  v_jour_fab   date;
  v_qte        int;
  v_couverture int;
  v_besoin     numeric;
  v_ancien     date;
  d            int;
  i            int;
begin
  for p in
    select * from produits
    where archive_le is null
      and fabricant_id is not null
      and conservation = 'surgele'
  loop
    select s.stock into v_stock from stock_actuel s where s.produit_id = p.id;
    v_stock := coalesce(v_stock, 0);
    v_jours := least(70, v_auj - (p.created_at at time zone 'Europe/Paris')::date);
    v_fiable := v_jours >= 56;
    v_moy := array[0, 0, 0, 0, 0, 0, 0]::numeric[];
    v_moy_simple := 0;
    v_fin := array[]::numeric[];
    v_detail := '[]'::jsonb;
    v_jour_fab := null;
    v_qte := null;

    if v_jours >= 1 then
      if v_fiable then
        v_semaines := v_jours / 7;
        for d in 1..7 loop
          v_moy[d] := (
            select coalesce(sum(quantite), 0)::numeric / v_semaines
            from mouvements_stock
            where produit_id = p.id and type = 'sortie'
              and jour >= v_auj - 7 * v_semaines and jour < v_auj
              and extract(isodow from jour) = d
          );
        end loop;
      else
        v_moy_simple := (
          select coalesce(sum(quantite), 0)::numeric / v_jours
          from mouvements_stock
          where produit_id = p.id and type = 'sortie'
            and jour >= v_auj - v_jours and jour < v_auj
        );
      end if;

      v_stock_fin := v_stock;
      for i in 0..13 loop
        v_jour := v_auj + i;
        v_prevu := case when v_fiable then v_moy[extract(isodow from v_jour)::int] else v_moy_simple end;
        v_stock_fin := v_stock_fin - v_prevu;
        v_fin := v_fin || v_stock_fin;
        v_detail := v_detail || jsonb_build_array(jsonb_build_object(
          'jour', v_jour, 'prevu', round(v_prevu, 1), 'stock_fin', round(v_stock_fin, 1)));
        if v_jour_fab is null and v_stock_fin < p.seuil_min then
          v_jour_fab := greatest(v_auj, v_jour - 1);
        end if;
      end loop;

      if v_jour_fab is not null then
        v_couverture := least(7, coalesce(p.duree_conservation_jours, 7));
        v_besoin := 0;
        for i in 1..v_couverture loop
          v_jour := v_jour_fab + i;
          v_besoin := v_besoin + case when v_fiable
            then v_moy[extract(isodow from v_jour)::int] else v_moy_simple end;
        end loop;
        v_qte := greatest(0, ceil(p.seuil_min + v_besoin - v_fin[(v_jour_fab - v_auj) + 1]))::int;
      end if;
    end if;

    select jour_fabrication into v_ancien from previsions where produit_id = p.id;

    insert into previsions (produit_id, calcule_le, stock_actuel, jour_fabrication,
                            quantite_suggeree, fiable, detail)
    values (p.id, now(), v_stock, v_jour_fab, v_qte, v_fiable, v_detail)
    on conflict (produit_id) do update set
      calcule_le = excluded.calcule_le, stock_actuel = excluded.stock_actuel,
      jour_fabrication = excluded.jour_fabrication, quantite_suggeree = excluded.quantite_suggeree,
      fiable = excluded.fiable, detail = excluded.detail;

    if v_jour_fab is not null and v_jour_fab is distinct from v_ancien then
      insert into notifications (profil_id, titre, message) values (
        p.fabricant_id,
        'Fabrication à prévoir : ' || p.nom,
        'À fabriquer au plus tard le ' || to_char(v_jour_fab, 'DD/MM')
          || ' (environ ' || v_qte || ' unités).'
      );
    end if;
  end loop;
end $$;

revoke execute on function public.calculer_previsions() from public, anon, authenticated;
