import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { couleurs, polices } from '@/theme';

type Props = {
  onPress: () => void;
  /** Texte visible. Défaut « Retour » (les tests cliquent sur ce libellé). */
  titre?: string;
};

/**
 * Bouton retour unique : flèche + libellé, zone tactile ≥ 56×56, en haut à gauche.
 */
export function BoutonRetour({ onPress, titre = 'Retour' }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={({ pressed }) => [styles.zone, pressed && styles.appuye]}
    >
      <View style={styles.contenu}>
        <Ionicons name="chevron-back" size={26} color={couleurs.principal} />
        <Text style={styles.texte}>{titre}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zone: {
    minWidth: 56,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
  },
  contenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  texte: {
    fontSize: 17,
    fontWeight: '600',
    color: couleurs.principal,
    fontFamily: polices.sans,
  },
  appuye: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
});
