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
};

// Cadre commun à tous les écrans : marges, fond crème, titre et défilement.
export function Ecran({
  titre,
  defilement = false,
  children,
  enRafraichissement = false,
  onRafraichir,
}: Props) {
  const contenu = (
    <>
      {titre ? <Text style={styles.titre}>{titre}</Text> : null}
      {children}
    </>
  );

  return (
    <SafeAreaView style={styles.fond} edges={['top', 'left', 'right']}>
      {defilement ? (
        <ScrollView
          contentContainerStyle={styles.contenu}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRafraichir ? (
              <RefreshControl
                refreshing={enRafraichissement}
                onRefresh={onRafraichir}
                colors={[couleurs.principal]}
                tintColor={couleurs.principal}
              />
            ) : undefined
          }
        >
          {contenu}
        </ScrollView>
      ) : (
        <View style={[styles.contenu, styles.plein]}>{contenu}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  contenu: {
    padding: espacements.m,
    gap: espacements.m,
  },
  plein: {
    flex: 1,
  },
  titre: {
    fontSize: tailles.titre,
    fontWeight: '700',
    color: couleurs.texte,
  },
});
