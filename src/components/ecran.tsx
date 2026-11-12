import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  couleurs,
  espacements,
  hauteurBarreOngletsFlottante,
  largeurMaxContenu,
  ombres,
  polices,
  seuilOrdinateur,
  styleTitreEcran,
} from '@/theme';

type Props = {
  titre?: string;
  defilement?: boolean;
  children: ReactNode;
  enRafraichissement?: boolean;
  onRafraichir?: () => void;
  /** Zone fixe sous la liste (hors défilement), ex. bouton d'enregistrement. */
  pied?: ReactNode;
};

// Cadre commun : fond crème, largeur max adaptée, pied flottant au-dessus de la barre.
export function Ecran({
  titre,
  defilement = false,
  children,
  enRafraichissement = false,
  onRafraichir,
  pied,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const ordinateur = width >= seuilOrdinateur;
  const [hauteurPied, setHauteurPied] = useState(0);
  const styleLargeur =
    width > seuilOrdinateur
      ? { maxWidth: largeurMaxContenu, width: '100%' as const, alignSelf: 'center' as const }
      : null;

  const margeBarre = ordinateur
    ? 0
    : hauteurBarreOngletsFlottante + Math.max(insets.bottom, 12);

  const paddingBasScroll = pied
    ? hauteurPied + (ordinateur ? espacements.l : margeBarre + 12)
    : ordinateur
      ? espacements.xl
      : margeBarre + 20;

  function mesurerPied(event: LayoutChangeEvent) {
    const suivante = event.nativeEvent.layout.height;
    setHauteurPied((actuelle) => (actuelle === suivante ? actuelle : suivante));
  }

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

  const piedFlottant = pied ? (
    <View
      onLayout={mesurerPied}
      style={[
        styles.pied,
        ordinateur
          ? styles.piedOrdinateur
          : {
              marginBottom: margeBarre + 12,
            },
        Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            } as object)
          : null,
      ]}
    >
      {pied}
    </View>
  ) : null;

  return (
    <SafeAreaView
      style={styles.fond}
      edges={pied ? ['top', 'left', 'right'] : ['top', 'left', 'right']}
    >
      {defilement ? (
        <View style={[styles.colonne, styleLargeur]}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.contenu, { paddingBottom: paddingBasScroll }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={ordinateur}
          >
            {contenu}
          </ScrollView>
          {piedFlottant}
        </View>
      ) : (
        <View style={[styles.contenu, styles.plein, styleLargeur, { paddingBottom: pied ? 0 : paddingBasScroll }]}>
          {contenu}
          {piedFlottant}
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
    marginHorizontal: espacements.m,
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.s,
    gap: espacements.s,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    ...ombres.douce,
  },
  piedOrdinateur: {
    marginBottom: espacements.m,
    marginTop: espacements.s,
  },
});
