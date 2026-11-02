import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aujourdhuiParis } from '@/lib/format';
import {
  jourRetraitParis,
  LIBELLES_STATUT,
  type FiltreStatutCommandes,
  statutsDuFiltre,
} from '@/lib/commandes';
import { supabase } from '@/lib/supabase';
import type { Commande, StatutCommande } from '@/types/database';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

function invalider(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: ['commandes'] });
  void client.invalidateQueries({ queryKey: ['ca'] });
  void client.invalidateQueries({ queryKey: ['notifications'] });
}

export type CommandeEnrichie = Commande & {
  boutique_fabrication_nom: string;
  boutique_retrait_nom: string;
  cree_par_prenom: string;
  fabricant_prenom: string | null;
};

type ProfilNom = { id: string; prenom: string };

async function enrichir(commandes: Commande[]): Promise<CommandeEnrichie[]> {
  const { data: boutiques, error: errB } = await db().rpc('noms_boutiques_entreprise');
  if (errB) throw errB;
  const nomsB = new Map((boutiques ?? []).map((b) => [b.id, b.nom]));

  const ids = new Set<string>();
  for (const c of commandes) {
    ids.add(c.cree_par);
    if (c.fabricant_id) ids.add(c.fabricant_id);
  }
  let prenoms = new Map<string, string>();
  if (ids.size > 0) {
    const { data: profils, error: errP } = await db()
      .from('profils')
      .select('id, prenom')
      .in('id', [...ids]);
    if (errP) throw errP;
    prenoms = new Map(((profils ?? []) as ProfilNom[]).map((p) => [p.id, p.prenom]));
  }

  return commandes.map((c) => ({
    ...c,
    boutique_fabrication_nom: nomsB.get(c.boutique_fabrication_id) ?? '—',
    boutique_retrait_nom: nomsB.get(c.boutique_retrait_id) ?? '—',
    cree_par_prenom: prenoms.get(c.cree_par) ?? '—',
    fabricant_prenom: c.fabricant_id ? (prenoms.get(c.fabricant_id) ?? '—') : null,
  }));
}

export type FiltresListeCommandes = {
  filtreStatut: FiltreStatutCommandes;
  /** null = toutes ; filtre boutique de fabrication (pâtissier) */
  boutiqueFabricationId?: string | null;
};

export function useCommandes(filtres: FiltresListeCommandes) {
  const statuts = statutsDuFiltre(filtres.filtreStatut);
  return useQuery({
    queryKey: ['commandes', 'liste', filtres],
    queryFn: async (): Promise<CommandeEnrichie[]> => {
      let requete = db()
        .from('commandes')
        .select('*')
        .in('statut', statuts)
        .order('retrait_le', { ascending: true });
      if (filtres.boutiqueFabricationId) {
        requete = requete.eq('boutique_fabrication_id', filtres.boutiqueFabricationId);
      }
      const { data, error } = await requete;
      if (error) throw error;
      return enrichir(data ?? []);
    },
  });
}

export function useCommande(id: string | null | undefined) {
  return useQuery({
    queryKey: ['commandes', 'detail', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<CommandeEnrichie> => {
      const { data, error } = await db()
        .from('commandes')
        .select('*')
        .eq('id', id as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Commande introuvable.');
      const [enrichie] = await enrichir([data]);
      return enrichie!;
    },
  });
}

/** Nombre de commandes à faire aujourd'hui et demain pour la boutique (badge). */
export function useBadgeCommandesPatissier(boutiqueId: string | null) {
  const aujourdhui = aujourdhuiParis();
  return useQuery({
    queryKey: ['commandes', 'badge', boutiqueId, aujourdhui],
    enabled: Boolean(boutiqueId),
    refetchInterval: 60_000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await db()
        .from('commandes')
        .select('id, retrait_le')
        .eq('boutique_fabrication_id', boutiqueId as string)
        .eq('statut', 'a_faire');
      if (error) throw error;
      const demain = (() => {
        const d = new Date(`${aujourdhui}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + 1);
        return d.toISOString().slice(0, 10);
      })();
      return (data ?? []).filter((c) => {
        const jour = jourRetraitParis(c.retrait_le);
        return jour === aujourdhui || jour === demain;
      }).length;
    },
  });
}

export type PayloadCommande = {
  client_nom: string;
  client_telephone: string;
  client_email: string | null;
  gateau: string;
  nb_parts: number;
  demandes: string | null;
  inscription: string | null;
  boutique_fabrication_id: string;
  boutique_retrait_id: string;
  retrait_le: string;
  prix_centimes: number | null;
  acompte_centimes: number | null;
};

export function useCreerCommande() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PayloadCommande) => {
      const { data, error } = await db().from('commandes').insert(payload).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => invalider(client),
  });
}

export function useModifierCommande() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: PayloadCommande & { id: string }) => {
      // boutique_retrait_id figé côté base ; on l'envoie quand même pour le typage insert.
      const { error } = await db()
        .from('commandes')
        .update({
          client_nom: payload.client_nom,
          client_telephone: payload.client_telephone,
          client_email: payload.client_email,
          gateau: payload.gateau,
          nb_parts: payload.nb_parts,
          demandes: payload.demandes,
          inscription: payload.inscription,
          boutique_fabrication_id: payload.boutique_fabrication_id,
          retrait_le: payload.retrait_le,
          prix_centimes: payload.prix_centimes,
          acompte_centimes: payload.acompte_centimes,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

export function useMarquerCommandePrete() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().rpc('marquer_commande_prete', { p_commande: id });
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

export function useAnnulerCommandePrete() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().rpc('annuler_commande_prete', { p_commande: id });
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

export function useMarquerCommandeRecue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().rpc('marquer_commande_recue', { p_commande: id });
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

export function useAnnulerCommandeRecue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().rpc('annuler_commande_recue', { p_commande: id });
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

export function useMarquerCommandeRecuperee() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().rpc('marquer_commande_recuperee', { p_commande: id });
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

export function useAnnulerCommande() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().rpc('annuler_commande', { p_commande: id });
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

export function useSignalerCommandeNonRecue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().rpc('signaler_commande_non_recue', { p_commande: id });
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

export function libelleStatut(statut: StatutCommande): string {
  return LIBELLES_STATUT[statut] ?? statut;
}
