import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { couleurs, espacements, ombres, polices } from '@/theme';

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
  return Math.min(76, Math.max(64, Math.round(largeurEcran * 0.185)));
}

export function PaveNumerique({ valeur, onChange, longueur = 4 }: Props) {
  const { width } = useWindowDimensions();
  const diametre = diametreTouche(width);
  const ecart = Math.round(diametre / 3.5);
  const taillePoint = 12;
  const codeComplet = valeur.length >= longueur;

  function ajouter(chiffre: string) {
    if (valeur.length >= longueur) return;
    onChange(valeur + chiffre);
  }

  return (
    <View style={[styles.bloc, { gap: ecart + espacements.s }]}>
      <View style={[styles.points, { gap: 18 }]}>
        {Array.from({ length: longueur }, (_, index) => {
          const rempli = index < valeur.length;
          return (
            <View
              key={index}
              style={[
                {
                  width: taillePoint,
                  height: taillePoint,
                  borderRadius: taillePoint / 2,
                },
                rempli
                  ? {
                      backgroundColor: codeComplet ? couleurs.succes : couleurs.principal,
                    }
                  : {
                      borderWidth: 1.5,
                      borderColor: couleurs.texteMuet,
                      backgroundColor: 'transparent',
                    },
              ]}
            />
          );
        })}
      </View>
      <View style={[styles.grille, { gap: ecart }]}>
        {LIGNES.map((ligne, indexLigne) => (
          <View key={indexLigne} style={[styles.ligne, { gap: 28 }]}>
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
                      backgroundColor: effacer
                        ? 'transparent'
                        : pressed
                          ? couleurs.principal
                          : couleurs.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: pressed ? [{ scale: 0.94 }] : undefined,
                      ...(effacer ? null : ombres.douce),
                    },
                  ]}
                >
                  {({ pressed }) => (
                    <Text
                      style={[
                        styles.texteTouche,
                        effacer && styles.effacer,
                        !effacer && pressed && styles.toucheAppuyee,
                      ]}
                    >
                      {effacer ? '⌫' : touche}
                    </Text>
                  )}
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
    height: 12,
    alignItems: 'center',
  },
  grille: {},
  ligne: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  texteTouche: {
    fontSize: 26,
    fontWeight: '400',
    color: couleurs.texte,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
  },
  toucheAppuyee: {
    color: couleurs.texteSurPrincipal,
  },
  effacer: {
    color: couleurs.texteSecondaire,
    fontSize: 22,
  },
});
