// Regroupement du planning pâtissier : une ligne par produit, par jour, sans doublon.

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

/** Libellé de groupe : « Aujourd'hui », « Demain », ou « Samedi 31/10 ». */
export function libelleJourPlanning(jour: string, aujourdhui: string): string {
  if (jour === aujourdhui) return "Aujourd'hui";
  if (jour === ajouterJours(aujourdhui, 1)) return 'Demain';
  const date = new Date(`${jour}T12:00:00Z`);
  const nom = date.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const jj = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${jj}/${mm}`;
}

/** Libellé court pour l’accessibilité (ex. « samedi 31/10 »). */
export function libelleJourCourt(jour: string, aujourdhui: string): string {
  if (jour === aujourdhui) return "aujourd'hui";
  if (jour === ajouterJours(aujourdhui, 1)) return 'demain';
  const date = new Date(`${jour}T12:00:00Z`);
  const nom = date.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const jj = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${nom} ${jj}/${mm}`;
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
 * Construit le planning : prévisions des 7 prochains jours + produits sous le seuil.
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

  return [...parJour.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([jour, lignes]) => ({
      jour,
      libelle: libelleJourPlanning(jour, aujourdhui),
      lignes: [...lignes].sort(comparerLignes),
    }));
}
