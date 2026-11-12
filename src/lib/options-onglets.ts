import {
  couleurs,
  espacements,
  largeurMaxContenu,
  polices,
} from '@/theme';

/** Style du titre d'en-tête : plus grand sur ordinateur. */
export function styleTitreEntete(ordinateur: boolean) {
  return ordinateur
    ? {
        fontSize: 28,
        fontWeight: '600' as const,
        letterSpacing: -0.6,
        fontFamily: polices.sans,
        color: couleurs.texte,
      }
    : {
        fontSize: 17,
        fontWeight: '600' as const,
        fontFamily: polices.sans,
        color: couleurs.texte,
      };
}

/** Style de la barre d'en-tête (plus haute sur ordinateur). */
export function styleEntete(ordinateur: boolean) {
  return {
    backgroundColor: couleurs.fond,
    borderBottomWidth: 0,
    ...(ordinateur ? { height: 56 } : null),
  };
}

/**
 * Aligne le titre d'en-tête sur le bord gauche du contenu
 * (même largeur max et padding que Ecran).
 */
export function styleConteneurTitreEntete(ordinateur: boolean) {
  if (!ordinateur) return undefined;
  return {
    maxWidth: largeurMaxContenu,
    width: '100%' as const,
    alignSelf: 'center' as const,
    paddingHorizontal: espacements.l,
    left: 0,
    right: 0,
  };
}

/** Options communes des barres d'onglets (admin, pâtissier, vente, laboratoire).
 *  `tabBar` se passe sur `<Tabs>` (pas dans screenOptions). */
export const optionsOngletsCommunes = {
  headerStyle: {
    backgroundColor: couleurs.fond,
    borderBottomWidth: 0,
  },
  headerShadowVisible: false,
  headerTintColor: couleurs.texte,
  headerTitleStyle: styleTitreEntete(false),
  headerTitleAlign: 'left' as const,
  tabBarActiveTintColor: couleurs.texteSurPrincipal,
  tabBarInactiveTintColor: couleurs.ongletInactifTexte,
  tabBarStyle: {
    position: 'absolute' as const,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    borderRightWidth: 0,
  },
  tabBarLabelStyle: {
    fontSize: 10,
    fontFamily: polices.sans,
    fontWeight: '600' as const,
  },
  sceneStyle: { backgroundColor: couleurs.fond },
};

/** Options d'onglets adaptées à la largeur (titre et hauteur d'en-tête). */
export function optionsOngletsPourEcran(ordinateur: boolean) {
  return {
    ...optionsOngletsCommunes,
    headerStyle: styleEntete(ordinateur),
    headerTitleStyle: styleTitreEntete(ordinateur),
    headerTitleAlign: 'left' as const,
    headerTitleContainerStyle: styleConteneurTitreEntete(ordinateur),
  };
}
