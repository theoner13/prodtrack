import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { messageConfirmationProductionFrais } from '@/lib/disponible-frais';
import { aujourdhuiParis } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { DisponibleFrais, StockActuel } from '@/types/database';

export {
  messageConfirmationProductionFrais,
  sousTitreDisponibleFrais,
} from '@/lib/disponible-frais';

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
  conservation: 'frais' | 'surgele';
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

/** Stock des produits dont je suis le fabricant (y compris extérieurs). */
export function useStockFabricant(fabricantId: string | null) {
  return useQuery({
    queryKey: ['stock', 'fabricant', fabricantId],
    enabled: Boolean(fabricantId),
    queryFn: async (): Promise<StockActuel[]> => {
      const { data, error } = await db()
        .from('stock_actuel')
        .select('*')
        .eq('fabricant_id', fabricantId ?? '');
      if (error) throw error;
      return data;
    },
  });
}

export function useDisponibleFrais(boutiqueId: string | null) {
  return useQuery({
    queryKey: ['disponible', boutiqueId],
    enabled: Boolean(boutiqueId),
    queryFn: async (): Promise<DisponibleFrais[]> => {
      const { data, error } = await db()
        .from('disponible_frais')
        .select('*')
        .eq('boutique_id', boutiqueId ?? '');
      if (error) throw error;
      return data;
    },
  });
}

/** Disponible frais des produits dont je suis le fabricant. */
export function useDisponibleFraisFabricant(fabricantId: string | null) {
  return useQuery({
    queryKey: ['disponible', 'fabricant', fabricantId],
    enabled: Boolean(fabricantId),
    queryFn: async (): Promise<DisponibleFrais[]> => {
      const { data, error } = await db()
        .from('disponible_frais')
        .select('*')
        .eq('fabricant_id', fabricantId ?? '');
      if (error) throw error;
      return data;
    },
  });
}

export type StatsJourProduit = {
  vendus: number;
  jetes: number;
  reste: number;
  pertes: number;
  aSaisieVendeuse: boolean;
};

/** Saisie vendeuse et pertes du jour pour une liste de produits. */
export function useStatsJourProduits(produitIds: string[]) {
  const jour = aujourdhuiParis();
  const cle = [...produitIds].sort().join(',');
  return useQuery({
    queryKey: ['stats-jour', jour, cle],
    enabled: produitIds.length > 0,
    queryFn: async (): Promise<Map<string, StatsJourProduit>> => {
      const vide = (): StatsJourProduit => ({
        vendus: 0,
        jetes: 0,
        reste: 0,
        pertes: 0,
        aSaisieVendeuse: false,
      });
      const map = new Map<string, StatsJourProduit>();
      for (const id of produitIds) {
        map.set(id, vide());
      }
      if (produitIds.length === 0) return map;

      const { data: ventes, error: erreurVentes } = await db()
        .from('saisies_vente')
        .select('produit_id, vendu, jete, reste')
        .eq('jour', jour)
        .in('produit_id', produitIds);
      if (erreurVentes) throw erreurVentes;
      for (const ligne of ventes ?? []) {
        const actuel = map.get(ligne.produit_id) ?? vide();
        actuel.vendus = ligne.vendu;
        actuel.jetes = ligne.jete;
        actuel.reste = ligne.reste;
        actuel.aSaisieVendeuse = true;
        map.set(ligne.produit_id, actuel);
      }

      const { data: pertes, error: erreurPertes } = await db()
        .from('pertes_production')
        .select('produit_id, quantite')
        .eq('jour', jour)
        .in('produit_id', produitIds);
      if (erreurPertes) throw erreurPertes;
      for (const ligne of pertes ?? []) {
        const actuel = map.get(ligne.produit_id) ?? vide();
        actuel.pertes += ligne.quantite;
        map.set(ligne.produit_id, actuel);
      }
      return map;
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
        .select('id, quantite, created_at, produits(nom, conservation)')
        .eq('saisi_par', userId ?? '')
        .eq('type', type)
        .eq('jour', jour)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return data.map((ligne) => {
        const produit = ligne.produits as {
          nom: string;
          conservation: 'frais' | 'surgele';
        } | null;
        return {
          id: ligne.id,
          quantite: ligne.quantite,
          created_at: ligne.created_at,
          produitNom: produit?.nom ?? 'Produit',
          conservation: produit?.conservation ?? 'surgele',
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
      /** Pour une production de frais : confirmation avec « Disponible » au lieu de « Stock ». */
      confirmation?: 'stock' | 'disponible';
    }): Promise<string> => {
      const lignes = saisie.lignes.filter((ligne) => ligne.quantite > 0);
      if (lignes.length === 0) {
        throw new Error('Indiquez au moins une quantité.');
      }

      const ids = lignes.map((ligne) => ligne.produitId);
      const modeConfirmation = saisie.confirmation ?? 'stock';

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

      if (modeConfirmation === 'disponible') {
        const { data: disposApres, error: erreurApres } = await db()
          .from('disponible_frais')
          .select('produit_id, disponible')
          .in('produit_id', ids);
        if (erreurApres) throw erreurApres;

        const parProduit = new Map(
          (disposApres ?? []).map((ligne) => [
            ligne.produit_id,
            ligne.disponible ?? 0,
          ]),
        );

        return lignes
          .map((ligne) =>
            messageConfirmationProductionFrais(
              ligne.quantite,
              ligne.nom,
              parProduit.get(ligne.produitId) ?? 0,
            ),
          )
          .join('\n');
      }

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
      void queryClient.invalidateQueries({ queryKey: ['disponible'] });
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
      void queryClient.invalidateQueries({ queryKey: ['disponible'] });
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
