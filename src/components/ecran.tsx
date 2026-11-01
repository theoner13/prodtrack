import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { couleurs, espacements, polices, styleTitreEcran } from '@/theme';

/** Largeur max du contenu sur ordinateur (l’en-tête reste pleine largeur). */
const LARGEUR_MAX_CONTENU = 720;
/** En dessous, le contenu reste pleine largeur (téléphone / tablette). */
const SEUIL_ECRAN_LARGE = 1000;

type Props = {
  titre?: string;
  defilement?: boolean;
  children: ReactNode;
  enRafraichissement?: boolean;
  onRafraichir?: () => void;
  /** Zone fixe sous la liste (hors défilement), ex. bouton d'enregistrement. */
  pied?: ReactNode;
};

// Cadre commun à tous les écrans : marges 20, fond blanc, titre et défilement.
export function Ecran({
  titre,
  defilement = false,
  children,
  enRafraichissement = false,
  onRafraichir,
  pied,
}: Props) {
  const { width } = useWindowDimensions();
  const styleLargeur =
    width > SEUIL_ECRAN_LARGE
      ? { maxWidth: LARGEUR_MAX_CONTENU, width: '100%' as const, alignSelf: 'center' as const }
      : null;

  const contenu = (
    <>
      {titre ? <Text style={styles.titre}>{titre}</Text> : null}
      {children}
    </>
  );

  const refreshControl = onRafraichir ? (
    <RefreshControl
      refreshing={enRafraichissement}
      onRefresh={onRafraichir}
      colors={[couleurs.principal]}
      tintColor={couleurs.principal}
    />
  ) : undefined;

  return (
    <SafeAreaView
      style={styles.fond}
      edges={pied ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
    >
      {defilement ? (
        <View style={[styles.colonne, styleLargeur]}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.contenu}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            {contenu}
          </ScrollView>
          {pied ? <View style={styles.pied}>{pied}</View> : null}
        </View>
      ) : (
        <View style={[styles.contenu, styles.plein, styleLargeur]}>
          {contenu}
          {pied ? <View style={styles.pied}>{pied}</View> : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  colonne: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  contenu: {
    padding: espacements.l,
    gap: espacements.s,
  },
  plein: {
    flex: 1,
  },
  titre: {
    ...styleTitreEcran,
    marginBottom: espacements.xs,
    fontFamily: polices.sans,
  },
  pied: {
    paddingHorizontal: espacements.l,
    paddingTop: espacements.s,
    paddingBottom: espacements.s,
    gap: espacements.s,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
  },
});
