import { Pressable, StyleSheet, Text, View } from 'react-native';

import { couleurs, espacements, tailles } from '@/theme';

type Props = {
  valeur: string;
  onChange: (valeur: string) => void;
  longueur?: number;
};

const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'effacer'] as const;
const DIAMETRE = 56;

export function PaveNumerique({ valeur, onChange, longueur = 4 }: Props) {
  function ajouter(chiffre: string) {
    if (valeur.length >= longueur) return;
    onChange(valeur + chiffre);
  }

  return (
    <View style={styles.bloc}>
      <View style={styles.points}>
        {Array.from({ length: longueur }, (_, index) => (
          <View
            key={index}
            style={[styles.point, index < valeur.length ? styles.pointRempli : null]}
          />
        ))}
      </View>
      <View style={styles.grille}>
        {TOUCHES.map((touche) => {
          if (touche === '') return <View key="vide" style={styles.toucheVide} />;
          const effacer = touche === 'effacer';
          return (
            <Pressable
              key={touche}
              accessibilityRole="button"
              accessibilityLabel={effacer ? 'Effacer' : touche}
              onPress={() => (effacer ? onChange(valeur.slice(0, -1)) : ajouter(touche))}
              style={({ pressed }) => [styles.touche, pressed && styles.appuye]}
            >
              <Text style={styles.texteTouche}>{effacer ? '⌫' : touche}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: {
    gap: espacements.l,
  },
  points: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espacements.m,
  },
  point: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: couleurs.principal,
  },
  pointRempli: {
    backgroundColor: couleurs.principal,
  },
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: espacements.s,
  },
  touche: {
    width: DIAMETRE,
    height: DIAMETRE,
    marginHorizontal: '3%',
    borderRadius: DIAMETRE / 2,
    backgroundColor: couleurs.fondPuce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toucheVide: {
    width: DIAMETRE,
    marginHorizontal: '3%',
  },
  appuye: {
    backgroundColor: couleurs.desactive,
  },
  texteTouche: {
    fontSize: tailles.grand,
    fontWeight: '400',
    color: couleurs.texte,
  },
});
