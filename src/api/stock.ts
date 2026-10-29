import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aujourdhuiParis } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { StockActuel } from '@/types/database';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

export type LigneMouvement = {
  produitId: string;
  quantite: number;
  nom: string;
};

export type MouvementDuJour = {
  id: string;
  quantite: number;
  created_at: string;
  produitNom: string;
};

function messageDisponible(stock: number): string {
  return stock === 1 ? '1 disponible' : `${stock} disponibles`;
}

function messageConfirmation(
  type: 'production' | 'sortie',
  quantite: number,
  nom: string,
  stock: number,
): string {
  if (type === 'production') {
    const verbe = quantite === 1 ? 'ajouté' : 'ajoutés';
    return `${quantite} ${nom} ${verbe}. Stock : ${stock}`;
  }
  const verbe = quantite === 1 ? 'sorti' : 'sortis';
  return `${quantite} ${nom} ${verbe}. Stock : ${stock}`;
}

export function useStock(boutiqueId: string | null) {
  return useQuery({
    queryKey: ['stock', boutiqueId],
    enabled: Boolean(boutiqueId),
    queryFn: async (): Promise<StockActuel[]> => {
      const { data, error } = await db()
        .from('stock_actuel')
        .select('*')
        .eq('boutique_id', boutiqueId ?? '');
      if (error) throw error;
      return data;
    },
  });
}

export function useMesMouvementsDuJour(
  userId: string | null,
  type: 'production' | 'sortie',
) {
  const jour = aujourdhuiParis();
  return useQuery({
    queryKey: ['mouvements', userId, type, jour],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MouvementDuJour[]> => {
      const { data, error } = await db()
        .from('mouvements_stock')
        .select('id, quantite, created_at, produits(nom)')
        .eq('saisi_par', userId ?? '')
        .eq('type', type)
        .eq('jour', jour)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return data.map((ligne) => {
        const produit = ligne.produits as { nom: string } | null;
        return {
          id: ligne.id,
          quantite: ligne.quantite,
          created_at: ligne.created_at,
          produitNom: produit?.nom ?? 'Produit',
        };
      });
    },
  });
}

export function useEnregistrerMouvements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saisie: {
      type: 'production' | 'sortie';
      lignes: LigneMouvement[];
    }): Promise<string> => {
      const lignes = saisie.lignes.filter((ligne) => ligne.quantite > 0);
      if (lignes.length === 0) {
        throw new Error('Indiquez au moins une quantité.');
      }

      const ids = lignes.map((ligne) => ligne.produitId);

      if (saisie.type === 'sortie') {
        const { data: stocks, error: erreurStock } = await db()
          .from('stock_actuel')
          .select('produit_id, stock')
          .in('produit_id', ids);
        if (erreurStock) throw erreurStock;

        const parProduit = new Map(
          (stocks ?? []).map((ligne) => [ligne.produit_id, ligne.stock ?? 0]),
        );
        for (const ligne of lignes) {
          const dispo = parProduit.get(ligne.produitId) ?? 0;
          if (ligne.quantite > dispo) {
            throw new Error(
              `Stock insuffisant pour ${ligne.nom} : ${messageDisponible(dispo)}.`,
            );
          }
        }
      }

      const { error } = await db()
        .from('mouvements_stock')
        .insert(
          lignes.map((ligne) => ({
            produit_id: ligne.produitId,
            type: saisie.type,
            quantite: ligne.quantite,
          })),
        );
      if (error) throw error;

      const { data: stocksApres, error: erreurApres } = await db()
        .from('stock_actuel')
        .select('produit_id, stock')
        .in('produit_id', ids);
      if (erreurApres) throw erreurApres;

      const parProduit = new Map(
        (stocksApres ?? []).map((ligne) => [ligne.produit_id, ligne.stock ?? 0]),
      );

      return lignes
        .map((ligne) =>
          messageConfirmation(
            saisie.type,
            ligne.quantite,
            ligne.nom,
            parProduit.get(ligne.produitId) ?? 0,
          ),
        )
        .join('\n');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['mouvements'] });
    },
  });
}

export function useAnnulerMouvement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db()
        .from('mouvements_stock')
        .delete()
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Cette saisie ne peut plus être annulée.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['mouvements'] });
    },
  });
}

export function useAjusterStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saisie: {
      produitId: string;
      nom: string;
      stockActuel: number;
      stockReel: number;
    }): Promise<string> => {
      const { data, error } = await db().rpc('ajuster_stock', {
        p_produit: saisie.produitId,
        p_stock_reel: saisie.stockReel,
      });
      if (error) throw error;
      const nouveau = data ?? saisie.stockReel;
      return `Stock de ${saisie.nom} corrigé : ${saisie.stockActuel} → ${nouveau}.`;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['mouvements'] });
    },
  });
}
