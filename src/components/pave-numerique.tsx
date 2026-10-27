import { Pressable, StyleSheet, Text, View } from 'react-native';

import { couleurs, espacements, hauteurBouton, rayon, tailles } from '@/theme';

type Props = {
  valeur: string;
  onChange: (valeur: string) => void;
  longueur?: number;
};

const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'effacer'] as const;

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
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
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
    width: '30%',
    minHeight: hauteurBouton,
    borderRadius: rayon,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toucheVide: {
    width: '30%',
  },
  appuye: {
    backgroundColor: couleurs.principalClair,
  },
  texteTouche: {
    fontSize: tailles.titre,
    fontWeight: '700',
    color: couleurs.texte,
  },
});
