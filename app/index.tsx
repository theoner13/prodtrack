import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function Accueil() {
  const [message, setMessage] = useState('Vérification de Supabase…');

  useEffect(() => {
    if (!supabase) {
      setMessage(
        'Renseigne EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans le fichier .env',
      );
      return;
    }

    supabase.auth
      .getSession()
      .then(({ error }) => {
        setMessage(error ? error.message : 'Connexion Supabase OK');
      })
      .catch((erreur: unknown) => {
        setMessage(erreur instanceof Error ? erreur.message : 'Erreur inconnue');
      });
  }, []);

  return (
    <View style={styles.conteneur}>
      <Text style={styles.titre}>ProdTrack</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  titre: {
    fontSize: 32,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
  },
});
