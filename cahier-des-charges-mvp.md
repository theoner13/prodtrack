# Cahier des charges – MVP application de production boulangerie

Oct 24, 2026 · @Theo Nerisson

## 1. Contexte, objectif et périmètre

**ProdTrack** est une application pour les boulangeries, destinée autant aux patrons qu'aux employés. Elle compte les stocks et organise un planning de production à partir des stocks et des ventes des semaines passées. Une IA calcule, pour chaque produit, un jour de fabrication avant la fin du stock, afin d'éviter les ruptures et les surproductions.

Les vendeuses ont leur propre profil pour saisir les ventes, les pertes et les restes. Ces données montrent quels produits se vendent bien et lesquels se vendent moins bien.

Pour les patrons qui n'ont pas le temps de surveiller chacune de leurs boutiques, ProdTrack affiche, grâce aux données saisies par les employés sur leur production, le CA généré jour par jour par chacun d'eux.

**Cible** : les patrons de plusieurs boulangeries qui, faute de temps, n'ont ni responsable ni regard sur toutes leurs boutiques. L'application convient aux boulangeries qui ont plusieurs pâtissiers (équipes de jour et de nuit) et des vendeuses.

**Inclus dans le MVP**

- Comptes admin, pâtissier et vendeuse, rattachés à une boutique
- Catalogue de produits avec prix de vente, photo et recette
- Saisie de la production (entrées en stock) par le pâtissier
- Saisie des ventes, pertes et restes par la vendeuse
- Calcul automatique du stock
- Chiffre d'affaires par employé, par produit et par jour
- Prévision des ventes et planning de fabrication de la semaine suivante

**Exclu du MVP**

- Connexion au logiciel de caisse

## 2. Utilisateurs, rôles et connexion

| Rôle | Qui | Ce qu'il fait |
| --- | --- | --- |
| Admin | Le patron | Configure les boutiques, les produits et les prix. Consulte les chiffres de tous les employés. Gère les comptes. |
| Pâtissier | Équipe de production (jour ou nuit) | Déclare les produits qu'il fabrique, ses recettes et sa production du jour. |
| Vendeuse | Équipe de vente | Déclare pour chaque produit les quantités vendues, jetées et restantes. |

**Inscription et connexion**

- Chaque employé crée son profil à l'inscription : nom, prénom, rôle, boutique, photo facultative.
- Connexion par code personnel et reconnaissance faciale (Face ID) sur téléphone ou tablette compatible.
- À l'inscription, chaque pâtissier saisit lui-même les produits qu'il fabrique. Il n'y a pas de catalogue préétabli, car chaque boulangerie propose une offre différente (voir 3.2). Si le patron a imposé une gamme obligatoire, ces produits sont ajoutés d'office (voir 3.1).
- Un employé ne voit que les données de sa boutique. Seul l'admin voit toutes les boutiques.

## 3. Fonctionnalités par rôle

### 3.1 Compte admin

1. **Boutiques** : créer une ou plusieurs boutiques.
2. **Catalogue et prix** : fixer ou modifier le prix de vente de chaque article de chaque boutique, y compris un prix déjà saisi par un pâtissier.
3. **Gamme obligatoire (facultative)** : le patron peut exiger une gamme de produits, avec leurs recettes, et l'imposer à un ou plusieurs pâtissiers. Ces produits s'ajoutent d'office à leur liste et ne peuvent pas être retirés par l'employé. Sans gamme obligatoire, chaque pâtissier constitue librement sa liste.
4. **Liste des employés** : voir la liste complète des employés par boutique.
5. **Suppression de comptes** : supprimer un compte employé. Son historique de production et de CA est conservé (compte archivé).
6. **CA par employé** : consulter le chiffre d'affaires généré par chaque employé, par jour, par semaine, par mois et par produit, à partir des produits qu'il a fabriqués (règle de calcul en 4.2).

### 3.2 Compte pâtissier

1. **Mes produits** : dès l'inscription, saisir chaque produit qu'il fabrique (pas de catalogue préétabli), par saisie manuelle du nom, avec son prix de vente (le patron peut aussi le fixer ou le modifier), avec photo facultative. Exemple : pâtissier A (équipe de jour) = brownie, muffin, cookie ; pâtissier B (équipe de nuit) = croissant, pain au chocolat.
2. **Mes recettes** : saisir la recette de chaque produit (ingrédients et quantités).
3. **Saisie de production** : déclarer la quantité produite. Le stock se met à jour automatiquement. Exemple : stock de 7 muffins + 50 produits par le pâtissier A = 57 muffins.
4. **Sortie du congélateur ou du frigo** : l'équipe de nuit déclare, pour chaque produit, la quantité sortie le matin, y compris pour les produits fabriqués par un autre pâtissier. Le stock est déduit automatiquement (règle en 4.1). La sortie n'attribue aucun CA à celui qui la saisit : le CA reste au fabricant du produit (règle en 4.2).
5. **Planning de fabrication** : consulter les jours et quantités de fabrication proposés pour la semaine suivante (règle en 4.3).

### 3.3 Compte vendeuse

1. **Liste des produits** : voir la liste complète des produits déclarés par tous les pâtissiers de la boutique.
2. **Saisie en 3 champs par produit**, en fin de journée :
   - **Vendu** : quantité vendue
   - **Jeté** : quantité perdue
   - **Reste** : quantité gardée pour le lendemain
3. Ces saisies alimentent le stock, le CA par employé et la prévision.

## 4. Règles de calcul

### 4.1 Stock

Le stock correspond aux produits en réserve (congélateur ou frigo). Il se calcule indépendamment du CA.

Stock affiché = stock précédent + production – sorties.

Exemple pour le muffin :

| Action | Saisi par | Quantité | Stock affiché |
| --- | --- | --- | --- |
| Stock de départ | – | – | 7 |
| Production | Pâtissier A | + 50 | 57 |
| Sortie du congélateur | Pâtissier B | – 8 | 49 |

Les ventes, pertes et restes saisis par la vendeuse ne modifient pas ce stock. Ils servent au calcul du CA (4.2) et à la prévision (4.3).

### 4.2 Chiffre d'affaires par employé

Chaque produit a un seul fabricant : le pâtissier qui l'a déclaré dans « Mes produits ». Tout le CA d'un produit lui est attribué, quel que soit l'employé qui sort le produit du congélateur ou du frigo.

CA d'un pâtissier = quantité vendue de ses produits × prix de vente unitaire.

Exemple, prix de vente du muffin 3 €. Le muffin est fabriqué par le pâtissier A (équipe de jour).

| Moment | Action | Saisi par | Muffins |
| --- | --- | --- | --- |
| Veille | Production, mise au congélateur | Pâtissier A | 50 |
| Matin | Sortie du congélateur | Pâtissier B (équipe de nuit) | 8 |
| Fin de journée | Vendu | Vendeuse C | 5 |
| Fin de journée | Jeté | Vendeuse C | 1 |
| Fin de journée | Reste pour le lendemain | Vendeuse C | 2 |

Contrôles : en vitrine, 8 sortis – 5 vendus – 1 jeté = 2 restants. Au congélateur, 50 – 8 = 42 restants.

Résultat de la journée sur les muffins :

- Pâtissier A : 5 vendus × 3 € = **15 € de CA**, 1 muffin jeté
- Pâtissier B : 0 €. Il a seulement enregistré la sortie des 8 muffins.

### 4.3 Prévision, planning de fabrication et seuil de stock

**Seuil minimum de stock** : pour chaque produit, le pâtissier fabricant définit le nombre d'unités qui doit toujours rester en stock. Exemple : 15 muffins. Ce chiffre est modifiable à tout moment, produit par produit.

Le système calcule automatiquement, chaque jour :

1. **Ventes moyennes par jour de la semaine** pour chaque produit, à partir des données des semaines précédentes (exemple : 10 dernières semaines).
2. **Ventes prévisionnelles** des jours suivants, comparées au stock actuel.
3. **Mise à jour quotidienne** : la prévision est recalculée chaque jour à partir des sorties de stock réelles du produit.
4. **Jour de fabrication estimé** : le dernier jour avant que le stock prévu passe sous le seuil minimum du produit.
5. **Notification** : le pâtissier fabricant reçoit une notification indiquant le jour de fabrication estimé.

Exemple pour le muffin, stock actuel 49, seuil 15, ventes moyennes : lundi 6, mardi 5, mercredi 8, jeudi 7, vendredi 9.

| Jour | Ventes prévues | Stock prévu en fin de journée |
| --- | --- | --- |
| Lundi | 6 | 43 |
| Mardi | 5 | 38 |
| Mercredi | 8 | 30 |
| Jeudi | 7 | 23 |
| Vendredi | 9 | 14 (sous le seuil de 15) |

Résultat : fabrication estimée au plus tard le jeudi. Notification envoyée au pâtissier A.

Le planning tient compte de la durée de conservation de chaque produit (frais ou surgelé), à saisir sur la fiche produit. La prévision n'est fiable qu'après environ 8 semaines de saisies ; avant, l'application affiche une moyenne simple avec un avertissement.

## 5. Contraintes, points à arbitrer et attendus du devis

### 5.1 Contraintes techniques

- Utilisable sur téléphone et tablette (iOS et Android), y compris une tablette partagée en boutique.
- Saisie rapide : une déclaration de production ou de fin de journée en moins d'une minute.
- Données hébergées dans l'Union européenne, conformes au RGPD.
- Le suivi individuel des employés doit pouvoir être annoncé par écrit aux salariés avant usage (mention d'information fournie dans l'application).
- Export des données en CSV pour l'admin.

### 5.2 Choix retenus

| Point | Choix retenu |
| --- | --- |
| Connexion | Code + Face ID |
| Plateforme | Application native iOS et Android (variante à chiffrer : application web PWA) |

### 5.3 Attendus du devis

1. Chiffrage détaillé par bloc : comptes et connexion, catalogue et recettes, production et stock, saisie vendeuse, CA par employé, prévision et planning.
2. Chiffrage incluant les choix du tableau 5.2, avec deux montants séparés pour la plateforme : application native iOS et Android, et application web (PWA).
3. Technologies proposées et hébergement.
4. Délai de livraison et étapes de validation.
5. Coût mensuel d'hébergement et de maintenance.
6. Propriété du code source cédée au client.
7. Conditions de garantie (correction des bugs après livraison).
