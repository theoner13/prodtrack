# Avancement du projet

À lire au début de chaque session, à mettre à jour à la fin de chaque tâche (voir [AGENTS.md](../AGENTS.md)).

## Phases

- [x] Préparation : cahier des charges, architecture, SQL, prompts, dépôt GitHub
- [x] Mise en place Supabase : projet Paris créé, migrations 0001 et 0002 appliquées et testées, pg_cron actif, `.env` rempli
- [x] Phase 1 : création du projet Expo
- [x] Phase 2 : fondations
- [x] Phase 3 : inscription, connexion, rôles, PIN et Face ID
- [x] Phase 4 : patron (boutiques, employés, produits et prix)
- [x] Phase 5 : pâtissier (mes produits et recettes)
- [x] Phase 6 : pâtissier (production, sorties, stock)
- [x] Phase 7 : vendeuse (saisie de fin de journée)
- [x] Phase 8 : patron (chiffre d'affaires et export CSV)
- [ ] Phase 9 : prévision, planning et notifications
- [ ] Phase 10 : tablette partagée
- [ ] Phase 11 : notifications push et version installable
- [ ] Phase 12 : vérification finale et mise en ligne

## En cours / à savoir

- Base Supabase vide et prête. Confirmation par email désactivée (dev) : à réactiver avant la production.
- ⏰ 03/11/2026 : renouveler le jeton Supabase « claude-code-prodtrack » (supabase.com/dashboard/account/tokens), puis `npx supabase login --token ...`.
- Prochaine étape : phase 9 (prévision, planning et notifications). Comptes de test : mot de passe `Test1234!`.
- Web en mode « single » (app.json) : le mode « server » restait bloqué sur le chargement sous Windows. Après un changement de app.json, relancer le serveur avec `npx expo start --web --clear`.
- Tests des calculs : `npm test`

## Journal (le plus récent en haut, une ligne par session)

- 2026-10-28 : phase 8 — chiffre d'affaires du patron (tableau de bord, filtres, classement) et export CSV (ventes, mouvements, CA par employé) (Cursor ; vérifiée par Claude Code : exemple 4.2 A = 15 €, B = 0 €, 1200 lignes sans perte grâce à la lecture par pages, 3 exports CSV relus, écrans ordinateur et téléphone).
- 2026-10-28 : phase 7 — saisie de fin de journée de la vendeuse (vendu / jeté / reste, aujourd’hui / hier, historique 14 jours, Compteur compact, pied fixe) (Cursor ; vérifiée par Claude Code : exemple 4.2 prix et fabricant copiés, droits, écrans ordinateur, téléphone et tablette).
- 2026-10-28 : phase 6 — production, sorties et stock du pâtissier (saisie en moins d’une minute, annulation du jour, RefreshControl) (Cursor ; vérifiée par Claude Code : exemple 7 → 57 → 49, droits, écrans ordinateur et téléphone).
- 2026-10-28 : corrections après vérification de la phase 5 — bouton Retour sur le Profil, photo d’un nouveau produit envoyée seulement à l’enregistrement, retour à l’écran d’origine après le code PIN (Cursor + vérification Claude Code).
- 2026-10-27 : phase 5 — le pâtissier gère ses produits, leurs photos (appareil photo ou galerie) et leurs recettes. Accès au bucket privé « photos ».
- 2026-10-27 : saisie de recette compacte (une ligne par ingrédient, nouvelle ligne automatique), utilisée pour « Imposer un produit » (Claude Code).
- 2026-10-27 : phase 4 — écrans patron (boutiques, employés, produits, gamme imposée). Le partage du code sur le web affiche une bannière à copier.
- 2026-10-27 : phase 3 — connexion, inscription, rôles, mention RGPD, PIN (web : localStorage) et onglets par rôle.
- 2026-10-27 : phase 2 — types générés depuis Supabase, thème, format euros/dates, composants de base, écran /demo (Claude Code).
- 2026-10-27 : phase 1 — projet Expo (SDK 58), client Supabase, écrans vides. Accueil : « Connexion Supabase OK ».
- 2026-10-27 : base Supabase créée (Paris), SQL appliqué, règles 4.1/4.2/4.3 testées (Claude Code).
- 2026-10-27 : préparation du projet, dépôt GitHub créé (Claude Code).
