# ProdTrack — Architecture technique du MVP

Document de référence pour le développement. La source fonctionnelle est [cahier-des-charges-mvp.md](../cahier-des-charges-mvp.md). Ce document dit **comment** on le construit et tranche les points que le cahier des charges laisse ouverts (section 2).

---

## 1. Choix techniques

| Besoin | Choix | Pourquoi |
| --- | --- | --- |
| App iOS + Android + web (PWA) | **Expo (React Native) + TypeScript**, dernière version stable du SDK | Un seul code pour les 3 plateformes : couvre le choix « natif » et la variante PWA du cahier des charges. |
| Navigation | **Expo Router** (navigation par fichiers dans `app/`) | Standard Expo, simple. |
| Base de données, comptes, fichiers | **Supabase** (Postgres + Auth + Storage), région **UE (Francfort ou Paris)** | Hébergement UE (RGPD), droits d'accès gérés dans la base, calcul de nuit possible (pg_cron). |
| Lecture/écriture des données | **@supabase/supabase-js** + **TanStack Query** | Cache, rechargement auto, états de chargement. |
| Formulaires | **react-hook-form + zod** | Validation simple et fiable. |
| Face ID / empreinte | **expo-local-authentication** | Natif iOS et Android. |
| Stockage sécurisé sur l'appareil | **expo-secure-store** | Session et code PIN chiffrés. |
| Photos | **expo-image-picker** + Supabase Storage (bucket privé `photos`) | |
| Export Excel / PDF | **exceljs** (fichiers .xlsx formatés) + **expo-print** (PDF via HTML) + **expo-sharing** (mobile) / téléchargement (web) | Lisibilité sur téléphone et Mac ; remplace l’ancien CSV. |
| Notifications push | **expo-notifications** (phase 11) | Nécessite un « development build » (pas Expo Go). |
| Style | `StyleSheet` de React Native + un fichier `src/theme.ts` | Pas de librairie UI : moins de problèmes de versions. |

Montants : toujours stockés **en centimes (entiers)**, affichés en euros (`1250` → `12,50 €`).
Dates : le « jour » d'une saisie est la date en **heure de Paris** (fonction SQL `aujourdhui()`).

---

## 2. Décisions qui complètent le cahier des charges

Ces points étaient ambigus ou contradictoires. Décisions prises pour coder :

| # | Sujet | Décision |
| --- | --- | --- |
| D1 | **Base de la prévision** (4.3 parle de « ventes » mais le stock ne baisse que par les **sorties**) | La prévision utilise les **sorties de stock** par jour de la semaine. C'est cohérent avec 4.1 et avec 4.3 point 3. |
| D2 | **Quantité à fabriquer** (3.2.5 dit « jours et quantités », mais aucune règle de quantité) | Quantité suggérée = consommation prévue sur `min(7 jours, durée de conservation)` après le jour de fabrication + seuil minimum − stock prévu ce jour-là. |
| D3 | **Gamme obligatoire imposée à plusieurs pâtissiers** vs « un seul fabricant par produit » (4.2) | Un produit = au plus un fabricant par boutique. Le patron impose un produit (nom, prix, boutique obligatoires) ; le pâtissier est **facultatif** : s'il est omis, le premier pâtissier de la boutique peut le « prendre ». Pour plusieurs boutiques, l'app crée une copie par boutique. |
| D4 | **Inscription libre** : n'importe qui pourrait rejoindre une boutique | Chaque boutique a un **code d'invitation** (8 caractères) que le patron transmet. Sans code, pas d'inscription. |
| D5 | **Face ID sur tablette partagée** : impossible, un iPad n'enregistre qu'un visage | Téléphone perso : Face ID (repli sur le code). Tablette partagée : choix du profil puis **code PIN à 4 chiffres** (phase 10). Sur le web (PWA) : code PIN uniquement. |
| D6 | **Connexion « code + Face ID »** : Supabase a besoin d'un identifiant | 1ʳᵉ connexion avec **email + mot de passe**, puis création d'un code PIN. Ensuite, l'appli se déverrouille par Face ID ou PIN. Le PIN reste sur l'appareil (haché dans le stockage sécurisé). |
| D7 | **Changement de prix** : le CA passé ne doit pas changer | Le prix et le fabricant sont **copiés dans chaque saisie de vente** à sa création. |
| D8 | **Erreurs de saisie** | Production/sortie : l'auteur peut **annuler sa saisie le jour même**. Après : le patron fait un **ajustement**. Saisie vendeuse : modifiable (1 ligne par produit et par jour). |
| D9 | **Doublons** (deux pâtissiers déclarent « Croissant ») | Nom de produit **unique par boutique** (hors produits archivés). |
| D10 | **Champs de la fiche produit** | Nom, prix, photo, conservation (frais/surgelé), durée de conservation en jours, seuil minimum, recette. |
| D11 | **Confidentialité** | Un pâtissier ne voit **que son propre CA**. Le patron voit tout. La vendeuse voit les saisies de sa boutique. |
| D12 | **Suppression d'un employé** | Toujours un **archivage** (`archive_le`) : l'employé ne voit plus rien, son historique reste. Ses produits restent et le patron les réattribue. |
| D13 | **« Reste » de la vendeuse** | Information uniquement (statistique). Le MVP ne gère pas de stock vitrine. |
| D14 | « IA » de prévision | Calcul statistique (moyennes par jour de la semaine). Améliorable plus tard. |

---

## 3. Structure du code

```
prodtrack/
├─ app/                          # Écrans (Expo Router)
│  ├─ _layout.tsx                # Providers (QueryClient, Auth) + redirection selon l'état
│  ├─ (auth)/                    # Pas connecté
│  │  ├─ connexion.tsx
│  │  ├─ inscription.tsx         # email + mot de passe
│  │  ├─ choix.tsx               # « Je suis patron » / « J'ai un code boutique »
│  │  ├─ creer-entreprise.tsx
│  │  ├─ rejoindre.tsx           # code + rôle + nom/prénom + équipe
│  │  ├─ information.tsx         # mention RGPD à accepter
│  │  └─ creer-pin.tsx
│  ├─ deverrouiller.tsx          # Face ID / PIN à l'ouverture
│  ├─ (admin)/                   # Onglets du patron
│  │  ├─ _layout.tsx             # Tabs
│  │  ├─ index.tsx               # Tableau de bord CA
│  │  ├─ boutiques.tsx           # + code d'invitation à partager
│  │  ├─ employes.tsx            # liste, archivage
│  │  ├─ produits.tsx            # tous les produits, prix, produits imposés
│  │  └─ export.tsx              # Excel + PDF
│  ├─ (patissier)/
│  │  ├─ _layout.tsx
│  │  ├─ index.tsx               # Planning (accueil)
│  │  ├─ production.tsx
│  │  ├─ sorties.tsx
│  │  ├─ stock.tsx
│  │  └─ produits/               # Mes produits + fiche + recette
│  ├─ (vendeuse)/
│  │  ├─ _layout.tsx
│  │  ├─ index.tsx               # Saisie fin de journée (accueil)
│  │  └─ historique.tsx
│  ├─ notifications.tsx
│  └─ profil.tsx
├─ src/
│  ├─ lib/supabase.ts            # client Supabase (session dans SecureStore)
│  ├─ lib/format.ts              # euros, dates FR
│  ├─ lib/pin.ts                 # création/vérification du PIN
│  ├─ auth/                      # AuthProvider, useSession, useProfil
│  ├─ api/                       # hooks TanStack Query, 1 fichier par sujet
│  ├─ components/                # Ecran, Bouton, Champ, Compteur (+/-), CarteProduit, Vide, Erreur
│  ├─ types/database.ts          # types générés depuis Supabase
│  └─ theme.ts                   # couleurs, tailles, espacements
├─ supabase/migrations/          # SQL (déjà écrit)
└─ docs/
```

---

## 4. Modèle de données

SQL complet : [supabase/migrations/0001_schema_initial.sql](../supabase/migrations/0001_schema_initial.sql).

| Table / vue | Contenu |
| --- | --- |
| `entreprises` | L'entreprise du patron |
| `boutiques` | Boutiques + `code_invitation` |
| `profils` | Employés et patron (`role` : admin, patissier, vendeuse), `equipe` jour/nuit, `archive_le` |
| `produits` | Fiche produit, `fabricant_id` (un seul, nullable si imposé sans pâtissier), `seuil_min`, `impose_par_admin` |
| `ingredients_recette` | Lignes de recette d'un produit |
| `mouvements_stock` | `production` (+), `sortie` (−), `ajustement` (±, patron) |
| `saisies_vente` | Vendu / jeté / reste par produit et par jour, prix et fabricant copiés |
| `previsions` | Résultat du calcul de nuit : jour de fabrication, quantité, détail sur 14 jours, `fiable` |
| `notifications` | Messages pour un employé |
| vue `stock_actuel` | Stock calculé par produit |
| vue `ca_journalier` | CA par jour, produit et fabricant |
| fonction `creer_entreprise(...)` | Inscription du patron |
| fonction `rejoindre_boutique(...)` | Inscription d'un employé avec le code |
| fonction `calculer_previsions()` | Calcul de nuit (pg_cron) |

**Les droits d'accès sont dans la base (RLS).** L'appli n'a pas besoin de filtrer par sécurité : une requête ne renvoie que ce que l'utilisateur a le droit de voir. L'appli filtre seulement pour l'affichage.

---

## 5. Règles de calcul (rappel côté code)

- **Stock** : lire la vue `stock_actuel`. Ne jamais recalculer dans l'app.
- **CA** : lire la vue `ca_journalier`, puis regrouper dans l'app par jour/semaine/mois et par fabricant ou produit. Semaine = lundi → dimanche.
- **Prévision** : lire la table `previsions`. Si `fiable = false`, afficher : « Prévision indicative : moins de 8 semaines de données ».
- **Exemples de référence à vérifier** (cahier des charges 4.1, 4.2, 4.3) : stock muffin 7 → 57 → 49 ; CA pâtissier A = 15 € ; fabrication au plus tard le jeudi.

---

## 6. Connexion et sécurité

1. **Inscription** : email + mot de passe (Supabase Auth), puis `creer_entreprise` ou `rejoindre_boutique`, puis acceptation de la mention d'information (`information_rgpd_acceptee_le`), puis création du PIN.
2. **Ouverture de l'appli** : si une session existe, écran `deverrouiller` : Face ID (si dispo et activé), sinon PIN. 5 PIN faux → retour à l'email + mot de passe.
3. **Session** stockée dans `expo-secure-store` (mobile) / `localStorage` (web).
4. **Compte archivé** : l'appli affiche « Votre compte a été désactivé » et déconnecte.
5. Clés : seule la clé **anon/publishable** va dans l'appli (`.env`, variables `EXPO_PUBLIC_...`). La clé `service_role` ne doit **jamais** être dans le code de l'appli.

---

## 7. Règles d'ergonomie (saisie en moins d'une minute)

- Style épuré (fond blanc, brun en touche). Boutons de 40 px de haut, zones de toucher ≥ 44 × 44 px, texte ≥ 13 px (choix du propriétaire, 29/10/2026).
- Saisie de quantité : **compteur − / +** avec champ numérique au centre (clavier numérique).
- Listes de produits avec photo + nom, triées par ordre alphabétique, recherche si plus de 10 produits.
- Saisie vendeuse : **une seule page** avec tous les produits et 3 compteurs par ligne, un bouton « Enregistrer tout ».
- Toujours un message de confirmation après un enregistrement, et un message d'erreur clair en français.
- Tout le texte de l'interface est en **français**.
