import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

export type DetailJour = {
  jour: string;
  prevu: number;
  stockFin: number;
};

// Une ligne par produit actif du pâtissier. prevision absente = pas encore de calcul de nuit.
export type PrevisionProduit = {
  produitId: string;
  nom: string;
  photoUrl: string | null;
  seuilMin: number;
  dureeConservationJours: number | null;
  stockActuel: number | null;
  jourFabrication: string | null;
  quantiteSuggeree: number | null;
  fiable: boolean | null;
  calculeLe: string | null;
  detail: DetailJour[];
};

function nombre(valeur: Json | undefined): number | null {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null;
}

function lireDetail(valeur: Json): DetailJour[] {
  if (!Array.isArray(valeur)) return [];
  const jours: DetailJour[] = [];
  for (const item of valeur) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const jour = item.jour;
    const prevu = nombre(item.prevu);
    const stockFin = nombre(item.stock_fin);
    if (typeof jour !== 'string' || prevu === null || stockFin === null) continue;
    jours.push({ jour, prevu, stockFin });
  }
  return jours;
}

export function useMesPrevisions(userId: string | null) {
  return useQuery({
    queryKey: ['previsions', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<PrevisionProduit[]> => {
      const { data: produits, error } = await db()
        .from('produits')
        .select('id, nom, photo_url, seuil_min, duree_conservation_jours')
        .eq('fabricant_id', userId ?? '')
        .is('archive_le', null)
        .order('nom');
      if (error) throw error;
      if (produits.length === 0) return [];

      const { data: previsions, error: erreurPrevisions } = await db()
        .from('previsions')
        .select('*')
        .in(
          'produit_id',
          produits.map((produit) => produit.id),
        );
      if (erreurPrevisions) throw erreurPrevisions;

      const parProduit = new Map(previsions.map((ligne) => [ligne.produit_id, ligne]));

      return produits.map((produit) => {
        const prevision = parProduit.get(produit.id);
        return {
          produitId: produit.id,
          nom: produit.nom,
          photoUrl: produit.photo_url,
          seuilMin: produit.seuil_min,
          dureeConservationJours: produit.duree_conservation_jours,
          stockActuel: prevision?.stock_actuel ?? null,
          jourFabrication: prevision?.jour_fabrication ?? null,
          quantiteSuggeree: prevision?.quantite_suggeree ?? null,
          fiable: prevision?.fiable ?? null,
          calculeLe: prevision?.calcule_le ?? null,
          detail: prevision ? lireDetail(prevision.detail) : [],
        };
      });
    },
  });
}
