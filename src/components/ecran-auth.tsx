import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { couleurs, espacements, polices, styleTitreEcran } from '@/theme';

type Props = {
  titre: string;
  children: ReactNode;
  /** Largeur max du bloc (défaut 400). */
  largeurMax?: number;
  /** Centrer verticalement quand le contenu tient à l’écran (défaut true). */
  centrerVerticalement?: boolean;
  /** Afficher le logo ProdTrack au-dessus du titre (défaut true). */
  avecLogo?: boolean;
};

/** Cadre des écrans d’auth : logo, titre centré, bloc limité en largeur. */
export function EcranAuth({
  titre,
  children,
  largeurMax = 400,
  centrerVerticalement = true,
  avecLogo = true,
}: Props) {
  return (
    <SafeAreaView style={styles.fond} edges={['top', 'left', 'right']}>
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
          <View style={[styles.bloc, { maxWidth: largeurMax }]}>
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
  logoWrap: {
    alignItems: 'center',
    marginBottom: espacements.s,
  },
  titre: {
    ...styleTitreEcran,
    textAlign: 'center',
    marginBottom: espacements.xs,
    fontFamily: polices.sans,
  },
});
