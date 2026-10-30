import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { couleurs, espacements } from '@/theme';

type Props = {
  valeur: string;
  onChange: (valeur: string) => void;
  longueur?: number;
};

type Touche = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0' | 'effacer' | '';

const LIGNES: Touche[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'effacer'],
];

function diametreTouche(largeurEcran: number): number {
  return Math.min(84, Math.max(64, Math.round(largeurEcran * 0.21)));
}

export function PaveNumerique({ valeur, onChange, longueur = 4 }: Props) {
  const { width } = useWindowDimensions();
  const diametre = diametreTouche(width);
  const ecart = Math.round(diametre / 4);
  const taillePoint = diametre >= 76 ? 14 : 12;

  function ajouter(chiffre: string) {
    if (valeur.length >= longueur) return;
    onChange(valeur + chiffre);
  }

  return (
    <View style={[styles.bloc, { gap: ecart + espacements.s }]}>
      <View style={[styles.points, { gap: espacements.m }]}>
        {Array.from({ length: longueur }, (_, index) => (
          <View
            key={index}
            style={[
              {
                width: taillePoint,
                height: taillePoint,
                borderRadius: taillePoint / 2,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: couleurs.principal,
              },
              index < valeur.length ? styles.pointRempli : null,
            ]}
          />
        ))}
      </View>
      <View style={[styles.grille, { gap: ecart }]}>
        {LIGNES.map((ligne, indexLigne) => (
          <View key={indexLigne} style={[styles.ligne, { gap: ecart }]}>
            {ligne.map((touche) => {
              if (touche === '') {
                return <View key={`vide-${indexLigne}`} style={{ width: diametre }} />;
              }
              const effacer = touche === 'effacer';
              return (
                <Pressable
                  key={touche}
                  accessibilityRole="button"
                  accessibilityLabel={effacer ? 'Effacer' : touche}
                  onPress={() => (effacer ? onChange(valeur.slice(0, -1)) : ajouter(touche))}
                  style={({ pressed }) => [
                    {
                      width: diametre,
                      height: diametre,
                      borderRadius: diametre / 2,
                      backgroundColor: couleurs.fondPuce,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    pressed && styles.appuye,
                  ]}
                >
                  <Text style={styles.texteTouche}>{effacer ? '⌫' : touche}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: {},
  points: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pointRempli: {
    backgroundColor: couleurs.principal,
  },
  grille: {},
  ligne: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  appuye: {
    backgroundColor: couleurs.desactive,
  },
  texteTouche: {
    fontSize: 28,
    fontWeight: '300',
    color: couleurs.texte,
  },
});
