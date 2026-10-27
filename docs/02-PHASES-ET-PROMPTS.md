# Plan de développement — phases et prompts Cursor

Mode d'emploi : [00-GUIDE-DEMARRAGE.md](00-GUIDE-DEMARRAGE.md), étape 5.
**Une phase = une nouvelle conversation Cursor (mode Agent).** Copie le bloc « Prompt » tel quel.
⭐ = phase difficile : utilise le meilleur modèle disponible.

| Phase | Contenu | Durée indicative |
| --- | --- | --- |
| 1 | Création du projet Expo + connexion à Supabase | 30 min |
| 2 | Types, thème, composants de base | 45 min |
| 3 ⭐ | Inscription, connexion, rôles, PIN + Face ID | 2-3 h |
| 4 | Patron : boutiques, employés, produits et prix | 2 h |
| 5 | Pâtissier : mes produits, photos, recettes | 2 h |
| 6 | Pâtissier : production, sorties, stock | 1-2 h |
| 7 | Vendeuse : saisie de fin de journée | 1-2 h |
| 8 ⭐ | Patron : chiffre d'affaires + export CSV | 2 h |
| 9 ⭐ | Prévision, planning, notifications dans l'app | 2 h |
| 10 | Tablette partagée (plusieurs comptes + PIN) | 1-2 h |
| 11 ⭐ | Notifications push + version installable (development build) | 2 h |
| 12 | Vérification finale, web (PWA), préparation des stores | 2 h |

**Comptes de test à créer au fil des phases** (mot de passe identique pour tous, par ex. `Test1234!`) :
- `patron@test.fr`, admin, entreprise « Boulangeries Test », boutique « Boutique Centre »
- `patissier.a@test.fr`, pâtissier A, équipe de jour (muffin, brownie, cookie)
- `patissier.b@test.fr`, pâtissier B, équipe de nuit (croissant, pain au chocolat)
- `vendeuse.c@test.fr`, vendeuse C

---

## Phase 1 — Création du projet

**Prompt :**
```
Lis @docs/01-ARCHITECTURE.md et la règle du projet.

Objectif de cette phase : créer la base du projet Expo, rien de plus.

1. Crée un projet Expo avec TypeScript et Expo Router DANS le dossier actuel (qui contient déjà docs/, supabase/, .cursor/ et cahier-des-charges-mvp.md : ne les supprime pas). Utilise le template officiel le plus récent (create-expo-app). Si l'outil refuse un dossier non vide, crée-le dans un sous-dossier temporaire puis déplace les fichiers à la racine.
2. Supprime les écrans et composants d'exemple du template.
3. Installe : @supabase/supabase-js, @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, expo-secure-store, expo-local-authentication, expo-image-picker, expo-sharing, expo-file-system, react-native-url-polyfill (avec npx expo install quand c'est un paquet Expo).
4. Crée un fichier .env avec EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY (valeurs vides que je remplirai), un .env.example identique, et ajoute .env au .gitignore.
5. Crée src/lib/supabase.ts : client Supabase qui stocke la session dans expo-secure-store sur mobile et localStorage sur le web, avec autoRefreshToken et persistSession.
6. Crée la structure de dossiers de l'architecture (section 3) avec des écrans vides qui affichent juste leur titre, et un app/_layout.tsx minimal.
7. Écran d'accueil temporaire app/index.tsx qui affiche "ProdTrack" et teste la connexion à Supabase (par exemple supabase.auth.getSession()) en affichant "Connexion Supabase OK" ou l'erreur.
8. Le dépôt Git existe déjà (relié à GitHub) : ne refais pas git init. Termine par la mise à jour de docs/AVANCEMENT.md, puis commit et push comme indiqué dans AGENTS.md.

Termine en me disant exactement quoi mettre dans .env et comment lancer l'appli.
```

**Tester :** remplis `.env` avec l'URL et la clé anon de Supabase, puis lance `npx expo start`. Sur le téléphone, « Connexion Supabase OK » doit s'afficher.

---

## Phase 2 — Fondations

**Prompt :**
```
Lis @docs/01-ARCHITECTURE.md (sections 3, 5 et 7) et @supabase/migrations/0001_schema_initial.sql.

Objectif : préparer les fondations réutilisables. Pas encore d'écran métier.

1. Types de la base : écris src/types/database.ts au format des types générés par Supabase (Database avec Tables, Views, Functions, Enums), en le déduisant exactement du fichier SQL. Ajoute en haut un commentaire expliquant la commande pour le régénérer plus tard (npx supabase gen types typescript --project-id ...). Exporte des alias pratiques : Produit, Profil, Boutique, MouvementStock, SaisieVente, Prevision, Notification, StockActuel, CaJournalier, RoleEmploye.
2. src/theme.ts : palette chaleureuse "boulangerie" (crème, brun doré, texte foncé, vert succès, rouge erreur), tailles de texte (min 16), espacements, rayon des coins, hauteur des boutons 56.
3. src/lib/format.ts : formatEuros(centimes) → "12,50 €" ; formatDate(date) → "lun. 27/10" ; formatJourComplet ; aujourdhuiParis() → 'YYYY-MM-DD' en heure de Paris ; debutSemaine(date) (lundi) ; debutMois(date).
4. Composants dans src/components/ :
   - Ecran (SafeArea + titre + défilement optionnel)
   - Bouton (variantes principal / secondaire / danger, état chargement, désactivé)
   - Champ (texte, avec libellé et message d'erreur, compatible react-hook-form)
   - Compteur (− / champ numérique / +, valeur entière ≥ 0, gros boutons)
   - CarteProduit (photo ou initiale, nom, prix, contenu à droite libre)
   - EtatChargement, EtatErreur (message + bouton Réessayer), EtatVide (message)
   - Toast ou bannière de confirmation simple
5. app/_layout.tsx : ajoute le QueryClientProvider de TanStack Query.
6. Écran temporaire de démonstration app/demo.tsx qui montre tous les composants (je le supprimerai plus tard).

Vérifie avec npx tsc --noEmit.
```

**Tester :** ouvre l'écran `/demo` (en web : ajoute `/demo` à l'adresse). Tous les composants s'affichent et le compteur − / + marche.

---

## Phase 3 ⭐ — Inscription, connexion, rôles, PIN et Face ID

**Prompt :**
```
Lis @docs/01-ARCHITECTURE.md (sections 2 — décisions D4, D5, D6, D12 — et 6) et @cahier-des-charges-mvp.md section 2.

Objectif : tout le parcours de connexion. Après connexion, chaque rôle arrive sur ses onglets (encore vides).

1. src/auth/AuthProvider.tsx : écoute la session Supabase, charge le profil de l'utilisateur (table profils), expose { session, profil, chargement, verrouille, deconnexion, rechargerProfil }. Si le profil a archive_le non null : afficher "Votre compte a été désactivé. Contactez votre responsable." puis déconnecter.
2. Écrans (auth) :
   - connexion : email + mot de passe, lien vers inscription, messages d'erreur en français.
   - inscription : email + mot de passe (+ confirmation), puis vers "choix".
   - choix : deux gros boutons "Je suis le patron" / "J'ai un code boutique".
   - creer-entreprise : nom de l'entreprise, prénom, nom, nom de la première boutique → appelle la fonction RPC creer_entreprise.
   - rejoindre : code boutique (8 caractères, majuscules auto), rôle (Pâtissier / Vendeuse), prénom, nom, équipe Jour/Nuit si pâtissier → RPC rejoindre_boutique. Erreur claire si le code est invalide.
   - information : mention d'information RGPD sur le suivi individuel (texte clair : quelles données sont collectées, que le CA par employé est visible par le patron, durée de conservation, droits d'accès et de rectification, contact = le patron). Bouton "J'ai lu et compris" → met à jour profils.information_rgpd_acceptee_le. Tant que ce n'est pas accepté, l'employé ne peut pas aller plus loin (le patron aussi doit la voir une fois).
   - creer-pin : saisir 2 fois un code à 4 chiffres. Si l'appareil a Face ID / empreinte, proposer de l'activer.
3. src/lib/pin.ts : stocke dans expo-secure-store un hash SHA-256 du PIN (avec un sel aléatoire, utilise expo-crypto, à installer) par id utilisateur ; fonctions creerPin, verifierPin, pinExiste, supprimerPin ; compteur d'essais : après 5 erreurs → supprimer le PIN et déconnecter.
4. app/deverrouiller.tsx : à chaque ouverture de l'appli (et retour après plus de 5 minutes en arrière-plan) si une session existe : tenter Face ID si activé, sinon pavé numérique PIN. Bouton "Se connecter avec un autre compte". Sur le web : PIN uniquement.
5. Redirections dans app/_layout.tsx : pas de session → (auth)/connexion ; session sans profil → (auth)/choix ; information RGPD non acceptée → (auth)/information ; pas de PIN sur cet appareil → (auth)/creer-pin ; verrouillé → deverrouiller ; sinon selon le rôle → (admin), (patissier) ou (vendeuse).
6. Layouts à onglets vides pour les 3 rôles avec les onglets prévus dans l'architecture (titres en français, icônes @expo/vector-icons), et un écran profil (nom, rôle, boutique, bouton déconnexion, bouton "Changer mon code PIN").

Ne touche pas au SQL. Vérifie avec npx tsc --noEmit.
```

**Tester :**
1. Crée `patron@test.fr` → « Je suis le patron » → entreprise + boutique → info RGPD → PIN. Tu arrives sur les onglets patron.
2. Dans Supabase, Table Editor > `boutiques` : copie le `code_invitation`.
3. Déconnecte-toi, crée `patissier.a@test.fr` avec ce code (Pâtissier, Jour). Tu arrives sur les onglets pâtissier.
4. Fais pareil pour `patissier.b` (Nuit) et `vendeuse.c`.
5. Ferme complètement l'appli puis rouvre-la : le PIN est demandé. Face ID ne marche pas dans Expo Go sur iPhone ; c'est normal, il sera testé en phase 11.

---

## Phase 4 — Patron : boutiques, employés, produits et prix

**Prompt :**
```
Lis @docs/01-ARCHITECTURE.md et @cahier-des-charges-mvp.md section 3.1 (et décisions D3, D9, D12).

Objectif : les écrans du patron, sauf le chiffre d'affaires (phase 8) et l'export (phase 8).

1. Hooks dans src/api/ : boutiques.ts, employes.ts, produits.ts (lecture, création, modification, archivage), avec invalidation du cache TanStack Query après chaque modification.
2. Onglet Boutiques : liste des boutiques ; créer une boutique (nom, adresse) ; pour chaque boutique, afficher le code d'invitation en gros avec un bouton "Partager le code" (Share de React Native, message : "Rejoins [boutique] sur ProdTrack avec le code XXXX").
3. Onglet Employés : liste par boutique (photo/initiales, prénom nom, rôle, équipe). Filtre "Afficher les comptes archivés". Bouton "Archiver ce compte" avec confirmation dans l'interface (pas de alert natif sur le web) expliquant que l'historique est conservé → met archive_le = now(). Possibilité de réactiver un compte archivé.
4. Onglet Produits : sélecteur de boutique, liste de tous les produits avec fabricant et prix ; modifier le prix (saisie en euros, conversion en centimes) ; réattribuer le fabricant (liste des pâtissiers actifs de la boutique) ; badge "Imposé" pour les produits impose_par_admin.
5. Gamme obligatoire : bouton "Imposer un produit" : nom, prix, pâtissier fabricant, conservation, seuil min, et une recette (lignes ingrédient / quantité / unité) → crée le produit avec impose_par_admin = true. Option "Imposer aussi dans d'autres boutiques" : choisir les boutiques et le pâtissier de chacune ; l'app crée une copie par boutique (décision D3).
6. Messages d'erreur traduits pour les erreurs de la base connues : nom de produit déjà utilisé (index unique), "Le fabricant doit être un pâtissier actif".

Vérifie avec npx tsc --noEmit.
```

**Tester :** en patron, crée une 2ᵉ boutique et partage son code ; impose « Baguette tradition » au pâtissier B ; change un prix ; archive puis réactive la vendeuse C.

---

## Phase 5 — Pâtissier : mes produits et recettes

**Prompt :**
```
Lis @docs/01-ARCHITECTURE.md (décision D10) et @cahier-des-charges-mvp.md section 3.2 points 1 et 2.

Objectif : le pâtissier gère ses produits et leurs recettes.

1. Base de données — crée supabase/migrations/0003_storage_photos.sql avec les règles d'accès Storage pour le bucket privé "photos" : chemins "produits/{boutique_id}/{fichier}" et "profils/{user_id}/{fichier}". Lecture : utilisateurs connectés qui peuvent voir la boutique (fonction public.peut_voir_boutique) ou leur propre dossier profil (+ le patron de l'entreprise). Écriture : le pâtissier de la boutique ou le patron pour les produits ; soi-même pour son profil. Explique-moi comment l'exécuter dans Supabase.
2. src/api/photos.ts : choisir une photo (galerie ou appareil photo), la réduire (max 1024 px, utilise expo-image-manipulator), l'envoyer dans Storage, et afficher les photos avec des URL signées (mise en cache 1 h).
3. Onglet Mes produits (dossier app/(patissier)/produits/) : liste de MES produits (fabricant = moi) ; badge "Imposé par le patron" (ces produits ne peuvent être ni renommés ni supprimés). Bouton "Ajouter un produit".
4. Fiche produit (création et modification) : nom, prix en euros, photo facultative, conservation (Frais / Surgelé), durée de conservation en jours, seuil minimum de stock (avec explication : "Nombre d'unités qui doit toujours rester en stock"). Bouton "Retirer ce produit" (archivage) sauf si imposé.
5. Recette dans la fiche : liste de lignes ingrédient / quantité / unité (choix : g, kg, ml, l, pièce, cuillère), ajout, modification, suppression, enregistrement.
6. Si c'est la toute première connexion du pâtissier et qu'il n'a aucun produit : écran d'accueil "Ajoutez les produits que vous fabriquez" avec le bouton d'ajout.
7. Photo de profil facultative dans l'écran profil (même système).

Vérifie avec npx tsc --noEmit.
```

**Tester :** en pâtissier A, ajoute muffin (3 €, seuil 15, surgelé, 30 jours, avec recette), brownie et cookie. En pâtissier B, ajoute croissant et pain au chocolat, et vérifie que « Baguette tradition » est là sans pouvoir la supprimer. Essaie d'ajouter un 2ᵉ « Muffin » : un message d'erreur doit apparaître.

---

## Phase 6 — Pâtissier : production, sorties, stock

**Prompt :**
```
Lis @docs/01-ARCHITECTURE.md (sections 5 et 7, décision D8) et @cahier-des-charges-mvp.md sections 3.2 (points 3 et 4) et 4.1.

Objectif : saisies de stock en moins d'une minute.

1. src/api/stock.ts : lire la vue stock_actuel de la boutique ; ajouter un mouvement (production ou sortie) ; lister mes mouvements du jour ; annuler (supprimer) un de mes mouvements du jour.
2. Onglet Production : liste de MES produits avec photo, stock actuel et un Compteur par ligne ; bouton unique "Enregistrer la production" qui crée un mouvement 'production' pour chaque produit dont la quantité > 0 ; confirmation "50 muffins ajoutés. Stock : 57".
3. Onglet Sorties : liste de TOUS les produits de la boutique (y compris ceux des autres pâtissiers), avec le nom du fabricant en petit, stock actuel et Compteur ; bouton "Enregistrer les sorties". Empêcher de sortir plus que le stock disponible (message clair). Rappel en haut : "Le chiffre d'affaires reste attribué au fabricant du produit."
4. Onglet Stock : tous les produits de la boutique avec stock actuel ; en orange si stock < seuil minimum. Recherche si plus de 10 produits.
5. En bas des onglets Production et Sorties : "Mes saisies d'aujourd'hui" avec un bouton "Annuler" sur chaque ligne (confirmation).
6. Rafraîchissement en tirant la liste vers le bas.

Vérifie avec npx tsc --noEmit.
```

**Tester (exemple du cahier des charges 4.1) :** en pâtissier A, produis 7 muffins, puis 50 : le stock vaut 57. En pâtissier B, sors 8 muffins : le stock vaut 49. Annule la sortie puis refais-la.

---

## Phase 7 — Vendeuse : saisie de fin de journée

**Prompt :**
```
Lis @docs/01-ARCHITECTURE.md (sections 5 et 7, décisions D7, D13) et @cahier-des-charges-mvp.md section 3.3.

Objectif : la vendeuse saisit vendu / jeté / reste pour tous les produits en moins d'une minute.

1. src/api/ventes.ts : lire les saisies d'un jour pour la boutique ; enregistrer (upsert sur produit_id + jour) une liste de saisies en une seule requête. N'envoie que produit_id, jour, vendu, jete, reste (prix et fabricant sont remplis par la base).
2. Onglet Fin de journée (accueil vendeuse) : date du jour en haut (avec possibilité de choisir hier, pour un oubli) ; liste de tous les produits actifs de la boutique avec photo et nom, et sur chaque ligne 3 compteurs compacts : Vendu / Jeté / Reste ; pré-remplir avec les valeurs déjà saisies ce jour-là ; bouton fixe en bas "Enregistrer la journée" ; confirmation avec le nombre de produits enregistrés.
3. Indicateur discret par ligne : "déjà enregistré" si la saisie existe.
4. Mise en page adaptée au téléphone (3 compteurs lisibles) et à la tablette (plus large).
5. Onglet Historique : les 14 derniers jours, total vendu / jeté par jour ; toucher un jour ouvre la saisie de ce jour en lecture seule (modifiable seulement pour aujourd'hui et hier).

Vérifie avec npx tsc --noEmit.
```

**Tester (exemple 4.2) :** en vendeuse C, saisis muffin : vendu 5, jeté 1, reste 2. Dans Supabase, Table Editor > `saisies_vente` : prix 300 et fabricant = pâtissier A.

---

## Phase 8 ⭐ — Patron : chiffre d'affaires et export CSV

**Prompt :**
```
Lis @docs/01-ARCHITECTURE.md (section 5, décision D11) et @cahier-des-charges-mvp.md sections 3.1 point 6, 4.2 et 5.1 (export CSV).

Objectif : le tableau de bord du patron et l'export.

1. src/api/ca.ts : lire la vue ca_journalier sur une période (date début, date fin, boutique optionnelle), et fonctions pures de regroupement (dans src/lib/ca.ts, testables) : par employé, par produit, par jour, par semaine (lundi-dimanche), par mois. Joindre les noms des fabricants (profils, y compris archivés, marqués "(archivé)").
2. Onglet Tableau de bord (accueil patron) :
   - Sélecteurs en haut : Boutique (toutes / une) ; Période : Aujourd'hui / Hier / Cette semaine / Ce mois / Personnalisée.
   - Chiffres clés : CA total, quantité vendue, quantité jetée (et taux de perte en %).
   - Classement des employés par CA avec une barre horizontale simple (Views, pas de librairie de graphiques).
   - Toucher un employé → détail : CA par produit et par jour sur la période.
   - Liste des produits : meilleurs et moins bons vendeurs.
   - Message clair si aucune saisie sur la période.
3. Onglet Export : choix de la période et de la boutique ; 3 exports CSV (séparateur point-virgule, encodage UTF-8 avec BOM pour Excel, montants en euros avec virgule) : ventes (jour, boutique, produit, fabricant, vendu, jeté, reste, prix, CA) ; mouvements de stock (jour, produit, type, quantité, saisi par) ; CA par employé et par jour. Mobile : fichier créé avec expo-file-system puis partage avec expo-sharing. Web : téléchargement du fichier.
4. Écris des tests unitaires pour src/lib/ca.ts (installe jest-expo si besoin) avec l'exemple du cahier des charges : muffin 3 €, 5 vendus → 15 € pour le pâtissier A, 0 € pour le pâtissier B.

Vérifie avec npx tsc --noEmit et lance les tests.
```

**Tester :** en patron, sur « Aujourd'hui », le pâtissier A a 15 € et le pâtissier B 0 € (s'il n'a rien vendu). Exporte le CSV et ouvre-le dans Excel : les accents et les colonnes doivent être corrects.

---

## Phase 9 ⭐ — Prévision, planning et notifications

**Prompt :**
```
Lis @docs/01-ARCHITECTURE.md (section 5, décisions D1, D2, D14), @cahier-des-charges-mvp.md section 4.3 et la fonction calculer_previsions dans @supabase/migrations/0001_schema_initial.sql.

Objectif : afficher le planning de fabrication calculé chaque nuit par la base, et les notifications dans l'appli. Le calcul est déjà fait en SQL : ne le refais pas dans l'app.

1. src/api/previsions.ts : lire les prévisions de mes produits (avec nom, photo, seuil) ; src/api/notifications.ts : lister mes notifications, nombre de non lues, marquer comme lu.
2. Onglet Planning (accueil pâtissier) :
   - En haut : "À fabriquer cette semaine" : produits dont jour_fabrication tombe dans les 7 prochains jours, triés par date, avec "au plus tard jeudi 30/10 — environ 24 unités". En rouge si c'est aujourd'hui.
   - Vue semaine : 7 colonnes (lun → dim) ou liste par jour sur téléphone, avec les produits à fabriquer.
   - Toucher un produit → détail : tableau Jour / Sorties prévues / Stock prévu en fin de journée (champ detail), seuil en ligne de repère, stock actuel.
   - Si fiable = false : bandeau "Prévision indicative : moins de 8 semaines de données."
   - Date et heure du dernier calcul (calcule_le).
3. Notifications : icône cloche avec pastille du nombre de non lues dans l'en-tête des 3 rôles → écran notifications ; marquer comme lu en ouvrant.
4. Crée supabase/tests/donnees_test.sql : un script à lancer dans l'éditeur SQL Supabase qui (a) recule de 10 semaines la date de création (created_at) du produit "Muffin" de la boutique de test ; (b) insère 10 semaines de sorties de muffins (saisi_par = le pâtissier B, retrouvé par son prénom) avec ces moyennes par jour : lundi 6, mardi 5, mercredi 8, jeudi 7, vendredi 9, samedi 12, dimanche 4 ; (c) règle le stock pour qu'il vaille 49 un lundi via un mouvement 'ajustement' (saisi_par = le patron) ; (d) lance select public.calculer_previsions(); (e) affiche la ligne de previsions du muffin. Mets en commentaire le résultat attendu selon l'exemple 4.3 (seuil 15 → fabrication au plus tard le jeudi si on est lundi).

Vérifie avec npx tsc --noEmit.
```

**Tester :** lance `supabase/tests/donnees_test.sql` dans Supabase, puis ouvre l'appli en pâtissier A : le muffin apparaît dans « À fabriquer », avec une notification. Si on n'est pas lundi, la date sera différente de l'exemple : c'est normal, la logique doit rester la même.

---

## Phase 10 — Tablette partagée

**Prompt :**
```
Lis @docs/01-ARCHITECTURE.md décision D5 et section 6.

Objectif : plusieurs employés utilisent la même tablette en boutique.

1. Sur l'écran de connexion : option "Ajouter un compte sur cet appareil". Garde en stockage sécurisé la liste des comptes connectés sur l'appareil (id, prénom, nom, photo, rôle, et leur session/refresh token chacun).
2. Écran "Qui êtes-vous ?" quand plusieurs comptes existent sur l'appareil : grille de photos/prénoms → PIN de la personne → bascule de session avec supabase.auth.setSession.
3. Réglage dans le profil : "Tablette partagée" (oui/non). Si oui : Face ID désactivé, verrouillage automatique après 2 minutes d'inactivité et après chaque enregistrement de saisie (retour à "Qui êtes-vous ?").
4. Bouton "Retirer mon compte de cet appareil".

Vérifie avec npx tsc --noEmit.
```

**Tester :** sur un même appareil, ajoute pâtissier B et vendeuse C, passe de l'un à l'autre avec leurs PIN.

---

## Phase 11 ⭐ — Notifications push et version installable

**Prompt :**
```
Lis @docs/01-ARCHITECTURE.md (section 1).

Objectif : notifications push réelles et une version installable sur téléphone (development build) pour tester Face ID et les push.

1. Configure EAS (eas.json) avec les profils development, preview et production. Explique-moi pas à pas : création du compte Expo, npx eas login, et lancement d'un build de développement Android (et iOS si j'ai un compte Apple Developer — dis-moi le coût et si c'est indispensable maintenant).
2. app.json / app.config : nom "ProdTrack", identifiants (com.prodtrack.app), icône et splash provisoires, texte d'autorisation Face ID en français (NSFaceIDUsageDescription), autorisations caméra/photos en français.
3. Notifications : enregistre le token Expo push de l'appareil dans une nouvelle table push_tokens (crée supabase/migrations/0004_push.sql avec RLS : chacun gère ses propres tokens).
4. Crée une Supabase Edge Function supabase/functions/envoyer-push qui, appelée par un Database Webhook sur l'insertion dans notifications, envoie la notification via l'API Expo Push à tous les tokens du profil. Explique-moi comment la déployer et créer le webhook dans le tableau de bord Supabase.
5. Toucher la notification ouvre l'écran Planning.
```

**Tester :** installe le build sur ton téléphone, relance `donnees_test.sql` (ou modifie un stock) puis lance `select public.calculer_previsions();` : la notification arrive sur le téléphone. Teste Face ID.

---

## Phase 12 — Vérification finale et mise en ligne

**Prompt :**
```
Lis @cahier-des-charges-mvp.md en entier et @docs/01-ARCHITECTURE.md.

Objectif : vérifier que tout le MVP est conforme et préparer la mise en ligne.

1. Fais un tableau de conformité : chaque point du cahier des charges (sections 1 à 5.1) → fait / partiel / manquant, avec le fichier concerné. Corrige les points partiels ou manquants simples ; liste les autres.
2. Vérifie les 3 exemples chiffrés du cahier des charges (4.1, 4.2, 4.3) et dis-moi comment je peux les rejouer.
3. Nettoyage : supprime app/demo.tsx et le code inutilisé ; npx tsc --noEmit sans erreur ; npx expo-doctor sans erreur.
4. Version web (PWA) : configure l'export web (npx expo export --platform web), le manifeste (nom, icônes, couleur) et explique-moi comment la mettre en ligne gratuitement (par exemple EAS Hosting, Netlify ou Vercel, hébergement UE si possible).
5. Liste de contrôle avant production : réactiver "Confirm email" dans Supabase, sauvegardes Supabase, politique de confidentialité, comptes Apple Developer / Google Play, captures d'écran, fiche des stores.
```

---

## Prompts utiles à tout moment

**Débogage** (dans la même conversation, après une erreur) :
```
Ça ne marche pas. Voici ce que j'ai fait : [décris l'action].
Voici ce qui s'affiche / l'erreur complète : [colle le message du terminal ou de l'écran rouge].
Trouve la cause avant de modifier le code, explique-la-moi simplement, puis corrige. Ne change rien d'autre que ce qui est nécessaire.
```

**Cursor tourne en rond** (après 3 essais ratés) : ouvre une nouvelle conversation :
```
Lis @docs/01-ARCHITECTURE.md. Problème : [description + erreur]. Les essais précédents n'ont pas marché : [ce qui a été tenté]. Analyse le code concerné depuis le début, propose 2 causes possibles, puis teste la plus probable.
```
Si ça bloque toujours : reviens vers Claude Code.

**Vérifier une phase avant de passer à la suivante :**
```
Relis le travail de la phase [X] (prompt dans @docs/02-PHASES-ET-PROMPTS.md). Vérifie que tout est fait, que les règles du projet sont respectées et qu'il n'y a pas de bug évident. Liste les problèmes, puis corrige-les.
```

**Modifier la base de données :**
```
J'ai besoin de [besoin]. Crée un nouveau fichier de migration SQL dans supabase/migrations/ (ne modifie pas les anciens), mets à jour src/types/database.ts, et explique-moi quoi coller dans l'éditeur SQL Supabase.
```
