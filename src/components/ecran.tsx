import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { couleurs, espacements, tailles } from '@/theme';

type Props = {
  titre?: string;
  defilement?: boolean;
  children: ReactNode;
  enRafraichissement?: boolean;
  onRafraichir?: () => void;
  /** Zone fixe sous la liste (hors défilement), ex. bouton d'enregistrement. */
  pied?: ReactNode;
};

// Cadre commun à tous les écrans : marges 16, fond blanc, titre et défilement.
export function Ecran({
  titre,
  defilement = false,
  children,
  enRafraichissement = false,
  onRafraichir,
  pied,
}: Props) {
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
        <View style={styles.colonne}>
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
        <View style={[styles.contenu, styles.plein]}>
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
    padding: espacements.m,
    gap: espacements.s,
  },
  plein: {
    flex: 1,
  },
  titre: {
    fontSize: tailles.titre,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  pied: {
    paddingHorizontal: espacements.m,
    paddingTop: espacements.s,
    paddingBottom: espacements.s,
    gap: espacements.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
  },
});
