import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { lireToutesLesLignes, paquetsDe } from '@/api/pagination';
import { aujourdhuiParis, jourPrecedent } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

export type SaisieDuJour = {
  id: string;
  produit_id: string;
  jour: string;
  vendu: number;
  jete: number;
  reste: number;
};

export type LigneSaisie = {
  produit_id: string;
  jour: string;
  vendu: number;
  jete: number;
  reste: number;
};

export type DetailHistorique = {
  produitId: string;
  nom: string;
  vendu: number;
  jete: number;
  reste: number;
};

export type JourHistorique = {
  jour: string;
  totalVendu: number;
  totalJete: number;
  detail: DetailHistorique[];
};

async function idsProduitsBoutique(
  boutiqueId: string,
  avecArchives = false,
): Promise<string[]> {
  let requete = db()
    .from('produits')
    .select('id')
    .eq('boutique_id', boutiqueId);
  if (!avecArchives) {
    requete = requete.is('archive_le', null);
  }
  const { data, error } = await requete;
  if (error) throw error;
  return data.map((ligne) => ligne.id);
}

export function useSaisiesDuJour(boutiqueId: string | null, jour: string) {
  return useQuery({
    queryKey: ['ventes', 'jour', boutiqueId, jour],
    enabled: Boolean(boutiqueId),
    queryFn: async (): Promise<SaisieDuJour[]> => {
      const ids = await idsProduitsBoutique(boutiqueId ?? '');
      if (ids.length === 0) return [];

      const { data, error } = await db()
        .from('saisies_vente')
        .select('id, produit_id, jour, vendu, jete, reste')
        .eq('jour', jour)
        .in('produit_id', ids);
      if (error) throw error;
      return data;
    },
  });
}

export function useHistoriqueVentes(boutiqueId: string | null) {
  const aujourdhui = aujourdhuiParis();
  return useQuery({
    queryKey: ['ventes', 'historique', boutiqueId, aujourdhui],
    enabled: Boolean(boutiqueId),
    queryFn: async (): Promise<JourHistorique[]> => {
      const jours: string[] = [];
      let courant = aujourdhui;
      for (let i = 0; i < 14; i++) {
        jours.push(courant);
        courant = jourPrecedent(courant);
      }
      const debut = jours[jours.length - 1]!;

      const ids = await idsProduitsBoutique(boutiqueId ?? '', true);
      if (ids.length === 0) {
        return jours.map((jour) => ({
          jour,
          totalVendu: 0,
          totalJete: 0,
          detail: [],
        }));
      }

      type LigneHistorique = {
        produit_id: string;
        jour: string;
        vendu: number;
        jete: number;
        reste: number;
        produits: { nom: string } | null;
      };

      const data: LigneHistorique[] = [];
      for (const paquet of paquetsDe(ids)) {
        const page = await lireToutesLesLignes<LigneHistorique>(() =>
          db()
            .from('saisies_vente')
            .select('produit_id, jour, vendu, jete, reste, produits(nom)')
            .in('produit_id', paquet)
            .gte('jour', debut)
            .lte('jour', aujourdhui)
            .order('jour')
            .order('produit_id'),
        );
        data.push(...page);
      }

      const parJour = new Map<string, DetailHistorique[]>();
      for (const ligne of data) {
        const produit = ligne.produits;
        const detail: DetailHistorique = {
          produitId: ligne.produit_id,
          nom: produit?.nom ?? 'Produit',
          vendu: ligne.vendu,
          jete: ligne.jete,
          reste: ligne.reste,
        };
        const liste = parJour.get(ligne.jour) ?? [];
        liste.push(detail);
        parJour.set(ligne.jour, liste);
      }

      return jours.map((jour) => {
        const detail = (parJour.get(jour) ?? []).sort((a, b) =>
          a.nom.localeCompare(b.nom, 'fr'),
        );
        return {
          jour,
          totalVendu: detail.reduce((somme, ligne) => somme + ligne.vendu, 0),
          totalJete: detail.reduce((somme, ligne) => somme + ligne.jete, 0),
          detail,
        };
      });
    },
  });
}

export function useEnregistrerVentes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lignes: LigneSaisie[]) => {
      if (lignes.length === 0) {
        throw new Error('Indiquez au moins une quantité.');
      }

      // Types générés exigent prix/fabricant à l'insert : le trigger les remplit, on ne les envoie pas.
      const { error } = await db()
        .from('saisies_vente')
        .upsert(lignes as unknown as TablesInsert<'saisies_vente'>[], {
          onConflict: 'produit_id,jour',
        });
      if (error) throw error;
      return lignes.length;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ventes'] });
    },
  });
}
