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

export function useCreerBoutique() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saisie: { entrepriseId: string; nom: string; adresse: string }) => {
      const { error } = await db()
        .from('boutiques')
        .insert({
          entreprise_id: saisie.entrepriseId,
          nom: saisie.nom.trim(),
          adresse: saisie.adresse.trim() || null,
        });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boutiques'] }),
  });
}
