import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

export type CatalogueBoutique = {
  id: string;
  nom: string;
};

export type CatalogueProduit = {
  id: string;
  nom: string;
  photo_url: string | null;
  prix_centimes: number;
  conservation: Enums<'type_conservation'>;
  duree_conservation_jours: number | null;
  intermediaire: boolean;
};

export type CatalogueLigneRecette = {
  ingredient: string;
  quantite: number;
  unite: string;
  ordre: number;
};

export function useCatalogueBoutiques() {
  return useQuery({
    queryKey: ['catalogue', 'boutiques'],
    queryFn: async (): Promise<CatalogueBoutique[]> => {
      const { data, error } = await db().rpc('catalogue_boutiques');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCatalogueProduits(boutiqueId: string | null) {
  return useQuery({
    queryKey: ['catalogue', 'produits', boutiqueId],
    enabled: Boolean(boutiqueId),
    queryFn: async (): Promise<CatalogueProduit[]> => {
      const { data, error } = await db().rpc('catalogue_produits', {
        p_boutique: boutiqueId as string,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCatalogueRecette(produitId: string | null) {
  return useQuery({
    queryKey: ['catalogue', 'recette', produitId],
    enabled: Boolean(produitId),
    queryFn: async (): Promise<CatalogueLigneRecette[]> => {
      const { data, error } = await db().rpc('catalogue_recette', {
        p_produit: produitId as string,
      });
      if (error) throw error;
      return (data ?? []).map((ligne) => ({
        ...ligne,
        quantite: Number(ligne.quantite),
      }));
    },
  });
}

export function useFabriquerAussi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saisie: {
      boutiqueId: string;
      fabricantId: string;
      produit: CatalogueProduit;
      lignes: CatalogueLigneRecette[];
    }): Promise<string> => {
      const base = db();
      const intermediaire = saisie.produit.intermediaire;
      const { data: cree, error } = await base
        .from('produits')
        .insert({
          boutique_id: saisie.boutiqueId,
          fabricant_id: saisie.fabricantId,
          nom: saisie.produit.nom.trim(),
          prix_centimes: intermediaire ? 0 : saisie.produit.prix_centimes,
          photo_url: null,
          conservation: saisie.produit.conservation,
          duree_conservation_jours: saisie.produit.duree_conservation_jours,
          seuil_min: 0,
          impose_par_admin: false,
          intermediaire,
        })
        .select('id')
        .single();
      if (error) throw error;

      if (saisie.lignes.length === 0) return cree.id;

      const { error: erreurRecette } = await base.from('ingredients_recette').insert(
        saisie.lignes.map((ligne) => ({
          produit_id: cree.id,
          ingredient: ligne.ingredient,
          quantite: ligne.quantite,
          unite: ligne.unite,
          ordre: ligne.ordre,
        })),
      );
      if (erreurRecette) {
        await base
          .from('produits')
          .update({ archive_le: new Date().toISOString() })
          .eq('id', cree.id);
        throw erreurRecette;
      }
      return cree.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produits'] }),
  });
}
