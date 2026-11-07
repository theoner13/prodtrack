import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { couleurs, polices, tailles } from '@/theme';

type Option<T extends string> = {
  valeur: T;
  libelle: string;
  /** Libellé d’accessibilité (sinon le libellé visible). */
  accessibilite?: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  valeur: T;
  onChange: (valeur: T) => void;
  desactive?: boolean;
};

/** Sélecteur à pastilles côte à côte (type produit, conservation…). */
export function ChoixSegmente<T extends string>({
  options,
  valeur,
  onChange,
  desactive = false,
}: Props<T>) {
  const { width } = useWindowDimensions();
  // À 390 px, 4 libellés longs sont tronqués en une seule ligne → grille 2×2.
  const grille = options.length >= 4 && width < 520;

  return (
    <View
      style={[
        styles.cadre,
        grille && styles.cadreGrille,
        desactive && styles.cadreDesactive,
      ]}
    >
      {options.map((option) => {
        const choisi = option.valeur === valeur;
        return (
          <Pressable
            key={option.valeur}
            accessibilityRole="button"
            accessibilityLabel={option.accessibilite ?? option.libelle}
            accessibilityState={{ selected: choisi, disabled: desactive }}
            disabled={desactive}
            onPress={() => onChange(option.valeur)}
            style={[
              styles.option,
              grille && styles.optionGrille,
              choisi && styles.optionChoisie,
            ]}
          >
            <Text
              style={[
                styles.texte,
                grille && styles.texteGrille,
                choisi && styles.texteChoisi,
                desactive && !choisi && styles.texteDesactive,
              ]}
              numberOfLines={grille ? 2 : 1}
            >
              {option.libelle}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    flexDirection: 'row',
    height: 38,
    padding: 2,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: couleurs.fondSegment,
  },
  cadreGrille: {
    flexWrap: 'wrap',
    height: undefined,
    rowGap: 2,
    columnGap: 2,
  },
  cadreDesactive: {
    opacity: 0.7,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  optionGrille: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 36,
    paddingVertical: 6,
  },
  optionChoisie: {
    backgroundColor: couleurs.principal,
  },
  texte: {
    fontSize: tailles.petit,
    fontWeight: '400',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
    textAlign: 'center',
  },
  texteGrille: {
    fontSize: 13,
  },
  texteChoisi: {
    color: couleurs.texteSurPrincipal,
    fontWeight: '500',
  },
  texteDesactive: {
    color: couleurs.texteMuet,
  },
});
