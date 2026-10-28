import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aujourdhuiParis } from '@/lib/format';
import { supabase } from '@/lib/supabase';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

export type MotifPerte = 'brule' | 'tombe' | 'rate' | 'autre';

export type PerteDuJour = {
  id: string;
  quantite: number;
  motif: MotifPerte;
  dans_le_stock: boolean;
  created_at: string;
  produitNom: string;
};

const MOTIF_MESSAGE: Record<MotifPerte, { un: string; plusieurs: string }> = {
  brule: { un: 'brûlé', plusieurs: 'brûlés' },
  tombe: { un: 'tombé ou abîmé', plusieurs: 'tombés ou abîmés' },
  rate: { un: 'raté', plusieurs: 'ratés' },
  autre: { un: 'autre', plusieurs: 'autre' },
};

function messageDisponible(stock: number): string {
  return stock === 1 ? '1 disponible' : `${stock} disponibles`;
}

export function libelleMotifCourt(motif: MotifPerte): string {
  return MOTIF_MESSAGE[motif].un;
}

export function messageConfirmationPerte(
  quantite: number,
  nom: string,
  motif: MotifPerte,
  stockApres: number | null,
): string {
  const forme = quantite === 1 ? MOTIF_MESSAGE[motif].un : MOTIF_MESSAGE[motif].plusieurs;
  const verbe = quantite === 1 ? 'perdu' : 'perdus';
  const base = `${quantite} ${nom} ${verbe} (${forme}).`;
  if (stockApres === null) return base;
  return `${base} Stock : ${stockApres}`;
}

export function useMesPertesDuJour(userId: string | null) {
  const jour = aujourdhuiParis();
  return useQuery({
    queryKey: ['pertes', userId, jour],
    enabled: Boolean(userId),
    queryFn: async (): Promise<PerteDuJour[]> => {
      const { data, error } = await db()
        .from('pertes_production')
        .select('id, quantite, motif, dans_le_stock, created_at, produits(nom)')
        .eq('saisi_par', userId ?? '')
        .eq('jour', jour)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return data.map((ligne) => {
        const produit = ligne.produits as { nom: string } | null;
        return {
          id: ligne.id,
          quantite: ligne.quantite,
          motif: ligne.motif as MotifPerte,
          dans_le_stock: ligne.dans_le_stock,
          created_at: ligne.created_at,
          produitNom: produit?.nom ?? 'Produit',
        };
      });
    },
  });
}

export function useDeclarerPerte() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saisie: {
      produitId: string;
      nom: string;
      quantite: number;
      motif: MotifPerte;
      dansLeStock: boolean;
    }): Promise<string> => {
      if (saisie.quantite <= 0) {
        throw new Error('Indiquez une quantité perdue.');
      }

      if (saisie.dansLeStock) {
        const { data: stocks, error: erreurStock } = await db()
          .from('stock_actuel')
          .select('produit_id, stock')
          .eq('produit_id', saisie.produitId);
        if (erreurStock) throw erreurStock;
        const dispo = stocks?.[0]?.stock ?? 0;
        if (saisie.quantite > dispo) {
          throw new Error(
            `Stock insuffisant pour ${saisie.nom} : ${messageDisponible(dispo)}.`,
          );
        }
      }

      const { error } = await db().from('pertes_production').insert({
        produit_id: saisie.produitId,
        quantite: saisie.quantite,
        motif: saisie.motif,
        dans_le_stock: saisie.dansLeStock,
      });
      if (error) throw error;

      if (!saisie.dansLeStock) {
        return messageConfirmationPerte(saisie.quantite, saisie.nom, saisie.motif, null);
      }

      const { data: stocksApres, error: erreurApres } = await db()
        .from('stock_actuel')
        .select('produit_id, stock')
        .eq('produit_id', saisie.produitId);
      if (erreurApres) throw erreurApres;

      return messageConfirmationPerte(
        saisie.quantite,
        saisie.nom,
        saisie.motif,
        stocksApres?.[0]?.stock ?? 0,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['mouvements'] });
      void queryClient.invalidateQueries({ queryKey: ['pertes'] });
    },
  });
}

export function useAnnulerPerte() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db()
        .from('pertes_production')
        .delete()
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Cette perte ne peut plus être annulée.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['mouvements'] });
      void queryClient.invalidateQueries({ queryKey: ['pertes'] });
    },
  });
}
