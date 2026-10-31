import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { couleurs, espacements, polices, rayon, tailles } from '@/theme';

type Props = {
  message: string | null;
  type?: 'succes' | 'erreur';
  onFermer: () => void;
  duree?: number;
};

// Bannière de confirmation (ou d'erreur) qui disparaît toute seule.
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
        succes
          ? { backgroundColor: couleurs.principal }
          : { backgroundColor: couleurs.erreurClair, borderWidth: 1, borderColor: couleurs.erreur },
      ]}
    >
      <Text
        style={[
          styles.texte,
          { color: succes ? couleurs.texteSurPrincipal : couleurs.erreur },
        ]}
      >
        {succes ? '✓ ' : '⚠ '}
        {message}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banniere: {
    borderRadius: rayon,
    padding: espacements.m,
  },
  texte: {
    fontSize: tailles.petit,
    fontWeight: '500',
    fontFamily: polices.sans,
  },
});
