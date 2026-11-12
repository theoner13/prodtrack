import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import {
  couleurs,
  espacements,
  haloAmbre,
  ombres,
  polices,
  rayonCarte,
  seuilOrdinateur,
  styleTitreEcran,
} from '@/theme';

type Props = {
  titre: string;
  children: ReactNode;
  /** Largeur max du bloc (défaut 400). */
  largeurMax?: number;
  /** Centrer verticalement quand le contenu tient à l’écran (défaut true). */
  centrerVerticalement?: boolean;
  /** Afficher le logo ProdTrack au-dessus du titre (défaut true). */
  avecLogo?: boolean;
  /** Bouton retour (ou autre) collé en haut à gauche, hors du bloc centré. */
  hautGauche?: ReactNode;
};

/** Cadre des écrans d’auth : fond crème + halo ambre, carte centrée sur ordinateur. */
export function EcranAuth({
  titre,
  children,
  largeurMax = 420,
  centrerVerticalement = true,
  avecLogo = true,
  hautGauche,
}: Props) {
  const { width } = useWindowDimensions();
  const carte = width >= seuilOrdinateur;

  return (
    <SafeAreaView style={styles.fond} edges={['top', 'left', 'right', 'bottom']}>
      <View pointerEvents="none" style={[styles.halo, haloAmbre()]} />
      {hautGauche ? <View style={styles.hautGauche}>{hautGauche}</View> : null}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            centrerVerticalement ? styles.scrollCentre : null,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.bloc,
              { maxWidth: largeurMax },
              carte ? [styles.carte, ombres.feuille] : null,
            ]}
          >
            {avecLogo ? (
              <View style={styles.logoWrap}>
                <Logo variante="complet" taille={160} />
              </View>
            ) : null}
            <Text style={styles.titre}>{titre}</Text>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  halo: {
    ...StyleSheet.absoluteFill,
  },
  hautGauche: {
    paddingHorizontal: espacements.l,
    paddingTop: espacements.xs,
    alignSelf: 'flex-start',
    zIndex: 2,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: espacements.l,
  },
  scrollCentre: {
    justifyContent: 'center',
  },
  bloc: {
    width: '100%',
    alignSelf: 'center',
    gap: espacements.s,
  },
  carte: {
    backgroundColor: couleurs.surface,
    borderRadius: rayonCarte,
    padding: espacements.xl,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: espacements.l,
  },
  titre: {
    ...styleTitreEcran,
    textAlign: 'center',
    marginBottom: espacements.m,
    fontFamily: polices.sans,
  },
});
