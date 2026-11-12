import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { couleurs, polices, tailles } from '@/theme';

type Props = {
  valeur: number;
  onChange: (valeur: number) => void;
  libelle?: string;
  compact?: boolean;
  /** Fond rouge quand valeur > 0 (ex. jeté). */
  danger?: boolean;
};

// Compteur − / + : boutons ≥ 44 px, valeur lisible (doigts farinés).
export function Compteur({
  valeur,
  onChange,
  libelle = 'Quantité',
  compact = false,
  danger = false,
}: Props) {
  function saisir(texte: string) {
    const chiffres = texte.replace(/[^0-9]/g, '');
    onChange(chiffres === '' ? 0 : parseInt(chiffres, 10));
  }

  // Boutons 44 px (doigts farinés) ; champ resserré pour laisser de la place au nom.
  const diametre = 44;
  const actif = valeur > 0;
  const fondPilule = actif
    ? danger
      ? couleurs.erreur
      : couleurs.principal
    : couleurs.fondPuce;
  const couleurValeur = actif ? couleurs.texteSurPrincipal : couleurs.texte;
  const couleurMoins = actif ? couleurs.texteSurPrincipal : couleurs.texte;
  const fondPlus = actif ? couleurs.texteSurPrincipal : couleurs.principal;
  const couleurPlus = actif ? couleurs.principal : couleurs.texteSurPrincipal;

  return (
    <View
      style={[
        styles.pilule,
        {
          backgroundColor: fondPilule,
          minHeight: diametre + 4,
          borderRadius: (diametre + 4) / 2,
          padding: 2,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : moins un`}
        disabled={valeur <= 0}
        onPress={() => onChange(Math.max(0, valeur - 1))}
        style={({ pressed }) => [
          {
            width: diametre,
            height: diametre,
            borderRadius: diametre / 2,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
          },
          !actif && styles.boutonMoinsRepos,
          pressed && styles.appuye,
        ]}
      >
        <Text style={[styles.signe, { color: couleurMoins }]}>−</Text>
      </Pressable>
      <TextInput
        accessibilityLabel={libelle}
        value={String(valeur)}
        onChangeText={saisir}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[
          styles.champ,
          compact && styles.champCompact,
          {
            color: couleurValeur,
            fontWeight: actif ? '600' : '500',
            height: diametre,
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : plus un`}
        onPress={() => onChange(valeur + 1)}
        style={({ pressed }) => [
          {
            width: diametre,
            height: diametre,
            borderRadius: diametre / 2,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            backgroundColor: fondPlus,
          },
          pressed && styles.appuye,
        ]}
      >
        <Text style={[styles.signe, { color: couleurPlus }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pilule: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 124,
  },
  boutonMoinsRepos: {
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  appuye: {
    opacity: 0.8,
    transform: [{ scale: 0.92 }],
  },
  signe: {
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 24,
    fontFamily: polices.sans,
  },
  champ: {
    width: 36,
    borderWidth: 0,
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontSize: tailles.grand,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  champCompact: {
    width: 36,
    fontSize: tailles.normal,
  },
});
