import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Logo } from '@/components/logo';
import { couleurs, polices } from '@/theme';

const TAILLE_LOGO = 210;
const NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Calque d'accueil plein écran (Splash-beige) : logo en fondu, barre, nom boutique.
 * Une seule fois au chargement. Ne retarde pas le montage du reste.
 */
export function AnimationAccueil() {
  const { boutiqueNom } = useAuth();
  const [visible, setVisible] = useState(true);
  const [pointerActif, setPointerActif] = useState(true);

  const opaciteFond = useRef(new Animated.Value(1)).current;
  const opaciteLogo = useRef(new Animated.Value(0)).current;
  const echelleLogo = useRef(new Animated.Value(0.92)).current;
  const barre = useRef(new Animated.Value(0)).current;
  const opaciteTexte = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let annule = false;

    const terminer = () => {
      if (annule) return;
      setVisible(false);
    };

    const lancer = async () => {
      const reduire = await AccessibilityInfo.isReduceMotionEnabled();
      if (annule) return;

      if (reduire) {
        opaciteLogo.setValue(1);
        echelleLogo.setValue(1);
        barre.setValue(1);
        opaciteTexte.setValue(1);
        setPointerActif(false);
        Animated.timing(opaciteFond, {
          toValue: 0,
          duration: 300,
          useNativeDriver: NATIVE_DRIVER,
        }).start(terminer);
        return;
      }

      // Entrée logo ≈ markIn 1,1 s (fondu + scale, flou simulé par scale).
      Animated.parallel([
        Animated.timing(opaciteLogo, {
          toValue: 1,
          duration: 1100,
          easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(echelleLogo, {
          toValue: 1,
          duration: 1100,
          easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(opaciteTexte, {
          toValue: 1,
          duration: 600,
          delay: 400,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(barre, {
          toValue: 1,
          duration: 1600,
          delay: 300,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
          useNativeDriver: false,
        }),
      ]).start();

      // Pause puis sortie.
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(opaciteFond, {
          toValue: 0,
          duration: 450,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]).start(({ finished }) => {
        if (finished) terminer();
      });

      const timerPointer = setTimeout(() => {
        if (!annule) setPointerActif(false);
      }, 2000);
      return () => clearTimeout(timerPointer);
    };

    let nettoyerPointer: (() => void) | undefined;
    void lancer().then((cleanup) => {
      nettoyerPointer = cleanup;
    });

    return () => {
      annule = true;
      nettoyerPointer?.();
      opaciteFond.stopAnimation();
      opaciteLogo.stopAnimation();
      echelleLogo.stopAnimation();
      barre.stopAnimation();
      opaciteTexte.stopAnimation();
    };
  }, [opaciteFond, opaciteLogo, echelleLogo, barre, opaciteTexte]);

  if (!visible) return null;

  const largeurBarre = barre.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      pointerEvents={pointerActif ? 'auto' : 'none'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[styles.calque, { opacity: opaciteFond }]}
    >
      <View style={styles.centre}>
        <Animated.View
          style={{
            opacity: opaciteLogo,
            transform: [{ scale: echelleLogo }],
          }}
        >
          <Logo variante="complet" taille={TAILLE_LOGO} />
        </Animated.View>
      </View>
      <View style={styles.bas}>
        <View style={styles.piste}>
          <Animated.View style={[styles.remplissage, { width: largeurBarre }]} />
        </View>
        {boutiqueNom ? (
          <Animated.Text style={[styles.nomBoutique, { opacity: opaciteTexte }]}>
            {boutiqueNom}
          </Animated.Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  calque: {
    ...StyleSheet.absoluteFill,
    backgroundColor: couleurs.fond,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centre: {
    alignItems: 'center',
  },
  bas: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 64,
    alignItems: 'center',
    gap: 14,
  },
  piste: {
    width: 64,
    height: 2,
    borderRadius: 2,
    backgroundColor: couleurs.bordure,
    overflow: 'hidden',
  },
  remplissage: {
    height: '100%',
    backgroundColor: couleurs.croute,
  },
  nomBoutique: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
});
