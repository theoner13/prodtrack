import { Pressable, StyleSheet, Text, View } from 'react-native';

import { couleurs, rayon, tailles } from '@/theme';

type Option<T extends string> = {
  valeur: T;
  libelle: string;
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
  return (
    <View style={[styles.cadre, desactive && styles.cadreDesactive]}>
      {options.map((option) => {
        const choisi = option.valeur === valeur;
        return (
          <Pressable
            key={option.valeur}
            accessibilityRole="button"
            accessibilityState={{ selected: choisi, disabled: desactive }}
            disabled={desactive}
            onPress={() => onChange(option.valeur)}
            style={[styles.option, choisi && styles.optionChoisie]}
          >
            <Text
              style={[
                styles.texte,
                choisi && styles.texteChoisi,
                desactive && !choisi && styles.texteDesactive,
              ]}
              numberOfLines={1}
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
    height: 40,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    overflow: 'hidden',
    backgroundColor: couleurs.surface,
  },
  cadreDesactive: {
    opacity: 0.7,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: couleurs.surface,
  },
  optionChoisie: {
    backgroundColor: couleurs.principal,
  },
  texte: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
  },
  texteChoisi: {
    color: couleurs.texteSurPrincipal,
  },
  texteDesactive: {
    color: couleurs.texteSecondaire,
  },
});
