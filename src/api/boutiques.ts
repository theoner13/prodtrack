import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

export function useBoutiques() {
  return useQuery({
    queryKey: ['boutiques'],
    queryFn: async () => {
      const { data, error } = await db().from('boutiques').select('*').order('nom');
      if (error) throw error;
      return data;
    },
  });
}

/** Noms des boutiques de l’entreprise (sans code d’invitation). */
export function useNomsBoutiquesEntreprise() {
  return useQuery({
    queryKey: ['boutiques', 'noms-entreprise'],
    queryFn: async (): Promise<{ id: string; nom: string; est_laboratoire: boolean }[]> => {
      const { data, error } = await db().rpc('noms_boutiques_entreprise');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreerBoutique() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saisie: {
      entrepriseId: string;
      nom: string;
      adresse: string;
      estLaboratoire?: boolean;
    }) => {
      const { error } = await db()
        .from('boutiques')
        .insert({
          entreprise_id: saisie.entrepriseId,
          nom: saisie.nom.trim(),
          adresse: saisie.adresse.trim() || null,
          est_laboratoire: saisie.estLaboratoire ?? false,
        });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boutiques'] }),
  });
}
