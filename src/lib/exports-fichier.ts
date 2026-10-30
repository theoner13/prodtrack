import ExcelJS from 'exceljs';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { TableauExport } from '@/lib/exports';

const FORMAT_EURO = '#,##0.00 "€"';
const FOND_ENTETE = 'FFE5E5EA';

/** Construit un classeur Excel (.xlsx) à partir d’un tableau déjà mis en forme. */
export async function genererXlsx(tableau: TableauExport): Promise<Uint8Array> {
  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'ProdTrack';
  const feuille = classeur.addWorksheet('Export', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  feuille.addRow([tableau.titre]);
  feuille.getRow(1).font = { bold: true, size: 12 };
  feuille.addRow([]);

  const ligneEntetes = feuille.addRow(tableau.enTetes);
  ligneEntetes.font = { bold: true };
  ligneEntetes.eachCell((cellule) => {
    cellule.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: FOND_ENTETE },
    };
  });

  for (const ligne of tableau.lignes) {
    const ajoutee = feuille.addRow(ligne);
    for (const index of tableau.colonnesMontant) {
      const cellule = ajoutee.getCell(index + 1);
      if (typeof cellule.value === 'number') {
        cellule.numFmt = FORMAT_EURO;
      }
    }
  }

  for (const ligneTotaux of tableau.totaux) {
    const ligneTotal = feuille.addRow(
      ligneTotaux.map((v) => (v === null ? '' : v)),
    );
    ligneTotal.font = { bold: true };
    for (const index of tableau.colonnesMontant) {
      const cellule = ligneTotal.getCell(index + 1);
      if (typeof cellule.value === 'number') {
        cellule.numFmt = FORMAT_EURO;
      }
    }
  }

  // Largeurs adaptées au contenu (bornées)
  const largeurs = tableau.enTetes.map((entete, col) => {
    let max = entete.length;
    for (const ligne of tableau.lignes) {
      const v = ligne[col];
      const len = v === undefined || v === null ? 0 : String(v).length;
      if (len > max) max = len;
    }
    for (const ligneTotaux of tableau.totaux) {
      const total = ligneTotaux[col];
      if (total !== null && total !== undefined) {
        max = Math.max(max, String(total).length);
      }
    }
    max = Math.max(max, tableau.titre.length / tableau.enTetes.length);
    return Math.min(36, Math.max(10, max + 2));
  });
  largeurs.forEach((w, i) => {
    feuille.getColumn(i + 1).width = w;
  });

  const buffer = await classeur.xlsx.writeBuffer();
  if (buffer instanceof ArrayBuffer) {
    return new Uint8Array(buffer);
  }
  // ExcelJS peut renvoyer un Buffer Node (ArrayLike) ou un Uint8Array.
  return Uint8Array.from(buffer as ArrayLike<number>);
}

async function telechargerOctets(
  nomFichier: string,
  octets: Uint8Array,
  mimeType: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    const copie = octets.buffer.slice(
      octets.byteOffset,
      octets.byteOffset + octets.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([copie], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const fichier = new File(Paths.cache, nomFichier);
  if (fichier.exists) {
    fichier.delete();
  }
  fichier.create();
  await fichier.write(octets);
  const partageable = await Sharing.isAvailableAsync();
  if (!partageable) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(fichier.uri, {
    mimeType,
    dialogTitle: nomFichier,
  });
}

export async function telechargerXlsx(
  nomFichier: string,
  tableau: TableauExport,
): Promise<void> {
  const octets = await genererXlsx(tableau);
  await telechargerOctets(
    nomFichier,
    octets,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}

/**
 * Sur le web, expo-print ignore le HTML et appelle window.print() sur l’appli.
 * On imprime donc le rapport dans un iframe invisible.
 */
function imprimerHtmlWeb(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.left = '0';
    iframe.style.top = '0';

    let termine = false;
    let impressionLancee = false;
    const retirer = () => {
      if (termine) return;
      termine = true;
      window.clearTimeout(secours);
      iframe.remove();
      resolve();
    };
    const secours = window.setTimeout(retirer, 60_000);

    iframe.onload = () => {
      if (impressionLancee) return;
      impressionLancee = true;
      try {
        const fenetre = iframe.contentWindow;
        if (!fenetre) {
          throw new Error("Impossible d'ouvrir l'impression.");
        }
        fenetre.addEventListener('afterprint', retirer);
        fenetre.focus();
        fenetre.print();
      } catch (erreur) {
        window.clearTimeout(secours);
        iframe.remove();
        reject(erreur);
      }
    };

    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}

/** Web : dialogue d’impression du rapport (Enregistrer en PDF). Natif : fichier + partage. */
export async function telechargerPdf(
  nomFichier: string,
  html: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    await imprimerHtmlWeb(html);
    return;
  }

  const resultat = await Print.printToFileAsync({ html });
  const partageable = await Sharing.isAvailableAsync();
  if (!partageable) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(resultat.uri, {
    mimeType: 'application/pdf',
    dialogTitle: nomFichier,
    UTI: 'com.adobe.pdf',
  });
}
