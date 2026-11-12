import { Pressable, StyleSheet, Text } from 'react-native';

import {
  couleurs,
  espacements,
  polices,
  rayonPilule,
  tailleToucheMin,
  tailles,
} from '@/theme';

type Props = {
  libelle: string;
  active: boolean;
  onPress: () => void;
};

/** Pilule de filtre admin (≥ 48 px de hauteur tactile). */
export function AdminPuce({ libelle, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.puce,
        active && styles.puceActive,
        pressed && styles.appuye,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.texte, active && styles.texteActive]}>{libelle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  puce: {
    minHeight: tailleToucheMin,
    paddingHorizontal: espacements.m,
    borderRadius: rayonPilule,
    backgroundColor: couleurs.fondPuce,
    justifyContent: 'center',
    alignItems: 'center',
  },
  puceActive: {
    backgroundColor: couleurs.principal,
  },
  texte: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontWeight: '600',
    fontFamily: polices.sans,
  },
  texteActive: {
    color: couleurs.texteSurPrincipal,
  },
  appuye: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
});
