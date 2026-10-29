import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { couleurs, tailles } from '@/theme';

const DIAMETRE = 32;
const HIT_SLOP = 6; // 32 + 6×2 = 44

type Props = {
  valeur: number;
  onChange: (valeur: number) => void;
  libelle?: string; // lu par les lecteurs d'écran
  compact?: boolean; // boutons et champ plus petits (≥ 44 px)
};

// Compteur − / + discret (ronds gris) avec champ numérique au centre. Valeur entière ≥ 0.
export function Compteur({ valeur, onChange, libelle = 'Quantité', compact = false }: Props) {
  function saisir(texte: string) {
    const chiffres = texte.replace(/[^0-9]/g, '');
    onChange(chiffres === '' ? 0 : parseInt(chiffres, 10));
  }

  const desactiveMoins = valeur <= 0;

  return (
    <View style={styles.ligne}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : moins un`}
        disabled={desactiveMoins}
        onPress={() => onChange(Math.max(0, valeur - 1))}
        hitSlop={HIT_SLOP}
        style={({ pressed }) => [
          styles.bouton,
          desactiveMoins && styles.inactif,
          pressed && styles.appuye,
        ]}
      >
        <Text style={[styles.signe, desactiveMoins && styles.signeInactif]}>−</Text>
      </Pressable>
      <TextInput
        accessibilityLabel={libelle}
        value={String(valeur)}
        onChangeText={saisir}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[styles.champ, compact && styles.champCompact]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : plus un`}
        onPress={() => onChange(valeur + 1)}
        hitSlop={HIT_SLOP}
        style={({ pressed }) => [styles.bouton, pressed && styles.appuye]}
      >
        <Text style={styles.signe}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bouton: {
    width: DIAMETRE,
    height: DIAMETRE,
    borderRadius: DIAMETRE / 2,
    backgroundColor: couleurs.fondPuce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactif: {
    backgroundColor: couleurs.fondPuce,
  },
  appuye: {
    opacity: 0.7,
  },
  signe: {
    fontSize: 18,
    fontWeight: '500',
    color: couleurs.texte,
    lineHeight: 20,
  },
  signeInactif: {
    color: couleurs.desactive,
  },
  champ: {
    width: 44,
    height: DIAMETRE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: couleurs.bordure,
    borderRadius: 8,
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
    padding: 0,
  },
  champCompact: {
    width: 40,
  },
});
