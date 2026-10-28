// Génération CSV pure (séparateur ;, UTF-8 avec BOM, fin de ligne Windows).

const BOM = '\uFEFF';
const SEPARATEUR = ';';
const FIN_LIGNE = '\r\n';

function doitEntourer(valeur: string): boolean {
  return (
    valeur.includes(SEPARATEUR) ||
    valeur.includes('"') ||
    valeur.includes('\n') ||
    valeur.includes('\r')
  );
}

/** Échappe un champ CSV : guillemets doublés si besoin. */
export function champCsv(valeur: string | number): string {
  const texte = String(valeur);
  if (!doitEntourer(texte)) return texte;
  return `"${texte.replace(/"/g, '""')}"`;
}

/** 1500 → "15,00" (euros avec virgule, sans symbole). */
export function montantEurosCsv(centimes: number): string {
  const signe = centimes < 0 ? '-' : '';
  const absolu = Math.abs(centimes);
  const euros = Math.floor(absolu / 100);
  const cts = String(absolu % 100).padStart(2, '0');
  return `${signe}${euros},${cts}`;
}

/** '2026-10-28' → '28/10/2026' */
export function dateCsv(jour: string): string {
  const [annee, mois, jourNum] = jour.split('-');
  if (!annee || !mois || !jourNum) return jour;
  return `${jourNum}/${mois}/${annee}`;
}

/** Construit le contenu CSV complet (BOM + lignes). */
export function genererCsv(enTetes: string[], lignes: (string | number)[][]): string {
  const lignesTexte = [
    enTetes.map(champCsv).join(SEPARATEUR),
    ...lignes.map((ligne) => ligne.map(champCsv).join(SEPARATEUR)),
  ];
  return BOM + lignesTexte.join(FIN_LIGNE) + (lignesTexte.length > 0 ? FIN_LIGNE : '');
}
