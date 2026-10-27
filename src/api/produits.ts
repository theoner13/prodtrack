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
  fabricantId: string;
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

      const ids = [...new Set(produits.map((produit) => produit.fabricant_id))];
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
        fabricantNom: noms.get(produit.fabricant_id) ?? 'Fabricant inconnu',
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
