import { Image, View, type ImageStyle, type StyleProp } from 'react-native';

type Variante = 'icone' | 'complet';

type Props = {
  /** Largeur en pixels (défaut : icône 38, complet 210). */
  taille?: number;
  /** icone = baguette seule ; complet = baguette + mot ProdTrack. */
  variante?: Variante;
  style?: StyleProp<ImageStyle>;
};

const RATIO = {
  // Maquettes : 38×24 (icône), 210×167 (complet).
  icone: 24 / 38,
  complet: 167 / 210,
} as const;

const SOURCES = {
  icone: require('../../assets/images/logo-beige.png'),
  complet: require('../../assets/images/logo-beige-complet.png'),
} as const;

/** Logo ProdTrack sans fond carré — décoratif, sans libellé d’accessibilité. */
export function Logo({ taille, variante = 'icone', style }: Props) {
  const largeur = taille ?? (variante === 'complet' ? 210 : 38);
  const hauteur = Math.round(largeur * RATIO[variante]);
  return (
    <Image
      source={SOURCES[variante]}
      style={[{ width: largeur, height: hauteur, resizeMode: 'contain' }, style]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      accessibilityIgnoresInvertColors
    />
  );
}

/** Petit logo pour headerLeft (marge gauche 16 px). */
export function LogoEntete() {
  return (
    <View style={{ marginLeft: 16, justifyContent: 'center' }}>
      <Logo taille={38} variante="icone" />
    </View>
  );
}
