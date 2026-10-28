import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

function invalider(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: ['notifications'] });
}

export function useNotifications(userId: string | null) {
  return useQuery({
    queryKey: ['notifications', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await db()
        .from('notifications')
        .select('*')
        .eq('profil_id', userId ?? '')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useNombreNonLues(userId: string | null) {
  const client = useQueryClient();

  useEffect(() => {
    const suivi = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') invalider(client);
    });
    return () => suivi.remove();
  }, [client]);

  return useQuery({
    queryKey: ['notifications', 'non-lues', userId],
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await db()
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profil_id', userId ?? '')
        .eq('lu', false);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarquerNotificationLue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('notifications').update({ lu: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}

export function useMarquerToutesLues() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await db()
        .from('notifications')
        .update({ lu: true })
        .eq('profil_id', userId)
        .eq('lu', false);
      if (error) throw error;
    },
    onSuccess: () => invalider(client),
  });
}
