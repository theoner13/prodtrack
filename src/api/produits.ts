import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { messageErreur } from '@/auth/erreurs';
import { supabase } from '@/lib/supabase';
import type { Produit } from '@/types/database';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

export type ProduitListe = Produit & { fabricantNom: string };

export type LigneRecette = {
  ingredient: string;
  quantite: number;
  unite: string;
};

export type ProduitImpose = {
  nom: string;
  prixCentimes: number;
  conservation: 'frais' | 'surgele';
  dureeJours: number;
  seuilMin: number;
  lignes: LigneRecette[];
};

export type CibleImposee = {
  boutiqueId: string;
  fabricantId: string | null;
  nomBoutique: string;
};

export function useProduits(boutiqueId: string | null) {
  return useQuery({
    queryKey: ['produits', boutiqueId],
    enabled: Boolean(boutiqueId),
    queryFn: async (): Promise<ProduitListe[]> => {
      const base = db();
      const { data: produits, error } = await base
        .from('produits')
        .select('*')
        .eq('boutique_id', boutiqueId ?? '')
        .is('archive_le', null)
        .order('nom');
      if (error) throw error;

      const ids = [
        ...new Set(
          produits
            .map((produit) => produit.fabricant_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const noms = new Map<string, string>();
      if (ids.length > 0) {
        const { data: profils, error: erreurProfils } = await base
          .from('profils')
          .select('id, prenom, nom')
          .in('id', ids);
        if (erreurProfils) throw erreurProfils;
        for (const profil of profils) {
          noms.set(profil.id, `${profil.prenom} ${profil.nom}`);
        }
      }

      return produits.map((produit) => ({
        ...produit,
        fabricantNom: produit.fabricant_id
          ? (noms.get(produit.fabricant_id) ?? 'Fabricant inconnu')
          : 'Sans pâtissier',
      }));
    },
  });
}

export function useModifierProduit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modif: { id: string; prixCentimes?: number; fabricantId?: string }) => {
      const patch: { prix_centimes?: number; fabricant_id?: string } = {};
      if (modif.prixCentimes != null) patch.prix_centimes = modif.prixCentimes;
      if (modif.fabricantId) patch.fabricant_id = modif.fabricantId;
      const { error } = await db().from('produits').update(patch).eq('id', modif.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produits'] }),
  });
}

async function creerCopie(produit: ProduitImpose, cible: CibleImposee): Promise<void> {
  const { data, error } = await db()
    .from('produits')
    .insert({
      boutique_id: cible.boutiqueId,
      fabricant_id: cible.fabricantId,
      nom: produit.nom.trim(),
      prix_centimes: produit.prixCentimes,
      conservation: produit.conservation,
      duree_conservation_jours: produit.dureeJours,
      seuil_min: produit.seuilMin,
      impose_par_admin: true,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (produit.lignes.length === 0) return;
  const { error: erreurRecette } = await db()
    .from('ingredients_recette')
    .insert(
      produit.lignes.map((ligne, index) => ({
        produit_id: data.id,
        ingredient: ligne.ingredient.trim(),
        quantite: ligne.quantite,
        unite: ligne.unite,
        ordre: index,
      })),
    );
  if (erreurRecette) throw erreurRecette;
}

export function useMesProduits(userId: string | null) {
  return useQuery({
    queryKey: ['produits', 'moi', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const base = db();
      const { data, error } = await base
        .from('produits')
        .select('*')
        .eq('fabricant_id', userId ?? '')
        .is('archive_le', null)
        .order('nom');
      if (error) throw error;
      const { count, error: erreurCompte } = await base
        .from('produits')
        .select('id', { count: 'exact', head: true })
        .eq('fabricant_id', userId ?? '');
      if (erreurCompte) throw erreurCompte;
      return { produits: data, dejaEuUnProduit: (count ?? 0) > 0 };
    },
  });
}

/** Produits imposés sans fabricant, à prendre par un pâtissier de la boutique. */
export function useProduitsAPrendre(boutiqueId: string | null) {
  return useQuery({
    queryKey: ['produits', 'a-prendre', boutiqueId],
    enabled: Boolean(boutiqueId),
    queryFn: async (): Promise<Produit[]> => {
      const { data, error } = await db()
        .from('produits')
        .select('*')
        .eq('boutique_id', boutiqueId ?? '')
        .eq('impose_par_admin', true)
        .is('fabricant_id', null)
        .is('archive_le', null)
        .order('nom');
      if (error) throw error;
      return data;
    },
  });
}

export function usePrendreProduit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (produitId: string) => {
      const { error } = await db().rpc('prendre_produit', { p_produit: produitId });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['produits'] });
      void queryClient.invalidateQueries({ queryKey: ['previsions'] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}

export function useFicheProduit(id: string | null) {
  return useQuery({
    queryKey: ['produits', 'fiche', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const base = db();
      const { data: produit, error } = await base.from('produits').select('*').eq('id', id ?? '').single();
      if (error) throw error;
      const { data: lignes, error: erreurLignes } = await base
        .from('ingredients_recette')
        .select('*')
        .eq('produit_id', produit.id)
        .order('ordre');
      if (erreurLignes) throw erreurLignes;
      return { produit, lignes };
    },
  });
}

export type FicheSaisie = {
  id?: string;
  boutiqueId: string;
  fabricantId: string;
  nom: string;
  prixCentimes: number;
  photoUrl: string | null;
  conservation: 'frais' | 'surgele';
  dureeJours: number;
  seuilMin: number;
  intermediaire: boolean;
  impose: boolean;
  lignes: LigneRecette[];
};

async function remplacerRecette(produitId: string, lignes: LigneRecette[]): Promise<void> {
  const { error } = await db().from('ingredients_recette').delete().eq('produit_id', produitId);
  if (error) throw error;
  if (lignes.length === 0) return;
  const { error: erreurInsert } = await db()
    .from('ingredients_recette')
    .insert(
      lignes.map((ligne, index) => ({
        produit_id: produitId,
        ingredient: ligne.ingredient.trim(),
        quantite: ligne.quantite,
        unite: ligne.unite,
        ordre: index,
      })),
    );
  if (erreurInsert) throw erreurInsert;
}

export function useEnregistrerMonProduit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saisie: FicheSaisie) => {
      const base = db();
      if (saisie.id) {
        const patch: {
          prix_centimes: number;
          photo_url: string | null;
          duree_conservation_jours: number;
          seuil_min: number;
          nom?: string;
          conservation?: 'frais' | 'surgele';
          intermediaire?: boolean;
        } = {
          prix_centimes: saisie.intermediaire ? 0 : saisie.prixCentimes,
          photo_url: saisie.photoUrl,
          duree_conservation_jours: saisie.dureeJours,
          seuil_min: saisie.seuilMin,
        };
        if (!saisie.impose) {
          patch.nom = saisie.nom.trim();
          patch.conservation = saisie.conservation;
          patch.intermediaire = saisie.intermediaire;
        }
        const { error } = await base.from('produits').update(patch).eq('id', saisie.id);
        if (error) throw error;
        if (!saisie.impose) await remplacerRecette(saisie.id, saisie.lignes);
        return saisie.id;
      }

      const { data, error } = await base
        .from('produits')
        .insert({
          boutique_id: saisie.boutiqueId,
          fabricant_id: saisie.fabricantId,
          nom: saisie.nom.trim(),
          prix_centimes: saisie.intermediaire ? 0 : saisie.prixCentimes,
          photo_url: saisie.photoUrl,
          conservation: saisie.conservation,
          duree_conservation_jours: saisie.dureeJours,
          seuil_min: saisie.seuilMin,
          impose_par_admin: false,
          intermediaire: saisie.intermediaire,
        })
        .select('id')
        .single();
      if (error) throw error;
      await remplacerRecette(data.id, saisie.lignes);
      return data.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produits'] }),
  });
}

export function useDefinirPhotoProduit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saisie: { id: string; photoUrl: string | null }) => {
      const { error } = await db().from('produits').update({ photo_url: saisie.photoUrl }).eq('id', saisie.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produits'] }),
  });
}

export function useDefinirPhotoProfil() {
  return useMutation({
    mutationFn: async (saisie: { id: string; photoUrl: string | null }) => {
      const { error } = await db().from('profils').update({ photo_url: saisie.photoUrl }).eq('id', saisie.id);
      if (error) throw error;
    },
  });
}

export function useArchiverMonProduit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db()
        .from('produits')
        .update({ archive_le: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produits'] }),
  });
}

export function useImposerProduits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saisie: { produit: ProduitImpose; cibles: CibleImposee[] }) => {
      for (const cible of saisie.cibles) {
        try {
          await creerCopie(saisie.produit, cible);
        } catch (erreur) {
          throw new Error(`${cible.nomBoutique} : ${messageErreur(erreur)}`);
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produits'] }),
  });
}
