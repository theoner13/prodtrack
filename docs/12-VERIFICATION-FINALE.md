# Vérification finale — Phase 12

Document de conformité du MVP ProdTrack par rapport au [cahier des charges](../cahier-des-charges-mvp.md) (sections 1 à 5.1). Vérifié dans le code le 2026-10-29.

Les écarts marqués **partiel** sont soit des décisions d’architecture (`docs/01-ARCHITECTURE.md`), soit des évolutions validées hors cahier des charges. Aucune correction simple restante n’a nécessité une migration 0009.

---

## 1. Tableau de conformité

### 1. Contexte, objectif et périmètre

| Point | Statut | Fichiers |
| --- | --- | --- |
| App stocks + planning de production | fait | `app/(patissier)/`, `app/(vendeuse)/`, `app/(admin)/`, `supabase/migrations/0001_schema_initial.sql` |
| « IA » calcule le jour de fabrication | partiel | `calculer_previsions()` dans `0001`, `app/(patissier)/index.tsx` — calcul statistique (moyennes), pas de ML (décision D14) |
| Vendeuse : ventes, pertes, restes | fait | `app/(vendeuse)/index.tsx`, `src/api/ventes.ts` |
| CA jour par employé (multi-boutiques) | fait | `app/(admin)/index.tsx`, `src/api/ca.ts`, vue `ca_journalier` |
| Cible multi-boutiques / équipes jour-nuit | fait | `boutiques`, `profils.equipe`, écrans admin |
| Comptes admin / pâtissier / vendeuse | fait | `role_employe`, `app/(auth)/rejoindre.tsx`, layouts rôles |
| Catalogue : prix, photo, recette | fait | `produits`, `ingredients_recette`, `app/(patissier)/produits/[id].tsx` |
| Saisie production | fait | `app/(patissier)/production.tsx`, `src/components/saisie-stock.tsx` |
| Saisie vendeuse vendu / jeté / reste | fait | `app/(vendeuse)/index.tsx` |
| Calcul automatique du stock | fait | vue `stock_actuel` (`0001`, mise à jour `0005`) |
| CA employé / produit / jour | fait | `ca_journalier`, `app/(admin)/index.tsx`, `src/lib/ca.ts` |
| Prévision + planning semaine suivante | fait | `calculer_previsions`, `0002_cron.sql`, `app/(patissier)/index.tsx` |
| Exclu : connexion caisse | fait | — (aucune intégration) |

### 2. Utilisateurs, rôles et connexion

| Point | Statut | Fichiers |
| --- | --- | --- |
| Rôle Admin | fait | `app/(admin)/`, RLS `est_admin()` |
| Rôle Pâtissier | fait | `app/(patissier)/` |
| Rôle Vendeuse | fait | `app/(vendeuse)/` |
| Inscription : nom, prénom, rôle, boutique | fait | `app/(auth)/rejoindre.tsx`, RPC `rejoindre_boutique` (boutique via code, D4) |
| Photo facultative à l’inscription | partiel | Photo sur `app/profil.tsx` après coup, pas dans le formulaire d’inscription — non corrigé (changement d’écran + Storage, pas simple) |
| Connexion code + Face ID | fait | `src/lib/pin.ts`, `app/(auth)/creer-pin.tsx`, `app/deverrouiller.tsx` (email+mdp en 1ʳᵉ fois, D6 ; Face ID désactivé web / tablette partagée, D5) |
| Produits saisis par le pâtissier | fait | `app/(patissier)/produits/` |
| Gamme imposée ajoutée d’office | fait | `impose_par_admin`, `FormulaireImposer`, `useImposerProduits` |
| Employé = données de sa boutique | fait | RLS `peut_voir_boutique` / `ma_boutique()` |
| Admin voit toutes les boutiques | fait | policies admin, `app/(admin)/boutiques.tsx` |

### 3.1 Compte admin

| Point | Statut | Fichiers |
| --- | --- | --- |
| Créer boutiques | fait | `app/(admin)/boutiques.tsx`, `src/api/boutiques.ts` |
| Catalogue et prix | fait | `app/(admin)/produits.tsx` |
| Gamme obligatoire facultative | fait | `FormulaireImposer`, trigger `verifier_produit` |
| Liste des employés | fait | `app/(admin)/employes.tsx`, `src/api/employes.ts` |
| Suppression = archivage | fait | `profils.archive_le`, écran employés |
| CA jour / semaine / mois / produit | fait | `app/(admin)/index.tsx`, `src/lib/ca.ts` |

### 3.2 Compte pâtissier

| Point | Statut | Fichiers |
| --- | --- | --- |
| Mes produits (nom, prix, photo) | fait | `app/(patissier)/produits/` |
| Mes recettes | fait | `EditeurRecette`, `ingredients_recette` |
| Saisie production → stock | fait | `production.tsx`, `mouvements_stock` type `production` |
| Sorties frigo/congel (sans CA) | fait | `sorties.tsx` ; CA via `fabricant_id` |
| Planning de fabrication | fait | `app/(patissier)/index.tsx`, `src/api/previsions.ts` |

### 3.3 Compte vendeuse

| Point | Statut | Fichiers |
| --- | --- | --- |
| Liste produits de la boutique | fait | `useProduits`, `app/(vendeuse)/index.tsx` |
| Saisie vendu / jeté / reste | fait | `app/(vendeuse)/index.tsx` |
| Saisies alimentent stock, CA, prévision | partiel | **CA oui** (`ca_journalier`) ; **stock non** (conforme 4.1 / D13) ; **prévision via sorties**, pas via vendu (D1) — volontaire |

### 4.1 Stock

| Point | Statut | Fichiers |
| --- | --- | --- |
| Stock = précédent + production − sorties | partiel | Vue `stock_actuel` (`0005`) : solde mouvements (+ajustements) − pertes en stock. Formule CDC couverte ; élargie par évolutions validées (pertes, ajustements patron) |
| Ventes / jeté / reste ne changent pas le stock | fait | `stock_actuel` ne joint pas `saisies_vente` |

### 4.2 Chiffre d’affaires

| Point | Statut | Fichiers |
| --- | --- | --- |
| Un fabricant ; CA au fabricant | fait | `produits.fabricant_id`, copie dans `saisies_vente` |
| CA = vendu × prix | fait | vue `ca_journalier` |
| Exemple A = 15 €, B = 0 € | fait | Vue SQL + tests `src/lib/ca.test.ts` |

### 4.3 Prévision, planning, seuil

| Point | Statut | Fichiers |
| --- | --- | --- |
| Seuil min par produit | fait | `produits.seuil_min`, fiche produit |
| Moyennes par jour de semaine | fait | `calculer_previsions` (base = **sorties**, D1) |
| Recalcul quotidien | fait | `0002_cron.sql` |
| Jour fab = veille du passage sous seuil | fait | `calculer_previsions` |
| Notification fabricant | fait | table `notifications` + cloche UI ; push natif code prêt (phase 11, build téléphone en attente) |
| Durée de conservation | fait | `conservation`, `duree_conservation_jours` |
| Flag `fiable` + avertissement UI | partiel | `fiable` si âge produit ≥ 56 j (`created_at`), pas strictement « 8 semaines de saisies » ; message UI présent dans `app/(patissier)/index.tsx` |

### 5.1 Contraintes techniques

| Point | Statut | Fichiers |
| --- | --- | --- |
| Téléphone + tablette, tablette partagée | fait | Expo, `qui-etes-vous.tsx`, `AuthProvider` (builds stores = phase 11) |
| Saisie &lt; 1 minute | fait | `Compteur`, `SaisieStock`, pied fixe vendeuse |
| Données UE + RGPD | fait | Supabase région Paris |
| Mention d’information suivi individuel | fait | `app/(auth)/information.tsx` |
| Export CSV admin | fait | `app/(admin)/export.tsx`, `src/lib/csv.ts` |

### Points partiels / manquants non corrigés dans cette phase

1. Photo employé à l’inscription (seulement sur Profil).
2. « IA » = moyennes SQL (D14).
3. Stock élargi (ajustements + pertes) au-delà de la formule stricte du CDC.
4. Prévision sur sorties, pas sur ventes vendeuse (D1).
5. `fiable` basé sur l’âge du produit.
6. Builds natifs / push iPhone : phase 11 (compte Apple).

---

## 2. Exemples chiffrés 4.1, 4.2, 4.3

### 4.1 Stock muffin : 7 → 57 → 49

**Dans le code :** la vue `stock_actuel` somme `production` (+), `sortie` (−), `ajustement` (±), puis retire les pertes marquées `dans_le_stock`. Les ventes vendeuse n’entrent pas dans le calcul. Vérifié en base lors des phases 6 et suivantes.

**Rejouer dans l’appli :**

1. Se connecter en pâtissier A (ex. Paul).
2. Créer ou ouvrir le produit « Muffin » s’il n’existe pas.
3. Onglet Stock : noter le stock actuel (idéalement 7 ; sinon ajustement patron pour mettre 7).
4. Production : saisir **+50** → stock affiché **57**.
5. Se connecter en pâtissier B (même boutique) → Sorties : **−8** sur Muffin → stock **49**.
6. En vendeuse, saisir vendu/jeté/reste : le stock affiché au pâtissier **ne change pas**.

### 4.2 CA : A = 15 €, B = 0 €

**Dans le code :** `ca_journalier` = `vendu * prix_unitaire_centimes` attribué au `fabricant_id` copié à la saisie. Tests unitaires : `src/lib/ca.test.ts` (1500 centimes = 15 € ; B absent → 0 €).

**Rejouer dans l’appli :**

1. Produit Muffin, fabricant A, prix **3,00 €** (300 centimes).
2. Pâtissier A : production (ex. 50).
3. Pâtissier B : sortie **8** (aucun CA pour B).
4. Vendeuse : jour concerné → vendu **5**, jeté **1**, reste **2**.
5. Patron → tableau de bord CA du jour : **A = 15,00 €**, **B = 0,00 €** (ou absent des lignes CA, affiché à 0 s’il est actif).

### 4.3 Prévision : fabrication au plus tard le jeudi

**Dans le code :** `calculer_previsions()` projette le stock avec les moyennes de **sorties** par jour de semaine ; jour de fab = veille du premier jour sous `seuil_min`. Exemple CDC : stock 49, seuil 15, moyennes lun 6 … ven 9 → vendredi à 14 sous seuil → fab jeudi.

**Rejouer dans l’appli :**

1. Produit avec stock **49**, seuil **15**, et un historique de sorties proche des moyennes du CDC (ou données de test déjà en base).
2. Attendre le cron de nuit (`0002`, 03:00 UTC) ou appeler `calculer_previsions()` depuis le SQL editor Supabase (rôle service).
3. Pâtissier fabricant → onglet Planning : jour de fabrication **jeudi** (ou « au plus tard » ce jour), détail 14 jours visible.
4. Si moins de ~8 semaines : bandeau « Prévision indicative : moins de 8 semaines de données ».

---

## 3. Liste de contrôle avant production

- [ ] Réactiver **Confirm email** dans Supabase Auth (désactivé en dev).
- [ ] Vérifier / activer les **sauvegardes** Supabase (plan adapté).
- [ ] Rédiger et publier une **politique de confidentialité** (URL à lier depuis l’appli / stores).
- [ ] Compte **Apple Developer** (99 €/an) pour iOS.
- [ ] Compte **Google Play** pour Android.
- [ ] **Captures d’écran** des parcours clés (patron, pâtissier, vendeuse, tablette).
- [ ] Fiches des stores (nom, description, catégorie, classification âge).
- [ ] Renouveler le jeton Supabase CLI `claude-code-prodtrack` (échéance notée 03/11/2026 dans `AVANCEMENT.md`).
- [ ] Retirer les **données de test** du projet Supabase / du site public avant usage client réel.
- [ ] S’assurer que les variables `EXPO_PUBLIC_COMPTES_TEST` / `EXPO_PUBLIC_MDP_TEST` ne sont **pas** définies sur Vercel (connexion rapide réservée au `__DEV__` local).
- [ ] Phase 11 : `eas init`, builds de développement, test push sur téléphone.
