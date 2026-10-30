// Mise en forme pure des exports admin (Excel / PDF).
// Les calculs métier restent dans la base ; ici on trie, libelle et formate.

const FUSEAU = 'Europe/Paris';

export type TypeMouvementExport = 'production' | 'sortie' | 'ajustement';
export type MotifPerteExport = 'brule' | 'tombe' | 'rate' | 'autre';

export type LigneVenteBrute = {
  jour: string;
  boutique_nom: string;
  produit_nom: string;
  fabricant_nom: string;
  vendu: number;
  jete: number;
  reste: number;
  prix_unitaire_centimes: number;
  ca_centimes: number;
};

export type LigneVenteExport = {
  date: string;
  boutique: string;
  produit: string;
  patissier: string;
  prixUnitaire: number;
  vendus: number;
  jetes: number;
  restes: number;
  ca: number;
};

export type LigneMouvementBrute = {
  jour: string;
  created_at: string;
  boutique_nom: string;
  produit_nom: string;
  type: TypeMouvementExport;
  quantite: number;
  saisi_par_nom: string;
};

export type LigneMouvementExport = {
  date: string;
  heure: string;
  boutique: string;
  produit: string;
  type: string;
  quantite: number;
  saisiPar: string;
};

export type LigneCaBrute = {
  jour: string | null;
  fabricant_id: string | null;
  fabricant_nom: string;
  boutique_id: string | null;
  vendu: number | null;
  jete: number | null;
  ca_centimes: number | null;
};

export type LigneCaEmployeExport = {
  date: string;
  employe: string;
  boutique: string;
  vendus: number;
  jetes: number;
  ca: number;
};

export type LignePerteBrute = {
  jour: string;
  boutique_nom: string;
  produit_nom: string;
  quantite: number;
  motif: MotifPerteExport;
  dans_le_stock: boolean;
  saisi_par_nom: string;
};

export type LignePerteExport = {
  date: string;
  boutique: string;
  produit: string;
  quantite: number;
  motif: string;
  retireeDuStock: string;
  declareePar: string;
};

export type TotauxNombres = Record<string, number>;

export type TableauExport = {
  titre: string;
  enTetes: string[];
  /** Indices des colonnes monétaires (euros). */
  colonnesMontant: number[];
  /** Indices des colonnes numériques (entiers ou montants). */
  colonnesNombre: number[];
  paysage: boolean;
  lignes: (string | number)[][];
  /** Une ou plusieurs lignes de total (gras dans Excel / PDF). */
  totaux: (string | number | null)[][];
};

/** '2026-10-28' → '28/10/2026' */
export function dateExport(jour: string): string {
  const [annee, mois, jourNum] = jour.split('-');
  if (!annee || !mois || !jourNum) return jour;
  return `${jourNum}/${mois}/${annee}`;
}

/** '2026-10-28' → '28-10-2026' (nom de fichier). */
export function dateNomFichier(jour: string): string {
  const [annee, mois, jourNum] = jour.split('-');
  if (!annee || !mois || !jourNum) return jour;
  return `${jourNum}-${mois}-${annee}`;
}

/** Instant ISO → 'HH:MM' en heure de Paris. */
export function heureExport(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('fr-FR', {
    timeZone: FUSEAU,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Centimes → euros (nombre, 2 décimales). */
export function centimesVersEuros(centimes: number): number {
  return Math.round(centimes) / 100;
}

export function libelleTypeMouvement(type: TypeMouvementExport): string {
  if (type === 'production') return 'Production';
  if (type === 'sortie') return 'Sortie';
  return 'Correction';
}

export function libelleMotifPerte(motif: MotifPerteExport): string {
  if (motif === 'brule') return 'Brûlé';
  if (motif === 'tombe') return 'Tombé ou abîmé';
  if (motif === 'rate') return 'Raté';
  return 'Autre';
}

/** Production / sortie : toujours positif. Correction : signe conservé. */
export function quantiteMouvementExport(
  type: TypeMouvementExport,
  quantite: number,
): number {
  if (type === 'ajustement') return quantite;
  return Math.abs(quantite);
}

export function echapperHtml(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function titreRapport(
  libelle: string,
  debut: string,
  fin: string,
  contexte: string,
): string {
  return `${libelle} du ${dateExport(debut)} au ${dateExport(fin)} — ${contexte}`;
}

export function nomFichierExport(
  libelle: string,
  debut: string,
  fin: string,
  extension: 'xlsx' | 'pdf',
): string {
  return `ProdTrack - ${libelle} - ${dateNomFichier(debut)} au ${dateNomFichier(fin)}.${extension}`;
}

function comparerFr(a: string, b: string): number {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' });
}

function comparerDatePuis(
  dateA: string,
  dateB: string,
  suite: () => number,
): number {
  const cmp = dateA.localeCompare(dateB);
  return cmp !== 0 ? cmp : suite();
}

export function preparerVentes(
  brutes: LigneVenteBrute[],
  debut: string,
  fin: string,
  contexte: string,
): { lignes: LigneVenteExport[]; tableau: TableauExport } {
  const lignes = [...brutes]
    .sort((a, b) =>
      comparerDatePuis(a.jour, b.jour, () =>
        comparerFr(a.boutique_nom, b.boutique_nom) ||
        comparerFr(a.produit_nom, b.produit_nom),
      ),
    )
    .map((l) => ({
      date: dateExport(l.jour),
      boutique: l.boutique_nom,
      produit: l.produit_nom,
      patissier: l.fabricant_nom,
      prixUnitaire: centimesVersEuros(l.prix_unitaire_centimes),
      vendus: l.vendu,
      jetes: l.jete,
      restes: l.reste,
      ca: centimesVersEuros(l.ca_centimes),
    }));

  const totaux = {
    vendus: 0,
    jetes: 0,
    restes: 0,
    ca: 0,
  };
  for (const l of lignes) {
    totaux.vendus += l.vendus;
    totaux.jetes += l.jetes;
    totaux.restes += l.restes;
    totaux.ca += l.ca;
  }
  // Arrondi final du CA pour éviter les artefacts flottants
  totaux.ca = Math.round(totaux.ca * 100) / 100;

  const enTetes = [
    'Date',
    'Boutique',
    'Produit',
    'Pâtissier',
    'Prix unitaire',
    'Vendus',
    'Jetés',
    'Restes',
    'CA',
  ];

  return {
    lignes,
    tableau: {
      titre: titreRapport('Ventes', debut, fin, contexte),
      enTetes,
      colonnesMontant: [4, 8],
      colonnesNombre: [4, 5, 6, 7, 8],
      paysage: true,
      lignes: lignes.map((l) => [
        l.date,
        l.boutique,
        l.produit,
        l.patissier,
        l.prixUnitaire,
        l.vendus,
        l.jetes,
        l.restes,
        l.ca,
      ]),
      totaux: [
        [
          'Total',
          null,
          null,
          null,
          null,
          totaux.vendus,
          totaux.jetes,
          totaux.restes,
          totaux.ca,
        ],
      ],
    },
  };
}

export function preparerMouvements(
  brutes: LigneMouvementBrute[],
  debut: string,
  fin: string,
  contexte: string,
): { lignes: LigneMouvementExport[]; tableau: TableauExport } {
  const lignes = [...brutes]
    .sort((a, b) =>
      comparerDatePuis(a.jour, b.jour, () =>
        comparerFr(a.boutique_nom, b.boutique_nom) ||
        comparerFr(a.produit_nom, b.produit_nom) ||
        a.created_at.localeCompare(b.created_at),
      ),
    )
    .map((l) => ({
      date: dateExport(l.jour),
      heure: heureExport(l.created_at),
      boutique: l.boutique_nom,
      produit: l.produit_nom,
      type: libelleTypeMouvement(l.type),
      quantite: quantiteMouvementExport(l.type, l.quantite),
      saisiPar: l.saisi_par_nom,
    }));

  let totalProduction = 0;
  let totalSorties = 0;
  let totalCorrections = 0;
  for (const l of lignes) {
    if (l.type === 'Production') totalProduction += l.quantite;
    else if (l.type === 'Sortie') totalSorties += l.quantite;
    else totalCorrections += l.quantite;
  }

  return {
    lignes,
    tableau: {
      titre: titreRapport('Mouvements de stock', debut, fin, contexte),
      enTetes: [
        'Date',
        'Heure',
        'Boutique',
        'Produit',
        'Type',
        'Quantité',
        'Saisi par',
      ],
      colonnesMontant: [],
      colonnesNombre: [5],
      paysage: true,
      lignes: lignes.map((l) => [
        l.date,
        l.heure,
        l.boutique,
        l.produit,
        l.type,
        l.quantite,
        l.saisiPar,
      ]),
      totaux: [
        ['Total production', null, null, null, null, totalProduction, null],
        ['Total sorties', null, null, null, null, totalSorties, null],
        ['Total corrections', null, null, null, null, totalCorrections, null],
      ],
    },
  };
}

export function preparerCaEmployes(
  brutes: LigneCaBrute[],
  nomBoutique: (boutiqueId: string | null) => string,
  debut: string,
  fin: string,
  contexte: string,
): { lignes: LigneCaEmployeExport[]; tableau: TableauExport } {
  const map = new Map<
    string,
    {
      jour: string;
      employe: string;
      boutique: string;
      vendus: number;
      jetes: number;
      caCentimes: number;
    }
  >();

  for (const l of brutes) {
    if (!l.jour || !l.fabricant_id) continue;
    const boutique = nomBoutique(l.boutique_id);
    const cle = `${l.jour}|${l.fabricant_id}|${l.boutique_id ?? ''}`;
    const existant = map.get(cle) ?? {
      jour: l.jour,
      employe: l.fabricant_nom,
      boutique,
      vendus: 0,
      jetes: 0,
      caCentimes: 0,
    };
    existant.vendus += l.vendu ?? 0;
    existant.jetes += l.jete ?? 0;
    existant.caCentimes += l.ca_centimes ?? 0;
    map.set(cle, existant);
  }

  const lignes = [...map.values()]
    .sort((a, b) =>
      comparerDatePuis(a.jour, b.jour, () =>
        comparerFr(a.boutique, b.boutique) || comparerFr(a.employe, b.employe),
      ),
    )
    .map((l) => ({
      date: dateExport(l.jour),
      employe: l.employe,
      boutique: l.boutique,
      vendus: l.vendus,
      jetes: l.jetes,
      ca: centimesVersEuros(l.caCentimes),
    }));

  const totaux = { vendus: 0, jetes: 0, ca: 0 };
  for (const l of lignes) {
    totaux.vendus += l.vendus;
    totaux.jetes += l.jetes;
    totaux.ca += l.ca;
  }
  totaux.ca = Math.round(totaux.ca * 100) / 100;

  return {
    lignes,
    tableau: {
      titre: titreRapport('CA par employé et par jour', debut, fin, contexte),
      enTetes: ['Date', 'Employé', 'Boutique', 'Vendus', 'Jetés', 'CA'],
      colonnesMontant: [5],
      colonnesNombre: [3, 4, 5],
      paysage: false,
      lignes: lignes.map((l) => [
        l.date,
        l.employe,
        l.boutique,
        l.vendus,
        l.jetes,
        l.ca,
      ]),
      totaux: [['Total', null, null, totaux.vendus, totaux.jetes, totaux.ca]],
    },
  };
}

export function preparerPertes(
  brutes: LignePerteBrute[],
  debut: string,
  fin: string,
  contexte: string,
): { lignes: LignePerteExport[]; tableau: TableauExport } {
  const lignes = [...brutes]
    .sort((a, b) =>
      comparerDatePuis(a.jour, b.jour, () =>
        comparerFr(a.boutique_nom, b.boutique_nom) ||
        comparerFr(a.produit_nom, b.produit_nom),
      ),
    )
    .map((l) => ({
      date: dateExport(l.jour),
      boutique: l.boutique_nom,
      produit: l.produit_nom,
      quantite: l.quantite,
      motif: libelleMotifPerte(l.motif),
      retireeDuStock: l.dans_le_stock ? 'Oui' : 'Non',
      declareePar: l.saisi_par_nom,
    }));

  let totalQuantite = 0;
  for (const l of lignes) totalQuantite += l.quantite;

  return {
    lignes,
    tableau: {
      titre: titreRapport('Pertes en production', debut, fin, contexte),
      enTetes: [
        'Date',
        'Boutique',
        'Produit',
        'Quantité',
        'Motif',
        'Retirée du stock',
        'Déclarée par',
      ],
      colonnesMontant: [],
      colonnesNombre: [3],
      paysage: false,
      lignes: lignes.map((l) => [
        l.date,
        l.boutique,
        l.produit,
        l.quantite,
        l.motif,
        l.retireeDuStock,
        l.declareePar,
      ]),
      totaux: [['Total', null, null, totalQuantite, null, null, null]],
    },
  };
}

function formatNombrePdf(valeur: number, montant: boolean): string {
  if (montant) {
    return valeur.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €';
  }
  return valeur.toLocaleString('fr-FR');
}

/** HTML d’un rapport PDF (A4, en-têtes gris, total en gras). */
export function genererHtmlRapport(
  tableau: TableauExport,
  dateGeneration: Date = new Date(),
  /** Nom du fichier (.pdf) : sert de <title> (nom proposé à l’enregistrement PDF). */
  nomFichier?: string,
): string {
  const generee = dateGeneration.toLocaleString('fr-FR', {
    timeZone: FUSEAU,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const titreDocument = nomFichier
    ? nomFichier.replace(/\.pdf$/i, '')
    : tableau.titre;
  const pageSize = tableau.paysage ? 'A4 landscape' : 'A4';

  const thead = tableau.enTetes
    .map(
      (h, i) =>
        `<th style="text-align:${tableau.colonnesNombre.includes(i) ? 'right' : 'left'}">${echapperHtml(h)}</th>`,
    )
    .join('');

  const corps = tableau.lignes
    .map((ligne) => {
      const tds = ligne
        .map((cellule, i) => {
          const align = tableau.colonnesNombre.includes(i) ? 'right' : 'left';
          let texte: string;
          if (typeof cellule === 'number') {
            texte = formatNombrePdf(cellule, tableau.colonnesMontant.includes(i));
          } else {
            texte = echapperHtml(cellule);
          }
          return `<td style="text-align:${align}">${texte}</td>`;
        })
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  const lignesTotaux = tableau.totaux
    .map((ligneTotaux, indexLigne) => {
      const totalCells = ligneTotaux
        .map((cellule, i) => {
          const align = tableau.colonnesNombre.includes(i) ? 'right' : 'left';
          if (cellule === null) return `<td></td>`;
          if (typeof cellule === 'number') {
            return `<td style="text-align:${align}">${formatNombrePdf(cellule, tableau.colonnesMontant.includes(i))}</td>`;
          }
          return `<td style="text-align:${align}">${echapperHtml(cellule)}</td>`;
        })
        .join('');
      const classe = indexLigne === 0 ? 'total' : 'total total-suite';
      return `<tr class="${classe}">${totalCells}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${echapperHtml(titreDocument)}</title>
  <style>
    @page { size: ${pageSize}; margin: 12mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #1D1D1F;
      margin: 0;
    }
    .marque { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
    .titre { font-size: 13px; font-weight: 600; margin: 0 0 4px; }
    .meta { color: #6E6E73; margin: 0 0 16px; }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: #E5E5EA;
      font-weight: 700;
      padding: 6px 8px;
      border-bottom: 1px solid #C7C7CC;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #E5E5EA;
      vertical-align: top;
    }
    tr.total td {
      font-weight: 700;
      border-top: 2px solid #1D1D1F;
      border-bottom: none;
      padding-top: 8px;
    }
    tr.total-suite td {
      border-top: none;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <p class="marque">ProdTrack</p>
  <p class="titre">${echapperHtml(tableau.titre)}</p>
  <p class="meta">Généré le ${echapperHtml(generee)}</p>
  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>
      ${corps}
      ${lignesTotaux}
    </tbody>
  </table>
</body>
</html>`;
}
