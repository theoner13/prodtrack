import type { ColorValue } from 'react-native';
import { Text } from 'react-native';

import { couleurs, polices } from '@/theme';

type PropsLibelle = {
  focused: boolean;
  color: ColorValue;
  position: 'beside-icon' | 'below-icon';
  children: string;
  /** Taille de base ; s’ajuste automatiquement si l’espace manque. */
  fontSize?: number;
};

/** Libellé d’onglet : une ligne, taille ajustée pour éviter la troncature. */
export function LibelleOnglet({ color, children, fontSize = 10 }: PropsLibelle) {
  return (
    <Text
      style={{
        color,
        fontSize,
        fontFamily: polices.sans,
        fontWeight: '600',
        textAlign: 'center',
      }}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
    >
      {children}
    </Text>
  );
}

function fabriquerLibelle(fontSize: number) {
  return function tabBarLabel(props: {
    focused: boolean;
    color: ColorValue;
    position: 'beside-icon' | 'below-icon';
    children: string;
  }) {
    return <LibelleOnglet {...props} fontSize={fontSize} />;
  };
}

/** Options communes des barres d'onglets (admin, pâtissier, vente). */
export const optionsOngletsCommunes = {
  headerStyle: {
    backgroundColor: couleurs.fond,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  headerShadowVisible: false,
  headerTintColor: couleurs.texte,
  headerTitleStyle: {
    fontSize: 16,
    fontWeight: '500' as const,
    fontFamily: polices.sans,
    color: couleurs.texte,
  },
  tabBarActiveTintColor: couleurs.texte,
  tabBarInactiveTintColor: couleurs.ongletInactifTexte,
  // Toujours icône au-dessus du texte (évite le décalage de la pastille sur écran large).
  tabBarLabelPosition: 'below-icon' as const,
  tabBarStyle: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    height: 84,
    paddingTop: 8,
    paddingBottom: 24,
  },
  tabBarLabel: fabriquerLibelle(10),
  sceneStyle: { backgroundColor: couleurs.fond },
};

/** Variante pour 6 onglets (pâtissier) : libellé un peu plus petit pour éviter « Command… ». */
export const optionsOngletsDenses = {
  ...optionsOngletsCommunes,
  tabBarLabel: fabriquerLibelle(9),
};
