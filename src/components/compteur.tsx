import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { couleurs, polices, tailleToucheMin, tailles } from '@/theme';

const DIAMETRE = 36;

type Props = {
  valeur: number;
  onChange: (valeur: number) => void;
  libelle?: string;
  compact?: boolean;
  /** Fond rouge quand valeur > 0 (ex. jeté). */
  danger?: boolean;
};

// Compteur − / + en pilule beige / marron (maquettes Production / Fin de journée).
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
    <View style={[styles.pilule, compact && styles.piluleCompact, { backgroundColor: fondPilule }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : moins un`}
        disabled={valeur <= 0}
        onPress={() => onChange(Math.max(0, valeur - 1))}
        style={({ pressed }) => [
          styles.bouton,
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
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : plus un`}
        onPress={() => onChange(valeur + 1)}
        style={({ pressed }) => [
          styles.bouton,
          { backgroundColor: fondPlus },
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
    minHeight: tailleToucheMin,
    paddingHorizontal: 4,
    borderRadius: tailleToucheMin / 2,
  },
  piluleCompact: {
    minHeight: tailleToucheMin,
    borderRadius: tailleToucheMin / 2,
  },
  bouton: {
    width: tailleToucheMin,
    height: tailleToucheMin,
    borderRadius: tailleToucheMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** − visible même à zéro : fond beige + contour, pas semi-transparent. */
  boutonMoinsRepos: {
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: couleurs.soulignement,
  },
  appuye: {
    opacity: 0.75,
    transform: [{ scale: 0.92 }],
  },
  signe: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 22,
    fontFamily: polices.sans,
  },
  champ: {
    width: 40,
    height: DIAMETRE,
    borderWidth: 0,
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontSize: tailles.grand,
    fontFamily: polices.sans,
    padding: 0,
  },
  champCompact: {
    width: 36,
    fontSize: tailles.normal,
  },
});
