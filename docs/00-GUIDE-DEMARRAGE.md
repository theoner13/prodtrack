# Guide de démarrage — à faire une seule fois

Temps estimé : 45 min à 1 h. Fais les étapes dans l'ordre.

## Étape 1 — Projet hors de OneDrive + GitHub ✅ (fait par Claude Code)

- Le projet est dans `C:\dev\prodtrack`, hors de OneDrive, qui gère mal les milliers de fichiers d'un projet de code. On travaille **uniquement** là.
- Le code est sur GitHub, dans un dépôt privé. Les IA se synchronisent avec GitHub à chaque tâche (règles dans [AGENTS.md](../AGENTS.md)).

## Étape 2 — Installer les outils

1. **Git**, **GitHub CLI** et **Node.js** : déjà installés par Claude Code.
2. **Cursor** : déjà installé.
3. Sur ton téléphone : l'application **Expo Go** (App Store / Play Store).

Vérification : ouvre Cursor, puis le terminal (menu Terminal > New Terminal), et tape :
```
node -v
git -v
```
Les deux doivent afficher un numéro de version.

## Étape 3 — Créer la base de données Supabase

1. Crée un compte sur https://supabase.com (gratuit).
2. **New project** :
   - Name : `prodtrack`
   - Database password : génère-le et **garde-le** (gestionnaire de mots de passe).
   - Region : **Central EU (Frankfurt)** ou **West EU (Paris)**. C'est obligatoire pour le RGPD.
3. Attends 2 minutes que le projet soit prêt.
4. Menu de gauche **SQL Editor** > **New query** : colle tout le contenu de `supabase/migrations/0001_schema_initial.sql` puis clique **Run**. Le message doit être « Success. No rows returned ».
5. Menu **Database > Extensions** : cherche `pg_cron` et active-le.
6. **SQL Editor** > New query : colle `supabase/migrations/0002_cron.sql` puis **Run**.
7. Menu **Authentication > Sign In / Providers > Email** : pendant le développement, **désactive « Confirm email »**. Tu pourras créer des comptes de test sans recevoir d'email. Il faudra le réactiver avant la mise en production.
8. Menu **Project Settings > API** (ou « API Keys ») : note
   - **Project URL** (`https://xxxx.supabase.co`)
   - la clé **anon / publishable** (publique, pour l'appli)
   - ⚠️ ne copie **jamais** la clé `service_role` / `secret` dans le projet.

## Étape 4 — Ouvrir le projet dans Cursor

1. Cursor > File > Open Folder > `C:\dev\prodtrack`.
2. Vérifie que Cursor voit les règles : Cursor Settings > Rules. `prodtrack` doit apparaître dans les « Project Rules ».

## Étape 5 — Comment utiliser Cursor pour ce projet

**Le principe : une phase = une nouvelle conversation Cursor.** Une conversation trop longue fait perdre le fil à l'IA et consomme plus.

Pour chaque phase de [02-PHASES-ET-PROMPTS.md](02-PHASES-ET-PROMPTS.md) :

1. Ouvre une **nouvelle conversation** (Ctrl+L puis « + » ou Ctrl+N dans le panneau).
2. Choisis le mode **Agent**.
3. Modèle : prends le plus performant que ton abonnement permet (par exemple un modèle Claude) pour les phases marquées ⭐ ; le mode « Auto » suffit pour les autres.
4. **Copie-colle le prompt** de la phase, tel quel.
5. Laisse Cursor travailler. S'il demande la permission de lancer une commande (`npx ...`, `npm ...`), accepte, sauf si elle supprime des choses hors du projet.
6. Quand il a fini : **teste** comme indiqué dans la phase.
7. Si ça marche : vérifie que Cursor a bien **mis à jour `docs/AVANCEMENT.md` et poussé sur GitHub**. Sinon, écris-lui : « Mets à jour AVANCEMENT.md, commit et push comme indiqué dans AGENTS.md. » Puis passe à la phase suivante.
8. Si ça ne marche pas : utilise le **prompt de débogage** (en bas du fichier des phases), dans la même conversation.

**GitHub = la sauvegarde et la mémoire commune.** Chaque phase réussie y est enregistrée. Si une phase casse tout, on peut revenir à la version précédente : demande-moi (Claude Code) de le faire.

**Lancer l'appli pour tester :**
```
npx expo start
```
Puis scanne le QR code avec Expo Go (Android) ou l'appareil photo (iPhone). Le téléphone et le PC doivent être sur le **même Wi-Fi**. Si le QR code ne marche pas : `npx expo start --tunnel`.
Pour tester sur le PC : appuie sur `w` dans le terminal pour ouvrir la version web.

## Étape 6 — Quand revenir vers moi (Claude Code)

En tant que chef de projet, je reste utile pour :
- **vérifier une phase** (« relis la phase 6 et dis-moi si c'est conforme au cahier des charges ») ;
- débloquer un bug sur lequel Cursor tourne en rond depuis 3 essais ;
- modifier la base de données ou ajuster le plan ;
- préparer la mise en ligne (stores, web).
