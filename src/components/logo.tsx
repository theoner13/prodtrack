import { Image, type ImageStyle, type StyleProp } from 'react-native';

type Props = {
  /** Taille du carré en pixels (défaut 72). */
  taille?: number;
  style?: StyleProp<ImageStyle>;
};

/** Logo ProdTrack (carré arrondi), décoratif — sans libellé d’accessibilité. */
export function Logo({ taille = 72, style }: Props) {
  const rayon = Math.round(taille * 0.28);
  return (
    <Image
      source={require('../../assets/images/icon.png')}
      style={[
        {
          width: taille,
          height: taille,
          borderRadius: rayon,
          overflow: 'hidden',
        },
        style,
      ]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      accessibilityIgnoresInvertColors
    />
  );
}
