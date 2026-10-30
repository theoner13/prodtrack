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
- [x] Phase 9 : prévision, planning et notifications
- [x] Phase 10 : tablette partagée
- [ ] Phase 11 : notifications push et version installable
- [x] Phase 12 : vérification finale et mise en ligne

## En cours / à savoir

- Affichage : le rôle admin s'appelle « Admin » et le rôle vendeuse « Vente » (valeurs en base inchangées : admin / vendeuse).
- Phase 11 : code prêt (push, EAS) ; reste : compte Expo, eas init, build de développement et test sur téléphone (compte Apple Developer)
- Phase 12 terminée : conformité documentée dans `docs/12-VERIFICATION-FINALE.md`, icônes ProdTrack, PWA (`public/`), nettoyage demo, paquets Expo à jour. Commit local fait ; **push non fait** (consigne du prompt phase 12) — à pousser pour mettre à jour le site Vercel.
- Évolution (hors cahier des charges, validée par le propriétaire) : produits intermédiaires (ex. biscuit cuillère), non vendus, accessibles à tous les pâtissiers de la boutique
- Évolution (hors cahier des charges, validée par le propriétaire) : pertes en production déclarées par les pâtissiers
- Évolution (hors cahier des charges, validée par le propriétaire) : catalogue des autres boutiques pour les pâtissiers
- Base Supabase vide et prête. Confirmation par email désactivée (dev) : à réactiver avant la production.
- ⏰ 03/11/2026 : renouveler le jeton Supabase « claude-code-prodtrack » (supabase.com/dashboard/account/tokens), puis `npx supabase login --token ...`.
- Comptes de test : mot de passe `Test1234!`.
- Web en mode « single » (app.json) : le mode « server » restait bloqué sur le chargement sous Windows. Après un changement de app.json, relancer le serveur avec `npx expo start --web --clear`.
- Tests des calculs : `npm test`
- En ligne sur Vercel : https://prodtrack-zeta.vercel.app. Chaque push sur `main` redéploie (voir AGENTS.md section 6).
- Connexion rapide : boutons de test sur l'écran de connexion en local (variables EXPO_PUBLIC_COMPTES_TEST et EXPO_PUBLIC_MDP_TEST du .env ; relancer avec npx expo start --web --clear après modification).

## Journal (le plus récent en haut, une ligne par session)

- 2026-10-30 : admin : fiche employé avec son CA, CA par boutique dans le tableau de bord (Cursor)
- 2026-10-30 : imposer un produit : recette, photo, seuil, durée et pâtissier facultatifs ; produit sans pâtissier « à prendre » par le premier pâtissier ; intermédiaires importables entre boutiques (Cursor)
- 2026-10-30 : écrans de connexion et d'inscription centrés avec le logo (Cursor)
- 2026-10-30 : fiche produit : ajout de stock direct ; écran Stock : produit cliquable vers sa fiche (Cursor)
- 2026-10-30 : planning : nom du produit cliquable vers sa fiche (Cursor)
- 2026-10-30 : rôles affichés Admin / Pâtissier / Vente (au lieu de Patron / Vendeuse), logo en haut à gauche de chaque écran (Cursor)
- 2026-10-30 : écran du code : logo, pavé plus grand et centré (Cursor)
- 2026-10-30 : pavé du code : disposition 3 × 3 + 0 rétablie (Cursor)
- 2026-10-29 : animation d'accueil avec le logo à l'ouverture (Cursor)
- 2026-10-29 : style épuré blanc minimaliste : listes sans cartes, compteurs ronds discrets, titres et espacements réduits, boutons 40 px (Cursor)
- 2026-10-29 : phase 12 — vérification finale (tableau de conformité, exemples 4.1 à 4.3), nettoyage (demo supprimée, paquets à jour), icônes ProdTrack et site installable (PWA) (Cursor)
- 2026-10-29 : corrections après revue complète des phases 1 à 11 : correction du stock par le patron (D8), droits d'un employé archivé, photos des employés et de « Qui êtes-vous ? », messages d'erreur en français, CA par semaine et par mois (Cursor ; revue et vérification par Claude Code : relecture complète du code par un agent, tests de la base phases 4 à 11, 29 contrôles d’accès sans connexion, 25 contrôles des corrections, tous les parcours écrans ordinateur, téléphone et tablette repassés, données réelles intactes).
- 2026-10-29 : phase 11 — code notifications push et configuration EAS (migration 0007, edge function envoyer-push, enregistrement jeton, eas.json) ; builds téléphone et eas init à faire ensuite (Cursor ; vérifiée par Claude Code côté serveur : jetons protégés, fonction d’envoi sans clé mais à usage unique, envoi réel vers Expo testé ; expo-dev-client ajouté pour le build de développement ; test sur iPhone en attente du compte Apple Developer).
- 2026-10-28 : phase 10 — tablette partagée (plusieurs comptes sur l'appareil, écran Qui êtes-vous ?, bascule par PIN sans signOut, mode tablette partagée avec verrouillage 2 min et après saisie) (Cursor ; vérifiée par Claude Code : bug de bascule trouvé et corrigé — l'appli revenait sur « Qui êtes-vous ? » après le bon code ; 36 contrôles tablette et téléphone : code vérifié avant la bascule, aucun écran de l'ancienne personne, verrouillage après saisie et après 2 min, retrait d'un compte sans toucher les autres ; anciens tests repassés sans régression).
- 2026-10-28 : produits intermédiaires — non vendus, stock suivi, partagés entre pâtissiers de la boutique (Cursor ; vérifiée par Claude Code : production partagée mais pas sur les produits finis, ventes et prix refusés par la base, invisibles pour la vendeuse, badges, catalogue ; anciens tests base et écrans repassés sans régression).
- 2026-10-28 : pertes en production — déclaration par les pâtissiers (motif, case stock), suivi et export patron (Cursor ; vérifiée par Claude Code : exemple des 8 cookies brûlés sans changer le stock, perte retirée du stock, droits, stock de tous les produits recalculé à l’identique, écrans ordinateur et téléphone, tableau de bord et export).
- 2026-10-28 : catalogue des autres boutiques pour les pâtissiers — voir produits/recettes et fabriquer aussi chez soi (Cursor ; vérifiée par Claude Code : 27 contrôles de sécurité — même entreprise seulement, jamais le fabricant ni le code d’invitation, photos en lecture seule — et écrans ordinateur et téléphone).
- 2026-10-28 : planning : alerte immédiate des produits sous le seuil, le prévisionnel de nuit reste affiché dessous (Cursor ; vérifiée par Claude Code : Cookies nutella stock 8 / seuil 12 signalé, disparaît après une production).
- 2026-10-28 : phase 9 — planning de fabrication du pâtissier (semaine, détail 14 jours) et notifications (cloche, écran, marquer comme lu). (Cursor ; vérifiée par Claude Code : script de test lancé, fabrication au plus tard le 30/10 pour environ 41 unités comme calculé à la main, script relançable sans doublon, cloche et notifications, écrans ordinateur, téléphone et tablette).
- 2026-10-28 : site en ligne réparé — l’URL et la clé Supabase enregistrées sur Vercel commençaient par un caractère invisible (BOM), d’où « Pas de connexion internet » ; valeurs réenregistrées proprement et règle ajoutée dans AGENTS.md (Claude Code).
- 2026-10-28 : connexion rapide aux comptes de test, en local uniquement (Cursor)
- 2026-10-28 : mise en ligne sur Vercel — CLI installé, projet `prodtrack` relié, variables Supabase ajoutées, vercel.json, déploiement automatique à chaque push (Claude Code).

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
