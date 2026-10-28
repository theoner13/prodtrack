// Calculs purs sur les lignes de ca_journalier (aucun I/O).
// Semaine = lundi → dimanche. Montants en centimes.

export type LigneCa = {
  jour: string | null;
  boutique_id?: string | null;
  fabricant_id: string | null;
  produit_id: string | null;
  produit_nom?: string | null;
  vendu: number | null;
  jete: number | null;
  reste?: number | null;
  prix_unitaire_centimes?: number | null;
  ca_centimes: number | null;
};

export type TotauxCa = {
  caCentimes: number;
  vendu: number;
  jete: number;
  /** Pourcentage jeté / (vendu + jeté), arrondi à 1 décimale. 0 si aucun. */
  tauxPerte: number;
};

export type GroupeCa = {
  cle: string;
  caCentimes: number;
  vendu: number;
  jete: number;
};

export type TypePeriode = 'aujourdhui' | 'hier' | 'semaine' | 'mois';

export type DatesPeriode = {
  debut: string;
  fin: string;
};

function n(valeur: number | null | undefined): number {
  return valeur ?? 0;
}

function versDate(jour: string): Date {
  return new Date(`${jour}T12:00:00Z`);
}

function versJour(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function jourPrecedent(jour: string): string {
  const d = versDate(jour);
  d.setUTCDate(d.getUTCDate() - 1);
  return versJour(d);
}

/** Lundi de la semaine contenant `jour` (AAAA-MM-JJ). */
export function lundiDeLaSemaine(jour: string): string {
  const d = versDate(jour);
  const decalage = (d.getUTCDay() + 6) % 7; // lundi = 0 … dimanche = 6
  d.setUTCDate(d.getUTCDate() - decalage);
  return versJour(d);
}

export function totaux(lignes: LigneCa[]): TotauxCa {
  let caCentimes = 0;
  let vendu = 0;
  let jete = 0;
  for (const ligne of lignes) {
    caCentimes += n(ligne.ca_centimes);
    vendu += n(ligne.vendu);
    jete += n(ligne.jete);
  }
  const base = vendu + jete;
  const tauxPerte = base === 0 ? 0 : Math.round((jete / base) * 1000) / 10;
  return { caCentimes, vendu, jete, tauxPerte };
}

function accumuler(
  map: Map<string, GroupeCa>,
  cle: string,
  ligne: LigneCa,
): void {
  const existant = map.get(cle) ?? { cle, caCentimes: 0, vendu: 0, jete: 0 };
  existant.caCentimes += n(ligne.ca_centimes);
  existant.vendu += n(ligne.vendu);
  existant.jete += n(ligne.jete);
  map.set(cle, existant);
}

function trierParCaDecroissant(groupes: GroupeCa[]): GroupeCa[] {
  return [...groupes].sort((a, b) => b.caCentimes - a.caCentimes || a.cle.localeCompare(b.cle, 'fr'));
}

function trierParDate(groupes: GroupeCa[]): GroupeCa[] {
  return [...groupes].sort((a, b) => a.cle.localeCompare(b.cle));
}

export function parEmploye(lignes: LigneCa[]): GroupeCa[] {
  const map = new Map<string, GroupeCa>();
  for (const ligne of lignes) {
    if (!ligne.fabricant_id) continue;
    accumuler(map, ligne.fabricant_id, ligne);
  }
  return trierParCaDecroissant([...map.values()]);
}

export function parProduit(lignes: LigneCa[]): GroupeCa[] {
  const map = new Map<string, GroupeCa>();
  for (const ligne of lignes) {
    const cle = ligne.produit_id ?? ligne.produit_nom ?? '';
    if (!cle) continue;
    accumuler(map, cle, ligne);
  }
  return trierParCaDecroissant([...map.values()]);
}

export function parJour(lignes: LigneCa[]): GroupeCa[] {
  const map = new Map<string, GroupeCa>();
  for (const ligne of lignes) {
    if (!ligne.jour) continue;
    accumuler(map, ligne.jour, ligne);
  }
  return trierParDate([...map.values()]);
}

/** Clé = date du lundi (AAAA-MM-JJ). Un dimanche appartient à la semaine du lundi précédent. */
export function parSemaine(lignes: LigneCa[]): GroupeCa[] {
  const map = new Map<string, GroupeCa>();
  for (const ligne of lignes) {
    if (!ligne.jour) continue;
    accumuler(map, lundiDeLaSemaine(ligne.jour), ligne);
  }
  return trierParDate([...map.values()]);
}

/** Clé = AAAA-MM. */
export function parMois(lignes: LigneCa[]): GroupeCa[] {
  const map = new Map<string, GroupeCa>();
  for (const ligne of lignes) {
    if (!ligne.jour) continue;
    accumuler(map, ligne.jour.slice(0, 7), ligne);
  }
  return trierParDate([...map.values()]);
}

/** Dates d'une période à partir du jour de référence (AAAA-MM-JJ, sans fuseau). */
export function datesPeriode(type: TypePeriode, aujourdhui: string): DatesPeriode {
  if (type === 'aujourdhui') {
    return { debut: aujourdhui, fin: aujourdhui };
  }
  if (type === 'hier') {
    const hier = jourPrecedent(aujourdhui);
    return { debut: hier, fin: hier };
  }
  if (type === 'semaine') {
    return { debut: lundiDeLaSemaine(aujourdhui), fin: aujourdhui };
  }
  // mois
  return { debut: `${aujourdhui.slice(0, 7)}-01`, fin: aujourdhui };
}

/** '28/10/2026' → '2026-10-28', ou null si invalide. */
export function parseDateFr(saisie: string): string | null {
  const match = saisie.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const jj = Number(match[1]);
  const mm = Number(match[2]);
  const aaaa = Number(match[3]);
  const d = new Date(Date.UTC(aaaa, mm - 1, jj));
  if (d.getUTCFullYear() !== aaaa || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== jj) {
    return null;
  }
  return `${String(aaaa).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(jj).padStart(2, '0')}`;
}

/** '2026-10-28' → '28/10/2026' */
export function formatDateFr(jour: string): string {
  const [annee, mois, jourNum] = jour.split('-');
  if (!annee || !mois || !jourNum) return jour;
  return `${jourNum}/${mois}/${annee}`;
}
