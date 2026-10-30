// Planning pâtissier en agenda : 7 jours, produits surgelés uniquement, sans doublon.

export type EntreePlanning = {
  produitId: string;
  nom: string;
  intermediaire: boolean;
  stock: number;
  seuil: number;
  jourFabrication: string | null;
  quantiteSuggeree: number | null;
  fiable: boolean | null;
  calculeLe: string | null;
};

export type LignePlanning = {
  produitId: string;
  nom: string;
  intermediaire: boolean;
  stock: number;
  seuil: number;
  sousSeuil: boolean;
  jour: string;
  quantite: number | null;
  fiable: boolean | null;
};

export type GroupePlanning = {
  jour: string;
  libelle: string;
  lignes: LignePlanning[];
};

function ajouterJours(jour: string, nombre: number): string {
  const date = new Date(`${jour}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + nombre);
  return date.toISOString().slice(0, 10);
}

/** Date courte « vendredi 30/10 » (UTC, jour calendaire Paris déjà fourni en YYYY-MM-DD). */
function dateCourte(jour: string): string {
  const date = new Date(`${jour}T12:00:00Z`);
  const nom = date.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const jj = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${nom} ${jj}/${mm}`;
}

/** Libellé d’en-tête : « Aujourd'hui · vendredi 30/10 », « Demain · … », ou « Lundi 02/11 ». */
export function libelleJourPlanning(jour: string, aujourdhui: string): string {
  const court = dateCourte(jour);
  if (jour === aujourdhui) return `Aujourd'hui · ${court}`;
  if (jour === ajouterJours(aujourdhui, 1)) return `Demain · ${court}`;
  return court.charAt(0).toUpperCase() + court.slice(1);
}

/** Libellé court pour l’accessibilité (ex. « samedi 31/10 »). */
export function libelleJourCourt(jour: string, aujourdhui: string): string {
  if (jour === aujourdhui) return "aujourd'hui";
  if (jour === ajouterJours(aujourdhui, 1)) return 'demain';
  return dateCourte(jour);
}

export function libelleAccessibiliteLigne(ligne: LignePlanning, aujourdhui: string): string {
  const quand = libelleJourCourt(ligne.jour, aujourdhui);
  if (ligne.sousSeuil) {
    const quantite =
      ligne.quantite === null ? 'dès que possible' : `${ligne.quantite} à faire ${quand}`;
    return `${ligne.nom} : sous le seuil, stock ${ligne.stock}, seuil ${ligne.seuil}, ${quantite}`;
  }
  return `${ligne.nom} : ${ligne.quantite ?? 0} à faire ${quand}`;
}

function comparerLignes(a: LignePlanning, b: LignePlanning): number {
  if (a.sousSeuil !== b.sousSeuil) return a.sousSeuil ? -1 : 1;
  const qa = a.quantite ?? -1;
  const qb = b.quantite ?? -1;
  if (qb !== qa) return qb - qa;
  return a.nom.localeCompare(b.nom, 'fr');
}

/**
 * Construit l’agenda : toujours 7 cases (aujourd’hui → J+6).
 * Entrées = produits surgelés uniquement (le filtre frais est fait par l’appelant).
 * Un produit n’apparaît qu’une fois ; sous le seuil → Aujourd’hui.
 */
export function construirePlanning(entrees: EntreePlanning[], aujourdhui: string): GroupePlanning[] {
  const fin = ajouterJours(aujourdhui, 6);
  const parId = new Map<string, LignePlanning>();

  for (const entree of entrees) {
    const sousSeuil = entree.stock < entree.seuil;
    const dansSemaine =
      Boolean(entree.calculeLe) &&
      entree.jourFabrication !== null &&
      entree.jourFabrication >= aujourdhui &&
      entree.jourFabrication <= fin;

    if (!sousSeuil && !dansSemaine) continue;

    const jour = sousSeuil ? aujourdhui : (entree.jourFabrication as string);
    const quantite = dansSemaine ? entree.quantiteSuggeree : null;

    parId.set(entree.produitId, {
      produitId: entree.produitId,
      nom: entree.nom,
      intermediaire: entree.intermediaire,
      stock: entree.stock,
      seuil: entree.seuil,
      sousSeuil,
      jour,
      quantite,
      fiable: entree.fiable,
    });
  }

  const parJour = new Map<string, LignePlanning[]>();
  for (const ligne of parId.values()) {
    const liste = parJour.get(ligne.jour) ?? [];
    liste.push(ligne);
    parJour.set(ligne.jour, liste);
  }

  const groupes: GroupePlanning[] = [];
  for (let i = 0; i < 7; i += 1) {
    const jour = ajouterJours(aujourdhui, i);
    const lignes = [...(parJour.get(jour) ?? [])].sort(comparerLignes);
    groupes.push({
      jour,
      libelle: libelleJourPlanning(jour, aujourdhui),
      lignes,
    });
  }
  return groupes;
}
