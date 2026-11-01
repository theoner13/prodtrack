// Transformation des lignes ca_journalier en points de courbe (affichage uniquement).
// Aucun calcul métier : on regroupe le CA déjà fourni par la vue.

import { formatEuros } from './format.ts';

export type LigneCaJour = {
  jour: string | null;
  ca_centimes: number | null;
};

export type PointCourbeCa = {
  jour: string;
  caCentimes: number;
  index: number;
};

export type StyleLibelleJour = 'semaine' | 'mois';

function versDate(jour: string): Date {
  return new Date(`${jour}T12:00:00Z`);
}

function versJour(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function ajouterJours(jour: string, nombre: number): string {
  const date = versDate(jour);
  date.setUTCDate(date.getUTCDate() + nombre);
  return versJour(date);
}

function jourSemaineCourt(jour: string): string {
  const nom = versDate(jour).toLocaleDateString('fr-FR', {
    weekday: 'short',
    timeZone: 'UTC',
  });
  return nom.replace(/\.$/, '');
}

/** Liste inclusive des jours AAAA-MM-JJ de debut à fin. */
export function joursDeLaPlage(debut: string, fin: string): string[] {
  if (debut > fin) return [];
  const jours: string[] = [];
  let courant = debut;
  while (courant <= fin) {
    jours.push(courant);
    courant = ajouterJours(courant, 1);
  }
  return jours;
}

/** Pour « Aujourd'hui » / « Hier » : 7 jours se terminant par `jourFin`. */
export function plageCourbeSeptJours(jourFin: string): { debut: string; fin: string } {
  return { debut: ajouterJours(jourFin, -6), fin: jourFin };
}

/** Regroupe le CA par jour ; jours sans vente = 0. */
export function pointsCourbeCa(
  lignes: LigneCaJour[],
  debut: string,
  fin: string,
): PointCourbeCa[] {
  const parJour = new Map<string, number>();
  for (const ligne of lignes) {
    if (!ligne.jour) continue;
    parJour.set(ligne.jour, (parJour.get(ligne.jour) ?? 0) + (ligne.ca_centimes ?? 0));
  }
  return joursDeLaPlage(debut, fin).map((jour, index) => ({
    jour,
    caCentimes: parJour.get(jour) ?? 0,
    index,
  }));
}

/**
 * Max arrondi « joli » pour l'axe Y (en centimes).
 * Ex. 123 450 → 150 000 (1 500 €). Si tout est à 0 → 10 000 (100 €).
 */
export function maxRepereCourbe(maxCentimes: number): number {
  if (maxCentimes <= 0) return 10_000;
  const euros = maxCentimes / 100;
  const magnitude = 10 ** Math.floor(Math.log10(euros));
  const normalise = euros / magnitude;
  let nice: number;
  if (normalise <= 1) nice = 1;
  else if (normalise <= 2) nice = 2;
  else if (normalise <= 5) nice = 5;
  else nice = 10;
  return Math.round(nice * magnitude * 100);
}

/** Trois repères : 0, moitié, max. */
export function reperesCourbe(maxCentimes: number): { valeur: number; libelle: string }[] {
  const max = maxRepereCourbe(maxCentimes);
  const moitie = Math.round(max / 2);
  return [
    { valeur: max, libelle: formatEuros(max) },
    { valeur: moitie, libelle: formatEuros(moitie) },
    { valeur: 0, libelle: formatEuros(0) },
  ];
}

/** Libellé sous la courbe : « lun 26 » ou « 26/10 ». */
export function libelleJourCourbe(jour: string, style: StyleLibelleJour): string {
  const d = versDate(jour);
  const jj = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  if (style === 'mois') return `${jj}/${mm}`;
  return `${jourSemaineCourt(jour)} ${jj}`;
}

/** Bulle au toucher / survol : « lun 26/10 · 1 234,50 € ». */
export function libelleBulleCourbe(jour: string, caCentimes: number): string {
  const d = versDate(jour);
  const jj = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${jourSemaineCourt(jour)} ${jj}/${mm} · ${formatEuros(caCentimes)}`;
}

/**
 * Indices des libellés à afficher selon la place.
 * Environ 48 px par libellé ; on saute 1 sur 2 ou 1 sur 3 si besoin.
 */
export function indicesLibellesVisibles(nombrePoints: number, largeurPx: number): number[] {
  if (nombrePoints <= 0) return [];
  if (nombrePoints === 1) return [0];
  const placeParLabel = 48;
  const maxLabels = Math.max(2, Math.floor(largeurPx / placeParLabel));
  const pas = Math.max(1, Math.ceil((nombrePoints - 1) / (maxLabels - 1)));
  const indices: number[] = [];
  for (let i = 0; i < nombrePoints; i += pas) {
    indices.push(i);
  }
  const dernier = nombrePoints - 1;
  if (indices[indices.length - 1] !== dernier) {
    indices.push(dernier);
  }
  return indices;
}

/** Géométrie d'un segment (View fine tournée) entre deux points. */
export function segmentEntrePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number; longueur: number; angleDeg: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const longueur = Math.sqrt(dx * dx + dy * dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return {
    x: (x1 + x2) / 2 - longueur / 2,
    y: (y1 + y2) / 2,
    longueur,
    angleDeg,
  };
}

/** Style de libellé selon la longueur de la période. */
export function styleLibellePourPlage(debut: string, fin: string): StyleLibelleJour {
  return joursDeLaPlage(debut, fin).length > 10 ? 'mois' : 'semaine';
}
