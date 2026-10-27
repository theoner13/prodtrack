# Instructions pour les IA qui travaillent sur ProdTrack

Ce fichier s'adresse à toute IA de code (Cursor, Claude Code, autres). À lire en entier avant toute action.

## 1. Contexte en 30 secondes

- **ProdTrack** : appli de production pour boulangeries (patron, pâtissiers, vendeuses).
- **Quoi faire** : [cahier-des-charges-mvp.md](cahier-des-charges-mvp.md). Validé : ne pas le modifier.
- **Comment le faire** : [docs/01-ARCHITECTURE.md](docs/01-ARCHITECTURE.md). Stack, structure et décisions à respecter.
- **Ordre du travail** : [docs/02-PHASES-ET-PROMPTS.md](docs/02-PHASES-ET-PROMPTS.md).
- **Où on en est** : [docs/AVANCEMENT.md](docs/AVANCEMENT.md). **À lire en premier, à mettre à jour en dernier.**
- Le propriétaire du projet débute en code (et avec Cursor / Claude), mais apprend vite :
  - explications courtes et simples, en français, avec le « pourquoi » en une phrase pour qu'il apprenne ;
  - le guider pas à pas et lui donner toujours la prochaine étape concrète ;
  - **faire les actions soi-même** (lancer les commandes, l'appli, git) plutôt que lui demander de les taper ;
  - lui proposer d'automatiser ce qui se répète. Ne mettre en place une automatisation qu'après son accord, en respectant la section 3.

## 2. Synchronisation avec GitHub (obligatoire)

Dépôt : https://github.com/theoner13/prodtrack (privé), branche unique **`main`**. Dossier local : `C:\dev\prodtrack`. Plusieurs IA (et plusieurs ordinateurs) travaillent sur le même code. Pour ne jamais travailler sur une version périmée :

**Au début de chaque session :**
```
git pull
```
Puis lire `docs/AVANCEMENT.md`.

**À la fin de chaque tâche qui fonctionne** (compile, testée) :
1. Mettre à jour `docs/AVANCEMENT.md` : cocher ce qui est fait, noter en une ligne ce qui reste ou ce qui bloque.
2. Enregistrer et envoyer :
```
git add -A
git commit -m "Phase X : description courte en français"
git push
```

Règles :
- Un commit = une tâche cohérente. Message en français, au présent, qui dit **ce qui change** (ex. `Phase 6 : saisie des sorties de stock`).
- Ne jamais committer de secrets : `.env`, clés Supabase `service_role`/`secret`, mots de passe. Seul `.env.example` (sans valeurs) est versionné.
- Si `git pull` signale un conflit : s'arrêter, expliquer simplement au propriétaire et proposer la résolution. Ne jamais utiliser `git push --force` ni `git reset --hard` sans son accord explicite.
- Code cassé : ne pas pousser. Le dire, puis corriger ou revenir en arrière.
- Pas de branches, pull requests, CI, hooks ou outils Git en plus, sauf demande du propriétaire.

## 3. Rester simple (pas de sur-ingénierie)

- Faire **uniquement** ce que demande la tâche en cours. Pas d'avance sur les phases suivantes, pas de « au cas où ».
- La solution la plus simple qui respecte l'architecture gagne. Pas d'abstraction, de couche, de fichier ou de configuration « pour plus tard ».
- Pas de nouvelle librairie sans demander et expliquer pourquoi (la stack est fixée dans l'architecture).
- Pas de refactorisation de code qui marche, sauf si la tâche l'exige.
- Les calculs métier (stock, CA, prévision) sont dans la base Supabase : l'appli les lit, elle ne les refait pas.
- Base de données : ne jamais modifier une migration existante. Voir la section 4.
- Si une demande contredit le cahier des charges ou l'architecture : s'arrêter et poser la question.

## 4. Supabase (base de données)

- Projet : `prodtrack`, ref `oqltjrtiwqpzkuoucczq`, région Paris. Le dossier est déjà relié au projet (`supabase link`).
- La CLI s'utilise avec `npx supabase ...` (pas d'installation globale).
- **Modifier la base** : créer `supabase/migrations/000X_description.sql` (numéro suivant), puis l'appliquer avec la CLI. Le mot de passe de la base est dans `.env.supabase.local` (variable `SUPABASE_DB_PASSWORD`) :
  ```
  npx supabase db push --linked -p <SUPABASE_DB_PASSWORD>
  ```
  Commiter la migration dans le même commit que le code qui l'utilise. Ne jamais modifier une migration déjà appliquée.
- Fichiers locaux, jamais commités : `.env` (URL + clé **publishable** pour l'appli) et `.env.supabase.local` (mot de passe de la base). Sur un autre ordinateur, ils n'existent pas : les demander au propriétaire.
- Interdit dans le code de l'appli : la clé `secret` / `service_role`.

## 5. Voir l'appli en local (obligatoire après chaque changement)

Pour l'instant, on développe et on teste **uniquement en local**. La mise en ligne (par exemple Vercel) viendra plus tard, à la phase 12. Ne rien déployer avant.

Après chaque changement qui touche l'appli :
1. Vérifier que le serveur Expo tourne. Sinon, le lancer dans un terminal en arrière-plan, sans bloquer la conversation :
   ```
   npx expo start --web
   ```
   S'il tourne déjà, ne pas en lancer un second : il se recharge tout seul.
2. Vérifier qu'il n'y a pas d'erreur dans le terminal ni à l'ouverture de la page. Sinon, corriger avant de continuer.
3. Donner au propriétaire des **liens cliquables** :
   - l'appli dans le navigateur : http://localhost:8081 (ou le port affiché par Expo) ;
   - le lien direct vers l'écran modifié (ex. http://localhost:8081/demo) ;
   - pour le téléphone : scanner le QR code affiché dans le terminal avec l'appli **Expo Go**, le téléphone étant sur le même Wi-Fi que l'ordinateur.

## 6. Fin de tâche : ce que l'IA doit dire au propriétaire

1. Ce qui a été fait, en 3 à 5 phrases simples.
2. Les liens pour voir le résultat en local (section 5).
3. Comment le tester, étape par étape.
4. Confirmation que le commit est fait et poussé sur GitHub (ou pourquoi il ne l'est pas). Le push est obligatoire à chaque tâche qui fonctionne (section 2).
