import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { couleurs, hauteurBouton, rayon, tailles } from '@/theme';

const TAILLE_COMPACT = 44;

type Props = {
  valeur: number;
  onChange: (valeur: number) => void;
  libelle?: string; // lu par les lecteurs d'écran
  compact?: boolean; // boutons et champ plus petits (≥ 44 px)
};

// Compteur − / + avec champ numérique au centre. Valeur entière ≥ 0.
export function Compteur({ valeur, onChange, libelle = 'Quantité', compact = false }: Props) {
  function saisir(texte: string) {
    const chiffres = texte.replace(/[^0-9]/g, '');
    onChange(chiffres === '' ? 0 : parseInt(chiffres, 10));
  }

  const taille = compact ? TAILLE_COMPACT : hauteurBouton;

  return (
    <View style={styles.ligne}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : moins un`}
        disabled={valeur <= 0}
        onPress={() => onChange(Math.max(0, valeur - 1))}
        style={({ pressed }) => [
          styles.bouton,
          { width: taille, height: taille },
          valeur <= 0 && styles.inactif,
          pressed && styles.appuye,
        ]}
      >
        <Text style={[styles.signe, compact && styles.signeCompact]}>−</Text>
      </Pressable>
      <TextInput
        accessibilityLabel={libelle}
        value={String(valeur)}
        onChangeText={saisir}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[styles.champ, compact && styles.champCompact, { height: taille }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : plus un`}
        onPress={() => onChange(valeur + 1)}
        style={({ pressed }) => [
          styles.bouton,
          { width: taille, height: taille },
          pressed && styles.appuye,
        ]}
      >
        <Text style={[styles.signe, compact && styles.signeCompact]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bouton: {
    width: hauteurBouton,
    height: hauteurBouton,
    borderRadius: rayon,
    backgroundColor: couleurs.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactif: {
    backgroundColor: couleurs.desactive,
  },
  appuye: {
    opacity: 0.8,
  },
  signe: {
    fontSize: tailles.titre,
    fontWeight: '700',
    color: couleurs.texteSurPrincipal,
  },
  signeCompact: {
    fontSize: tailles.grand,
  },
  champ: {
    width: 64,
    height: hauteurBouton,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    backgroundColor: couleurs.surface,
    textAlign: 'center',
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.texte,
  },
  champCompact: {
    width: 48,
    fontSize: tailles.normal,
  },
});
