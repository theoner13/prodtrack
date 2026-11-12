import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

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

/** Sélecteur à pastilles avec indicateur glissant ; grille 2×2 si ≥ 4 options sur téléphone. */
export function ChoixSegmente<T extends string>({
  options,
  valeur,
  onChange,
  desactive = false,
}: Props<T>) {
  const { width } = useWindowDimensions();
  const grille = options.length >= 4 && width < 520;
  const index = Math.max(
    0,
    options.findIndex((option) => option.valeur === valeur),
  );
  const [largeur, setLargeur] = useState(0);
  const glisse = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.spring(glisse, {
      toValue: index,
      useNativeDriver: false,
      friction: 8,
      tension: 120,
    }).start();
  }, [index, glisse]);

  function onLayoutCadre(event: LayoutChangeEvent) {
    setLargeur(event.nativeEvent.layout.width);
  }

  const largeurOption =
    !grille && options.length > 0 && largeur > 0
      ? (largeur - 4) / options.length
      : 0;

  return (
    <View
      onLayout={onLayoutCadre}
      style={[
        styles.cadre,
        grille && styles.cadreGrille,
        desactive && styles.cadreDesactive,
      ]}
    >
      {!grille && largeurOption > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicateur,
            {
              width: largeurOption,
              transform: [
                {
                  translateX: glisse.interpolate({
                    inputRange: [0, Math.max(options.length - 1, 1)],
                    outputRange: [0, largeurOption * Math.max(options.length - 1, 0)],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
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
              grille && choisi && styles.optionChoisie,
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
    minHeight: 42,
    padding: 2,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: couleurs.fondSegment,
    position: 'relative',
  },
  cadreGrille: {
    flexWrap: 'wrap',
    height: 'auto',
    rowGap: 2,
    columnGap: 2,
  },
  cadreDesactive: {
    opacity: 0.7,
  },
  indicateur: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 12,
    backgroundColor: couleurs.principal,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  optionGrille: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 40,
    paddingVertical: 8,
  },
  optionChoisie: {
    backgroundColor: couleurs.principal,
  },
  texte: {
    fontSize: tailles.petit,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
    textAlign: 'center',
  },
  texteGrille: {
    fontSize: 13,
  },
  texteChoisi: {
    color: couleurs.texteSurPrincipal,
    fontWeight: '600',
  },
  texteDesactive: {
    color: couleurs.texteMuet,
  },
});
