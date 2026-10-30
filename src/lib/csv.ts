// Helpers de format encore utiles hors CSV (dates, montants texte).

import { centimesVersEuros, dateExport } from './exports.ts';

/** '2026-10-28' → '28/10/2026' */
export function dateCsv(jour: string): string {
  return dateExport(jour);
}

/** 1500 → "15,00" (euros avec virgule, sans symbole). */
export function montantEurosCsv(centimes: number): string {
  const euros = centimesVersEuros(centimes);
  const signe = euros < 0 ? '-' : '';
  const absolu = Math.abs(euros);
  const parties = absolu.toFixed(2).split('.');
  return `${signe}${parties[0]},${parties[1]}`;
}
