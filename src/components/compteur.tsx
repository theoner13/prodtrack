import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { couleurs, polices, tailles } from '@/theme';

const DIAMETRE = 32;
/** hitSlop pour atteindre ≥ 48 px de zone tactile (32 + 8 × 2). */
const HIT_SLOP = 8;

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
  const couleurValeur = actif ? couleurs.texteSurPrincipal : couleurs.texteMuet;
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
        hitSlop={HIT_SLOP}
        style={({ pressed }) => [
          styles.bouton,
          { opacity: actif ? 1 : 0.3 },
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
            fontWeight: actif ? '500' : '400',
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : plus un`}
        onPress={() => onChange(valeur + 1)}
        hitSlop={HIT_SLOP}
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
    height: 40,
    paddingHorizontal: 4,
    borderRadius: 20,
  },
  piluleCompact: {
    height: 36,
    borderRadius: 18,
  },
  bouton: {
    width: DIAMETRE,
    height: DIAMETRE,
    borderRadius: DIAMETRE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appuye: {
    opacity: 0.75,
    transform: [{ scale: 0.92 }],
  },
  signe: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 20,
    fontFamily: polices.sans,
  },
  champ: {
    width: 34,
    height: DIAMETRE,
    borderWidth: 0,
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontSize: tailles.normal,
    fontFamily: polices.sans,
    padding: 0,
  },
  champCompact: {
    width: 30,
  },
});
