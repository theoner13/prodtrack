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
import { couleurs, espacements, tailles } from '@/theme';

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
                <Logo />
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
    padding: espacements.m,
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
    marginBottom: espacements.xs,
  },
  titre: {
    fontSize: tailles.titre,
    fontWeight: '600',
    color: couleurs.texte,
    textAlign: 'center',
    marginBottom: espacements.xs,
  },
});
