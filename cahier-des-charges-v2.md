# Cahier des charges – ProdTrack, version complète (v2)

31 octobre 2026 · Theo Nerisson

Cette version reprend le cahier des charges validé du 24 octobre 2026 ([cahier-des-charges-mvp.md](cahier-des-charges-mvp.md), conservé tel quel) et y ajoute toutes les fonctionnalités décidées en cours de projet. Les ajouts sont signalés par **[Ajout]**.

## 1. Contexte, objectif et périmètre

**ProdTrack** est une application pour les boulangeries, destinée autant aux patrons qu'aux employés. Elle compte les stocks et organise un planning de production à partir des stocks et des sorties des semaines passées. Un calcul automatique propose, pour chaque produit surgelé, un jour de fabrication avant la fin du stock, afin d'éviter les ruptures et les surproductions.

L'équipe de vente a son propre profil pour saisir les ventes, les pertes et les restes. Ces données montrent quels produits se vendent bien et lesquels se vendent moins bien.

Pour les patrons qui n'ont pas le temps de surveiller chacune de leurs boutiques, ProdTrack affiche, grâce aux données saisies par les employés sur leur production, le CA généré jour par jour par chacun d'eux et par chaque boutique.

**Cible** : les patrons de plusieurs boulangeries qui, faute de temps, n'ont ni responsable ni regard sur toutes leurs boutiques. L'application convient aux boulangeries qui ont plusieurs pâtissiers (équipes de jour et de nuit) et une équipe de vente.

**Inclus**

- Comptes Admin, Pâtissier et Vente, rattachés à une boutique d'une même entreprise
- Catalogue de produits avec prix de vente, photo et recette
- **[Ajout]** Produits intermédiaires (pâte feuilletée, crème pâtissière, biscuit cuillère…), non vendus
- Saisie de la production (entrées en stock) par le pâtissier
- **[Ajout]** Déclaration des pertes en production (produit brûlé, tombé…)
- Saisie des ventes, pertes et restes par l'équipe de vente
- Calcul automatique du stock
- Chiffre d'affaires par employé, par boutique, par produit et par jour
- Prévision et planning de fabrication des produits surgelés
- **[Ajout]** Exports lisibles en Excel et en PDF
- **[Ajout]** Mode tablette partagée en boutique
- **[Ajout]** Version web installable sur téléphone (en ligne), en plus des applications iOS et Android

**Exclu**

- Connexion au logiciel de caisse

## 2. Utilisateurs, rôles et connexion

| Rôle | Qui | Ce qu'il fait |
| --- | --- | --- |
| Admin | Le patron | Configure les boutiques, les produits et les prix. Consulte les chiffres de tous les employés et de toutes les boutiques. Gère les comptes. |
| Pâtissier | Équipe de production (jour ou nuit) | Déclare les produits qu'il fabrique, ses recettes, sa production, ses sorties et ses pertes. Consulte son planning. |
| Vente | Équipe de vente | Déclare pour chaque produit les quantités vendues, jetées et restantes. |

**[Ajout]** Les rôles s'affichent « Admin », « Pâtissier » et « Vente » (au lieu de Patron et Vendeuse).

**Inscription et connexion**

- Chaque employé crée son profil à l'inscription : nom, prénom, rôle, boutique, équipe (jour ou nuit). La photo est facultative et s'ajoute depuis le profil.
- **[Ajout]** Pour rejoindre une boutique, l'employé saisit le **code d'invitation** de la boutique (8 caractères) que lui transmet l'admin. Sans code, pas d'inscription.
- **[Ajout]** À la première connexion : email et mot de passe, puis création d'un **code personnel à 4 chiffres**. Ensuite, l'appli s'ouvre avec ce code, ou avec Face ID / l'empreinte sur un téléphone compatible.
- **[Ajout]** Avant le premier usage, chaque employé lit et valide la **mention d'information** sur le suivi de son travail (RGPD).
- À l'inscription, chaque pâtissier saisit lui-même les produits qu'il fabrique. Il n'y a pas de catalogue préétabli. Si l'admin a imposé des produits, ils sont ajoutés d'office (voir 3.1).
- Un employé ne voit que les données de sa boutique. Seul l'admin voit toutes les boutiques.
- **[Ajout] Tablette partagée** : plusieurs comptes peuvent être enregistrés sur un même appareil. L'écran « Qui êtes-vous ? » affiche les photos des employés ; chacun touche sa photo et tape son code. En mode tablette partagée, l'appli se verrouille après chaque saisie et après 2 minutes sans utilisation. Un employé peut retirer son compte de l'appareil sans toucher aux autres.

## 3. Fonctionnalités par rôle

### 3.1 Compte Admin

1. **Boutiques** : créer une ou plusieurs boutiques ; chaque boutique a son code d'invitation.
2. **Catalogue et prix** : fixer ou modifier le prix de vente de chaque article de chaque boutique, y compris un prix déjà saisi par un pâtissier.
3. **Imposer un produit (gamme obligatoire, facultative)** : le patron peut imposer un produit à une ou plusieurs boutiques. Ces produits s'ajoutent d'office et ne peuvent pas être retirés par l'employé.
   - **[Ajout]** Seuls le nom, le prix et la boutique sont obligatoires. La recette, la photo, le seuil, la durée de conservation et le pâtissier sont facultatifs.
   - **[Ajout]** Un produit imposé sans pâtissier apparaît « À prendre » chez les pâtissiers de la boutique : le premier qui touche « Je le fabrique » en devient le fabricant.
   - **[Ajout]** Pour plusieurs boutiques, l'appli crée une copie du produit par boutique.
4. **Liste des employés** : voir la liste complète des employés par boutique.
5. **[Ajout] Fiche employé** : photo, rôle, boutique, équipe et chiffre d'affaires de l'employé sur la période choisie.
6. **Suppression de comptes** : supprimer un compte employé. Son historique de production et de CA est conservé (compte archivé) ; ses produits restent et l'admin peut les réattribuer.
7. **CA par employé** : consulter le chiffre d'affaires généré par chaque employé, par jour, par semaine, par mois et par produit (règle en 4.2).
8. **[Ajout] Tableau de bord** :
   - filtres par boutique (ou toutes) et par période (aujourd'hui, hier, cette semaine, ce mois, période personnalisée) ;
   - chiffres clés : CA total, quantités vendues, jetées, taux de perte, pertes en production ;
   - CA par boutique ;
   - CA par employé, avec en détail un tableau Produit | Vendus | Jetés | CA et une ligne Total ;
   - classement des produits par boutique : ceux qui rapportent le plus, qui se vendent le plus, qui se perdent le plus ;
   - en touchant « Taux de perte » ou « Jetés » : classement de ce qui se perd le plus.
9. **[Ajout] Correction du stock** : l'admin peut corriger le stock d'un produit (ajustement), par exemple après un inventaire.
10. **[Ajout] Pertes en production** : suivi des pertes déclarées par les pâtissiers, par produit.
11. **[Ajout] Exports** : 4 exports lisibles, chacun en **Excel** (tableau mis en forme, montants en euros) et en **PDF** : ventes, mouvements de stock, CA par employé, pertes en production. Ils remplacent l'export CSV prévu à l'origine.

### 3.2 Compte Pâtissier

1. **Mes produits** : saisir chaque produit qu'il fabrique (pas de catalogue préétabli) : nom, prix de vente, photo facultative, conservation (frais ou surgelé), durée de conservation. **[Ajout]** Formulaire compact : photo à côté du nom, choix côte à côte (Produit fini / Produit intermédiaire, Frais / Surgelé).
2. **Mes recettes** : saisir la recette de chaque produit (ingrédients, quantités, unités). La recette est facultative et peut être complétée plus tard.
3. **[Ajout] Produits intermédiaires** : un produit peut être déclaré « intermédiaire » (ex. pâte feuilletée, crème pâtissière). Il n'a pas de prix, n'est pas vendu et n'apparaît pas chez l'équipe de vente. Son stock est suivi et tous les pâtissiers de la boutique peuvent en produire.
4. **Saisie de production** : déclarer la quantité produite ; le stock se met à jour automatiquement. **[Ajout]** Le stock peut aussi s'ajouter directement depuis la fiche du produit.
5. **Sortie du congélateur ou du frigo** : déclarer la quantité sortie le matin, y compris pour les produits d'un autre pâtissier. Le stock est déduit automatiquement (règle en 4.1). La sortie n'attribue aucun CA à celui qui la saisit.
6. **[Ajout] Pertes en production** : déclarer des produits perdus en fabrication avec un motif (brûlé, tombé ou abîmé…). Une case indique si ces produits étaient déjà dans le stock ; si oui, ils en sont retirés.
7. **[Ajout] Annulation** : l'auteur d'une saisie (production, sortie, perte) peut l'annuler le jour même. Après, c'est l'admin qui corrige le stock.
8. **[Ajout] Stock** : l'onglet Stock montre uniquement les produits du pâtissier connecté, avec leur quantité ; chaque produit ouvre sa fiche.
9. **Planning de fabrication** (règle en 4.3) : **[Ajout]** présenté en agenda sur 7 jours, d'aujourd'hui à J+6. Chaque jour liste les produits surgelés à fabriquer et la quantité suggérée. Un produit déjà sous son seuil apparaît en tête d'aujourd'hui avec un point orange. Le nom du produit ouvre sa fiche ; toucher la ligne affiche le détail sur 14 jours.
10. **Notifications** : le pâtissier est prévenu du jour de fabrication estimé. **[Ajout]** Une cloche dans l'appli regroupe les notifications (marquer comme lu) ; les notifications push sur téléphone sont prêtes et seront actives avec l'application installée.
11. **[Ajout] Catalogue des autres boutiques** : voir les produits et recettes des autres boutiques de l'entreprise (sans le CA ni le fabricant) et décider de fabriquer aussi un produit chez soi. Les produits intermédiaires peuvent être importés d'une boutique à l'autre.
12. **[Ajout] Produits à prendre** : les produits imposés sans pâtissier s'affichent en haut de « Mes produits » avec le bouton « Je le fabrique ».

### 3.3 Compte Vente

1. **Liste des produits** : voir la liste des produits vendus de la boutique (les produits intermédiaires n'y figurent pas).
2. **Saisie en 3 champs par produit**, en fin de journée : **Vendu**, **Jeté**, **Reste** (gardé pour le lendemain).
3. **[Ajout]** Saisie pour aujourd'hui ou pour hier (en cas d'oubli), modifiable ; historique des 14 derniers jours.
4. Ces saisies alimentent le CA par employé et par boutique, et les statistiques de pertes.

## 4. Règles de calcul

### 4.1 Stock

Le stock correspond aux produits en réserve (congélateur ou frigo). Il se calcule indépendamment du CA.

Stock affiché = stock précédent + production – sorties.

**[Ajout]** S'y ajoutent les corrections de l'admin (ajustements) et, en moins, les pertes en production déclarées « retirées du stock ».

Exemple pour le muffin :

| Action | Saisi par | Quantité | Stock affiché |
| --- | --- | --- | --- |
| Stock de départ | – | – | 7 |
| Production | Pâtissier A | + 50 | 57 |
| Sortie du congélateur | Pâtissier B | – 8 | 49 |

Les ventes, pertes et restes saisis par l'équipe de vente ne modifient pas ce stock. Ils servent au calcul du CA (4.2) et aux statistiques.

### 4.2 Chiffre d'affaires par employé

Chaque produit a un seul fabricant par boutique : le pâtissier qui l'a déclaré dans « Mes produits » (ou qui l'a pris). Tout le CA d'un produit lui est attribué, quel que soit l'employé qui sort le produit du congélateur ou du frigo.

CA d'un pâtissier = quantité vendue de ses produits × prix de vente unitaire.

**[Ajout]** Le prix et le fabricant sont enregistrés avec chaque vente : un changement de prix plus tard ne modifie pas le CA passé.

Exemple, prix de vente du muffin 3 €, fabriqué par le pâtissier A :

| Moment | Action | Saisi par | Muffins |
| --- | --- | --- | --- |
| Veille | Production, mise au congélateur | Pâtissier A | 50 |
| Matin | Sortie du congélateur | Pâtissier B | 8 |
| Fin de journée | Vendu | Vente C | 5 |
| Fin de journée | Jeté | Vente C | 1 |
| Fin de journée | Reste pour le lendemain | Vente C | 2 |

Résultat : pâtissier A = 5 × 3 € = **15 € de CA** (1 muffin jeté) ; pâtissier B = 0 €.

### 4.3 Prévision, planning de fabrication et seuil de stock

**[Ajout] Uniquement pour les produits surgelés** (décision du 30/10/2026). Les produits frais sont fabriqués chaque jour : ils n'ont ni seuil, ni planning, ni alerte. Leur stock reste suivi normalement.

**Seuil minimum de stock** : pour chaque produit surgelé, le pâtissier fabricant définit le nombre d'unités qui doit toujours rester en stock (ex. 15 muffins). Modifiable à tout moment.

Le système calcule automatiquement, chaque nuit :

1. **Moyenne par jour de la semaine** pour chaque produit. **[Ajout]** La moyenne porte sur les **sorties de stock** (ce qui quitte réellement le congélateur), puisque ce sont elles qui font baisser le stock.
2. **Stock prévu** sur les jours suivants.
3. **Jour de fabrication estimé** : le dernier jour avant que le stock prévu passe sous le seuil.
4. **[Ajout] Quantité suggérée** : consommation prévue sur 7 jours (ou sur la durée de conservation si elle est plus courte) après le jour de fabrication, plus le seuil, moins le stock prévu ce jour-là.
5. **Notification** au pâtissier fabricant.
6. **[Ajout] Alerte immédiate** : un produit surgelé qui passe sous son seuil apparaît tout de suite dans le planning du jour, sans attendre le calcul de la nuit.

Exemple pour le muffin, stock 49, seuil 15, sorties moyennes lundi 6, mardi 5, mercredi 8, jeudi 7, vendredi 9 : le stock prévu passe à 14 le vendredi, donc fabrication au plus tard le jeudi.

La prévision n'est fiable qu'après environ 8 semaines de données ; avant, l'application l'indique (« Prévisions indicatives »).

## 5. Contraintes et choix

### 5.1 Contraintes techniques

- Utilisable sur téléphone, tablette et ordinateur, y compris une tablette partagée en boutique.
- Saisie rapide : une déclaration de production ou de fin de journée en moins d'une minute.
- Données hébergées dans l'Union européenne (Paris), conformes au RGPD.
- Mention d'information sur le suivi individuel affichée et validée dans l'application.
- **[Ajout]** Exports Excel et PDF pour l'admin (au lieu du CSV).
- **[Ajout]** Un nom de produit est unique dans une boutique (pas de doublon).
- **[Ajout]** Confidentialité : un pâtissier ne voit que son propre CA ; l'admin voit tout.

### 5.2 Choix retenus

| Point | Choix retenu |
| --- | --- |
| Connexion | Email + mot de passe la première fois, puis code à 4 chiffres et Face ID / empreinte |
| Plateforme | Application iOS et Android **et** version web installable (déjà en ligne) |
| **[Ajout]** Présentation | Style blanc épuré, logo ProdTrack sur chaque écran, animation d'accueil, icônes fines |

### 5.3 Attendus du devis (cahier d'origine)

Section du cahier d'origine, inchangée : chiffrage par bloc, deux montants pour la plateforme (native et web), technologies et hébergement, délais et étapes de validation, coût mensuel, propriété du code cédée au client, garantie.

## 6. [Ajout] Récapitulatif des évolutions

| Domaine | Évolution |
| --- | --- |
| Connexion | Code d'invitation par boutique ; code à 4 chiffres ; mention RGPD ; tablette partagée « Qui êtes-vous ? » avec verrouillage |
| Admin | Tableau de bord complet (filtres, CA par boutique et par employé, classements produits et pertes) ; fiche employé ; correction du stock |
| Admin | Imposer un produit avec champs facultatifs et produit « à prendre » |
| Admin | Exports Excel et PDF (ventes, mouvements, CA, pertes) |
| Pâtissier | Produits intermédiaires partagés |
| Pâtissier | Pertes en production avec motif |
| Pâtissier | Catalogue des autres boutiques, import d'intermédiaires |
| Pâtissier | Planning en agenda 7 jours, alerte immédiate sous le seuil |
| Pâtissier | Stock limité à ses produits, ajout de stock depuis la fiche, annulation le jour même |
| Vente | Saisie aujourd'hui ou hier, historique 14 jours |
| Règles | Prévision sur les sorties ; seuil et planning réservés aux surgelés ; quantité suggérée ; prix figé à la vente |
| Présentation | Style épuré, logo, animation d'accueil, icônes fines, version web installable |
