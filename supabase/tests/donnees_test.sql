-- Données de test pour la prévision (cahier des charges 4.3).
-- À lancer dans l'éditeur SQL de Supabase (rôle postgres). Ne pas l'appliquer comme migration.
-- On peut le relancer : le produit est réutilisé, ses mouvements sont remplacés,
-- et calculer_previsions() met à jour la ligne existante sans doublon.
--
-- Résultat attendu si le script est lancé un lundi (exemple 4.3) :
--   stock 49, seuil 15, sorties moyennes lundi 6, mardi 5, mercredi 8, jeudi 7, vendredi 9
--   → stocks en fin de journée 43, 38, 30, 23, puis 14 (sous 15).
--   Fabrication au plus tard le jeudi.
-- Le jour exact dépend du jour où l'on lance le script :
-- c'est le dernier jour avant que le stock prévu passe sous 15.

do $$
declare
  v_boutique uuid;
  v_paul uuid;
  v_paola uuid;
  v_produit uuid;
  v_sorties int;
begin
  select id into v_boutique from public.boutiques where nom = 'Boutique Test A';
  if v_boutique is null then
    raise exception 'Boutique Test A introuvable';
  end if;

  select id into v_paul
  from public.profils
  where boutique_id = v_boutique
    and role = 'patissier'
    and prenom = 'Paul'
    and equipe = 'jour'
    and archive_le is null;
  if v_paul is null then
    raise exception 'Pâtissier de jour « Paul » introuvable dans Boutique Test A';
  end if;

  select id into v_paola
  from public.profils
  where boutique_id = v_boutique
    and role = 'patissier'
    and prenom = 'Paola'
    and equipe = 'nuit'
    and archive_le is null;
  if v_paola is null then
    raise exception 'Pâtissière de nuit « Paola » introuvable dans Boutique Test A';
  end if;

  select id into v_produit
  from public.produits
  where boutique_id = v_boutique
    and fabricant_id = v_paul
    and lower(trim(nom)) = 'muffin prévision'
    and archive_le is null;

  if v_produit is null then
    insert into public.produits (
      boutique_id, fabricant_id, nom, prix_centimes, conservation,
      duree_conservation_jours, seuil_min, impose_par_admin, created_at
    ) values (
      v_boutique, v_paul, 'Muffin prévision', 300, 'surgele',
      30, 15, false,
      ((public.aujourdhui() - 70)::timestamp at time zone 'Europe/Paris')
    )
    returning id into v_produit;
  else
    update public.produits set
      prix_centimes = 300,
      conservation = 'surgele',
      duree_conservation_jours = 30,
      seuil_min = 15,
      created_at = ((public.aujourdhui() - 70)::timestamp at time zone 'Europe/Paris')
    where id = v_produit;
  end if;

  delete from public.mouvements_stock where produit_id = v_produit;

  -- 70 jours = 10 de chaque jour de la semaine, tous avant aujourd'hui.
  insert into public.mouvements_stock (produit_id, type, quantite, jour, saisi_par)
  select
    v_produit,
    'sortie',
    (array[6, 5, 8, 7, 9, 12, 4])[extract(isodow from gs)::int],
    gs::date,
    v_paola
  from generate_series(
    (public.aujourdhui() - 70)::timestamp,
    (public.aujourdhui() - 1)::timestamp,
    interval '1 day'
  ) as gs;

  select coalesce(sum(quantite), 0) into v_sorties
  from public.mouvements_stock
  where produit_id = v_produit and type = 'sortie';

  -- Le stock (production − sorties) doit valoir exactement 49.
  insert into public.mouvements_stock (produit_id, type, quantite, jour, saisi_par)
  values (v_produit, 'production', v_sorties + 49, public.aujourdhui(), v_paul);
end $$;

select public.calculer_previsions();

select p.nom, pr.stock_actuel, pr.jour_fabrication, pr.quantite_suggeree, pr.fiable, pr.calcule_le, pr.detail
from public.previsions pr
join public.produits p on p.id = pr.produit_id
join public.profils f on f.id = p.fabricant_id
join public.boutiques b on b.id = p.boutique_id
where b.nom = 'Boutique Test A'
  and f.prenom = 'Paul'
  and f.equipe = 'jour'
  and lower(trim(p.nom)) = 'muffin prévision';

select n.titre, n.message, n.lu, n.created_at
from public.notifications n
join public.profils f on f.id = n.profil_id
join public.boutiques b on b.id = f.boutique_id
where b.nom = 'Boutique Test A'
  and f.prenom = 'Paul'
  and f.equipe = 'jour'
order by n.created_at desc
limit 1;
