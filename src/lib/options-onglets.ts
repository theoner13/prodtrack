import { couleurs, polices, tailles } from '@/theme';

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
  tabBarStyle: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    height: 84,
    paddingTop: 8,
    paddingBottom: 24,
  },
  tabBarLabelStyle: {
    fontSize: 10,
    fontFamily: polices.sans,
    fontWeight: '600' as const,
  },
  sceneStyle: { backgroundColor: couleurs.fond },
};
