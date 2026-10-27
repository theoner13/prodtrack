# Avancement du projet

À lire au début de chaque session, à mettre à jour à la fin de chaque tâche (voir [AGENTS.md](../AGENTS.md)).

## Phases

- [x] Préparation : cahier des charges, architecture, SQL, prompts, dépôt GitHub
- [x] Mise en place Supabase : projet Paris créé, migrations 0001 et 0002 appliquées et testées, pg_cron actif, `.env` rempli
- [x] Phase 1 : création du projet Expo
- [x] Phase 2 : fondations
- [ ] Phase 3 : inscription, connexion, rôles, PIN et Face ID
- [ ] Phase 4 : patron (boutiques, employés, produits et prix)
- [ ] Phase 5 : pâtissier (mes produits et recettes)
- [ ] Phase 6 : pâtissier (production, sorties, stock)
- [ ] Phase 7 : vendeuse (saisie de fin de journée)
- [ ] Phase 8 : patron (chiffre d'affaires et export CSV)
- [ ] Phase 9 : prévision, planning et notifications
- [ ] Phase 10 : tablette partagée
- [ ] Phase 11 : notifications push et version installable
- [ ] Phase 12 : vérification finale et mise en ligne

## En cours / à savoir

- Base Supabase vide et prête. Confirmation par email désactivée (dev) : à réactiver avant la production.
- ⏰ 03/11/2026 : renouveler le jeton Supabase « claude-code-prodtrack » (supabase.com/dashboard/account/tokens), puis `npx supabase login --token ...`.
- Prochaine étape : phase 3 ⭐ (connexion, rôles, PIN). Utiliser le meilleur modèle.
- Si une page affiche « Requiring unknown module » après ajout de fichiers : relancer le serveur avec `npx expo start --web --clear`.

## Journal (le plus récent en haut, une ligne par session)

- 2026-10-27 : phase 2 — types générés depuis Supabase, thème, format euros/dates, composants de base, écran /demo (Claude Code).
- 2026-10-27 : phase 1 — projet Expo (SDK 58), client Supabase, écrans vides. Accueil : « Connexion Supabase OK ».
- 2026-10-27 : base Supabase créée (Paris), SQL appliqué, règles 4.1/4.2/4.3 testées (Claude Code).
- 2026-10-27 : préparation du projet, dépôt GitHub créé (Claude Code).
