import { useQuery } from '@tanstack/react-query';

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
  created_at: string;
  boutique_nom: string;
  produit_nom: string;
  type: 'production' | 'sortie' | 'ajustement';
  quantite: number;
  saisi_par_nom: string;
};

export type LignePertePeriode = {
  id: string;
  jour: string;
  produit_id: string;
  produit_nom: string;
  boutique_id: string;
  quantite: number;
  motif: 'brule' | 'tombe' | 'rate' | 'autre';
  dans_le_stock: boolean;
  saisi_par: string;
  saisi_par_nom: string;
};

export type LigneExportPerte = {
  jour: string;
  boutique_nom: string;
  produit_nom: string;
  quantite: number;
  motif: 'brule' | 'tombe' | 'rate' | 'autre';
  dans_le_stock: boolean;
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
    created_at: string;
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
        .select('jour, created_at, produit_id, type, quantite, saisi_par')
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
      created_at: m.created_at,
      boutique_nom: boutiqueProduit ? (nomsBoutiques.get(boutiqueProduit) ?? '—') : '—',
      produit_nom: nomsProduits.get(m.produit_id) ?? '—',
      type: m.type,
      quantite: m.quantite,
      saisi_par_nom: nomsProfils.get(m.saisi_par) ?? '—',
    };
  });
}

/** Nom de l’entreprise du profil connecté (pour le titre des exports). */
export function useNomEntreprise(entrepriseId: string | null) {
  return useQuery({
    queryKey: ['entreprise', 'nom', entrepriseId],
    enabled: Boolean(entrepriseId),
    queryFn: async (): Promise<string> => {
      const { data, error } = await db()
        .from('entreprises')
        .select('nom')
        .eq('id', entrepriseId as string)
        .maybeSingle();
      if (error) throw error;
      return data?.nom ?? 'Entreprise';
    },
  });
}

export function usePertesPeriode(
  debut: string | null,
  fin: string | null,
  boutiqueId: string | null,
) {
  return useQuery({
    queryKey: ['ca', 'pertes', debut, fin, boutiqueId],
    enabled: Boolean(debut && fin),
    queryFn: async (): Promise<LignePertePeriode[]> => lirePertesPeriode(debut as string, fin as string, boutiqueId),
  });
}

async function lirePertesPeriode(
  debut: string,
  fin: string,
  boutiqueId: string | null,
): Promise<LignePertePeriode[]> {
  type ProduitExport = { id: string; nom: string; boutique_id: string };
  type PerteBrute = {
    id: string;
    jour: string;
    produit_id: string;
    quantite: number;
    motif: string;
    dans_le_stock: boolean;
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

  const pertes: PerteBrute[] = [];
  for (const paquet of paquetsDe(ids)) {
    const page = await lireToutesLesLignes<PerteBrute>(() =>
      db()
        .from('pertes_production')
        .select('id, jour, produit_id, quantite, motif, dans_le_stock, saisi_par')
        .in('produit_id', paquet)
        .gte('jour', debut)
        .lte('jour', fin)
        .order('jour')
        .order('id'),
    );
    pertes.push(...page);
  }

  const { data: profils, error: errP } = await db()
    .from('profils')
    .select('id, prenom, nom, archive_le');
  if (errP) throw errP;
  const nomsProfils = new Map(
    (profils ?? []).map((p) => [p.id, nomProfil(p.prenom, p.nom, p.archive_le)]),
  );

  return pertes.map((p) => ({
    id: p.id,
    jour: p.jour,
    produit_id: p.produit_id,
    produit_nom: nomsProduits.get(p.produit_id) ?? '—',
    boutique_id: boutiqueParProduit.get(p.produit_id) ?? '',
    quantite: p.quantite,
    motif: p.motif as LignePertePeriode['motif'],
    dans_le_stock: p.dans_le_stock,
    saisi_par: p.saisi_par,
    saisi_par_nom: nomsProfils.get(p.saisi_par) ?? '—',
  }));
}

export async function lireExportPertes(
  debut: string,
  fin: string,
  boutiqueId: string | null,
): Promise<LigneExportPerte[]> {
  const lignes = await lirePertesPeriode(debut, fin, boutiqueId);

  const { data: boutiques, error: errB } = await db().from('boutiques').select('id, nom');
  if (errB) throw errB;
  const nomsBoutiques = new Map((boutiques ?? []).map((b) => [b.id, b.nom]));

  return lignes.map((l) => ({
    jour: l.jour,
    boutique_nom: l.boutique_id ? (nomsBoutiques.get(l.boutique_id) ?? '—') : '—',
    produit_nom: l.produit_nom,
    quantite: l.quantite,
    motif: l.motif,
    dans_le_stock: l.dans_le_stock,
    saisi_par_nom: l.saisi_par_nom,
  }));
}

