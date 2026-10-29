import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { couleurs, espacements, rayon, tailles } from '@/theme';

type Props = {
  message: string | null; // null = rien à afficher
  type?: 'succes' | 'erreur';
  onFermer: () => void;
  duree?: number; // ms avant disparition automatique
};

// Bannière de confirmation (ou d'erreur) qui disparaît toute seule.
// Toucher la bannière la ferme tout de suite.
export function Banniere({ message, type = 'succes', onFermer, duree = 3000 }: Props) {
  useEffect(() => {
    if (!message) return;
    const minuteur = setTimeout(onFermer, duree);
    return () => clearTimeout(minuteur);
  }, [message, duree, onFermer]);

  if (!message) return null;

  const succes = type === 'succes';
  return (
    <Pressable
      accessibilityRole="alert"
      onPress={onFermer}
      style={[
        styles.banniere,
        { backgroundColor: succes ? couleurs.succesClair : couleurs.erreurClair },
        { borderColor: succes ? couleurs.succes : couleurs.erreur },
      ]}
    >
      <Text style={[styles.texte, { color: succes ? couleurs.succes : couleurs.erreur }]}>
        {succes ? '✓ ' : '⚠ '}
        {message}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banniere: {
    borderWidth: 1,
    borderRadius: rayon,
    padding: espacements.m,
  },
  texte: {
    fontSize: tailles.normal,
    fontWeight: '600',
  },
});
