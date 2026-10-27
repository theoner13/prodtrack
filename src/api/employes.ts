import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

export function useEmployes(avecArchives: boolean) {
  return useQuery({
    queryKey: ['employes', avecArchives],
    queryFn: async () => {
      let requete = db().from('profils').select('*').order('prenom');
      if (!avecArchives) requete = requete.is('archive_le', null);
      const { data, error } = await requete;
      if (error) throw error;
      return data;
    },
  });
}

export function usePatissiers(boutiqueId: string | null) {
  return useQuery({
    queryKey: ['patissiers', boutiqueId],
    enabled: Boolean(boutiqueId),
    queryFn: async () => {
      const { data, error } = await db()
        .from('profils')
        .select('*')
        .eq('boutique_id', boutiqueId ?? '')
        .eq('role', 'patissier')
        .is('archive_le', null)
        .order('prenom');
      if (error) throw error;
      return data;
    },
  });
}

export function usePatissiersActifs() {
  return useQuery({
    queryKey: ['patissiers'],
    queryFn: async () => {
      const { data, error } = await db()
        .from('profils')
        .select('*')
        .eq('role', 'patissier')
        .is('archive_le', null)
        .order('prenom');
      if (error) throw error;
      return data;
    },
  });
}

export function useChangerArchivage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saisie: { id: string; archiver: boolean }) => {
      const { error } = await db()
        .from('profils')
        .update({ archive_le: saisie.archiver ? new Date().toISOString() : null })
        .eq('id', saisie.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employes'] });
      void queryClient.invalidateQueries({ queryKey: ['patissiers'] });
    },
  });
}
