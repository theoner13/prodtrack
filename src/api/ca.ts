import { useQuery } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { lireToutesLesLignes, paquetsDe } from '@/api/pagination';
import { supabase } from '@/lib/supabase';
import type { CaJournalier } from '@/types/database';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

export type LigneCaEnrichie = CaJournalier & {
  fabricant_nom: string;
};

export type PatissierActif = {
  id: string;
  prenom: string;
  nom: string;
  boutique_id: string | null;
};

export type LigneExportVente = {
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

export type LigneExportMouvement = {
  jour: string;
  boutique_nom: string;
  produit_nom: string;
  type: 'production' | 'sortie' | 'ajustement';
  quantite: number;
  saisi_par_nom: string;
};

function nomProfil(prenom: string, nom: string, archiveLe: string | null): string {
  const base = `${prenom} ${nom}`.trim();
  return archiveLe ? `${base} (archivé)` : base;
}

export function useCaJournalier(
  debut: string | null,
  fin: string | null,
  boutiqueId: string | null,
) {
  return useQuery({
    queryKey: ['ca', 'journalier', debut, fin, boutiqueId],
    enabled: Boolean(debut && fin),
    queryFn: async (): Promise<LigneCaEnrichie[]> => {
      const lignes = await lireToutesLesLignes<CaJournalier>(() => {
        let requete = db()
          .from('ca_journalier')
          .select('*')
          .gte('jour', debut as string)
          .lte('jour', fin as string)
          .order('jour')
          .order('produit_id');
        if (boutiqueId) {
          requete = requete.eq('boutique_id', boutiqueId);
        }
        return requete;
      });

      const { data: profils, error: erreurProfils } = await db()
        .from('profils')
        .select('id, prenom, nom, archive_le');
      if (erreurProfils) throw erreurProfils;

      const noms = new Map(
        (profils ?? []).map((p) => [p.id, nomProfil(p.prenom, p.nom, p.archive_le)]),
      );

      return lignes.map((ligne) => ({
        ...ligne,
        fabricant_nom: ligne.fabricant_id
          ? (noms.get(ligne.fabricant_id) ?? 'Employé inconnu')
          : '—',
      }));
    },
  });
}

/** Pâtissiers actifs de la boutique (ou de toutes) pour afficher aussi ceux à 0 €. */
export function usePatissiersPourCa(boutiqueId: string | null) {
  return useQuery({
    queryKey: ['ca', 'patissiers', boutiqueId],
    queryFn: async (): Promise<PatissierActif[]> => {
      let requete = db()
        .from('profils')
        .select('id, prenom, nom, boutique_id')
        .eq('role', 'patissier')
        .is('archive_le', null)
        .order('prenom');
      if (boutiqueId) {
        requete = requete.eq('boutique_id', boutiqueId);
      }
      const { data, error } = await requete;
      if (error) throw error;
      return data;
    },
  });
}

export async function lireExportVentes(
  debut: string,
  fin: string,
  boutiqueId: string | null,
): Promise<LigneExportVente[]> {
  const lignes = await lireToutesLesLignes<CaJournalier>(() => {
    let requete = db()
      .from('ca_journalier')
      .select('*')
      .gte('jour', debut)
      .lte('jour', fin)
      .order('jour')
      .order('produit_id');
    if (boutiqueId) {
      requete = requete.eq('boutique_id', boutiqueId);
    }
    return requete;
  });

  const { data: boutiques, error: errB } = await db().from('boutiques').select('id, nom');
  if (errB) throw errB;
  const nomsBoutiques = new Map((boutiques ?? []).map((b) => [b.id, b.nom]));

  const { data: profils, error: errP } = await db()
    .from('profils')
    .select('id, prenom, nom, archive_le');
  if (errP) throw errP;
  const nomsProfils = new Map(
    (profils ?? []).map((p) => [p.id, nomProfil(p.prenom, p.nom, p.archive_le)]),
  );

  return lignes.map((ligne) => ({
    jour: ligne.jour ?? '',
    boutique_nom: ligne.boutique_id ? (nomsBoutiques.get(ligne.boutique_id) ?? '—') : '—',
    produit_nom: ligne.produit_nom ?? '—',
    fabricant_nom: ligne.fabricant_id
      ? (nomsProfils.get(ligne.fabricant_id) ?? '—')
      : '—',
    vendu: ligne.vendu ?? 0,
    jete: ligne.jete ?? 0,
    reste: ligne.reste ?? 0,
    prix_unitaire_centimes: ligne.prix_unitaire_centimes ?? 0,
    ca_centimes: ligne.ca_centimes ?? 0,
  }));
}

export async function lireExportMouvements(
  debut: string,
  fin: string,
  boutiqueId: string | null,
): Promise<LigneExportMouvement[]> {
  type ProduitExport = { id: string; nom: string; boutique_id: string };
  type MouvementExport = {
    jour: string;
    produit_id: string;
    type: 'production' | 'sortie' | 'ajustement';
    quantite: number;
    saisi_par: string;
  };

  const produits = await lireToutesLesLignes<ProduitExport>(() => {
    let requete = db().from('produits').select('id, nom, boutique_id').order('id');
    if (boutiqueId) {
      requete = requete.eq('boutique_id', boutiqueId);
    }
    return requete;
  });
  if (produits.length === 0) return [];

  const ids = produits.map((p) => p.id);
  const nomsProduits = new Map(produits.map((p) => [p.id, p.nom]));
  const boutiqueParProduit = new Map(produits.map((p) => [p.id, p.boutique_id]));

  const { data: boutiques, error: errB } = await db().from('boutiques').select('id, nom');
  if (errB) throw errB;
  const nomsBoutiques = new Map((boutiques ?? []).map((b) => [b.id, b.nom]));

  const mouvements: MouvementExport[] = [];
  for (const paquet of paquetsDe(ids)) {
    const page = await lireToutesLesLignes<MouvementExport>(() =>
      db()
        .from('mouvements_stock')
        .select('jour, produit_id, type, quantite, saisi_par')
        .in('produit_id', paquet)
        .gte('jour', debut)
        .lte('jour', fin)
        .order('jour')
        .order('id'),
    );
    mouvements.push(...page);
  }

  const { data: profils, error: errP } = await db()
    .from('profils')
    .select('id, prenom, nom, archive_le');
  if (errP) throw errP;
  const nomsProfils = new Map(
    (profils ?? []).map((p) => [p.id, nomProfil(p.prenom, p.nom, p.archive_le)]),
  );

  return mouvements.map((m) => {
    const boutiqueProduit = boutiqueParProduit.get(m.produit_id);
    return {
      jour: m.jour,
      boutique_nom: boutiqueProduit ? (nomsBoutiques.get(boutiqueProduit) ?? '—') : '—',
      produit_nom: nomsProduits.get(m.produit_id) ?? '—',
      type: m.type,
      quantite: m.quantite,
      saisi_par_nom: nomsProfils.get(m.saisi_par) ?? '—',
    };
  });
}

/** Web : téléchargement. Téléphone : écriture cache + partage. */
export async function telechargerCsv(nomFichier: string, contenu: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8' });
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
  await fichier.write(contenu);
  const partageable = await Sharing.isAvailableAsync();
  if (!partageable) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(fichier.uri, {
    mimeType: 'text/csv',
    dialogTitle: nomFichier,
    UTI: 'public.comma-separated-values-text',
  });
}
