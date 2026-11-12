import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aujourdhuiParis } from '@/lib/format';
import {
  filtrerCommandesLabo,
  statutCommandeLabo,
  type FiltreCommandesLabo,
} from '@/lib/laboratoire';
import { supabase } from '@/lib/supabase';
import type { CommandeLabo } from '@/types/database';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

function invalider(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: ['commandes-labo'] });
  void client.invalidateQueries({ queryKey: ['notifications'] });
  void client.invalidateQueries({ queryKey: ['previsions'] });
}

export type CommandeLaboEnrichie = CommandeLabo & {
  produit_nom: string;
  fabricant_id: string | null;
  fabricant_nom: string;
};

type ProduitNom = {
  id: string;
  nom: string;
  fabricant_id: string | null;
};

type ProfilNom = { id: string; prenom: string; nom: string };

async function enrichir(commandes: CommandeLabo[]): Promise<CommandeLaboEnrichie[]> {
  if (commandes.length === 0) return [];

  const idsProduits = [...new Set(commandes.map((c) => c.produit_id))];
  const { data: produits, error: errP } = await db()
    .from('produits')
    .select('id, nom, fabricant_id')
    .in('id', idsProduits);
  if (errP) throw errP;

  const parProduit = new Map(
    ((produits ?? []) as ProduitNom[]).map((p) => [p.id, p]),
  );

  const idsFabricants = new Set<string>();
  for (const p of produits ?? []) {
    if (p.fabricant_id) idsFabricants.add(p.fabricant_id);
  }

  let noms = new Map<string, string>();
  if (idsFabricants.size > 0) {
    const { data: profils, error: errPr } = await db()
      .from('profils')
      .select('id, prenom, nom')
      .in('id', [...idsFabricants]);
    if (errPr) throw errPr;
    noms = new Map(
      ((profils ?? []) as ProfilNom[]).map((p) => [
        p.id,
        `${p.prenom} ${p.nom}`.trim() || 'Pâtissier',
      ]),
    );
  }

  return commandes.map((c) => {
    const produit = parProduit.get(c.produit_id);
    const fabricantId = produit?.fabricant_id ?? null;
    return {
      ...c,
      produit_nom: produit?.nom ?? 'Produit',
      fabricant_id: fabricantId,
      fabricant_nom: fabricantId ? (noms.get(fabricantId) ?? 'Pâtissier') : '—',
    };
  });
}

export function useCommandesLabo(
  laboratoireId: string | null,
  filtre: FiltreCommandesLabo,
) {
  const aujourdhui = aujourdhuiParis();
  return useQuery({
    queryKey: ['commandes-labo', 'liste', laboratoireId, filtre, aujourdhui],
    enabled: Boolean(laboratoireId),
    queryFn: async (): Promise<CommandeLaboEnrichie[]> => {
      let requete = db()
        .from('commandes_labo')
        .select('*')
        .eq('laboratoire_id', laboratoireId as string)
        .order('pour_le', { ascending: true })
        .order('created_at', { ascending: true });

      if (filtre === 'annulees') {
        requete = requete.not('annulee_le', 'is', null);
      } else if (filtre === 'a_venir') {
        requete = requete
          .is('annulee_le', null)
          .is('effectuee_le', null)
          .gte('pour_le', aujourdhui);
      } else {
        // Passées : date passée, ou déjà effectuée (même date future).
        requete = requete.is('annulee_le', null);
        const { data, error } = await requete;
        if (error) throw error;
        return enrichir(
          filtrerCommandesLabo(data ?? [], 'passees', aujourdhui),
        );
      }

      const { data, error } = await requete;
      if (error) throw error;
      return enrichir(data ?? []);
    },
  });
}

/** Commandes à venir (non annulées, non effectuées) pour les produits du fabricant. */
export function useCommandesLaboFabricant(fabricantId: string | null) {
  const aujourdhui = aujourdhuiParis();
  return useQuery({
    queryKey: ['commandes-labo', 'fabricant', fabricantId, aujourdhui],
    enabled: Boolean(fabricantId),
    queryFn: async (): Promise<CommandeLaboEnrichie[]> => {
      const { data: produits, error: errProd } = await db()
        .from('produits')
        .select('id')
        .eq('fabricant_id', fabricantId as string)
        .is('archive_le', null);
      if (errProd) throw errProd;
      const ids = (produits ?? []).map((p) => p.id);
      if (ids.length === 0) return [];

      const { data, error } = await db()
        .from('commandes_labo')
        .select('*')
        .in('produit_id', ids)
        .is('annulee_le', null)
        .is('effectuee_le', null)
        .gte('pour_le', aujourdhui)
        .order('pour_le', { ascending: true });
      if (error) throw error;
      return enrichir(data ?? []);
    },
  });
}

export type SaisieCommandeLabo = {
  laboratoireId: string;
  produitId: string;
  quantite: number;
  pourLe: string;
  client: string;
  note: string;
};

export function useCreerCommandeLabo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (saisie: SaisieCommandeLabo): Promise<void> => {
      const { error } = await db().from('commandes_labo').insert({
        laboratoire_id: saisie.laboratoireId,
        produit_id: saisie.produitId,
        quantite: saisie.quantite,
        pour_le: saisie.pourLe,
        client: saisie.client.trim() || null,
        note: saisie.note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

export function useAnnulerCommandeLabo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await db()
        .from('commandes_labo')
        .update({ annulee_le: new Date().toISOString() })
        .eq('id', id)
        .is('annulee_le', null);
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

export type ActionStatutCommandeLabo = 'prete' | 'effectuee' | 'retour';

/** Change le statut : prête, effectuée, ou retour d’un cran. */
export function useChangerStatutCommandeLabo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      action: ActionStatutCommandeLabo;
      prete_le: string | null;
      effectuee_le: string | null;
      annulee_le: string | null;
    }): Promise<void> => {
      const statut = statutCommandeLabo(args);
      if (statut === 'annulee') {
        throw new Error('Cette commande est annulée.');
      }

      let patch: { prete_le?: string | null; effectuee_le?: string | null };
      if (args.action === 'prete') {
        if (statut !== 'a_faire') {
          throw new Error('Seule une commande à faire peut être marquée prête.');
        }
        patch = { prete_le: new Date().toISOString() };
      } else if (args.action === 'effectuee') {
        if (statut !== 'a_faire' && statut !== 'prete') {
          throw new Error('Cette commande ne peut plus être marquée effectuée.');
        }
        patch = { effectuee_le: new Date().toISOString() };
      } else if (statut === 'effectuee') {
        patch = { effectuee_le: null };
      } else if (statut === 'prete') {
        patch = { prete_le: null };
      } else {
        throw new Error('Aucun statut à annuler.');
      }

      const { error } = await db()
        .from('commandes_labo')
        .update(patch)
        .eq('id', args.id)
        .is('annulee_le', null);
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

/** Exposé pour les tests de filtre côté client si besoin. */
export { filtrerCommandesLabo };
