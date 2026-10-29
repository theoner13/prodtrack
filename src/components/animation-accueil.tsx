import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const TAILLE_LOGO = 140;
const RAYON_LOGO = Math.round(TAILLE_LOGO * 0.28);
const NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Calque d'accueil plein écran, une seule fois au chargement de l'appli.
 * Ne retarde pas le montage du reste : se superpose seulement.
 */
export function AnimationAccueil() {
  const [visible, setVisible] = useState(true);
  const [pointerActif, setPointerActif] = useState(true);

  const opaciteFond = useRef(new Animated.Value(1)).current;
  const opaciteLogo = useRef(new Animated.Value(0)).current;
  const echelleLogo = useRef(new Animated.Value(0.6)).current;
  const opaciteTexte = useRef(new Animated.Value(0)).current;
  const translateTexte = useRef(new Animated.Value(8)).current;

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
        opaciteTexte.setValue(1);
        translateTexte.setValue(0);
        setPointerActif(false);
        Animated.timing(opaciteFond, {
          toValue: 0,
          duration: 300,
          useNativeDriver: NATIVE_DRIVER,
        }).start(terminer);
        return;
      }

      // Entrée ≈ 500 ms : logo (fondu + spring), puis texte.
      Animated.parallel([
        Animated.timing(opaciteLogo, {
          toValue: 1,
          duration: 400,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.spring(echelleLogo, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]).start();

      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(opaciteTexte, {
            toValue: 1,
            duration: 320,
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(translateTexte, {
            toValue: 0,
            duration: 320,
            useNativeDriver: NATIVE_DRIVER,
          }),
        ]),
      ]).start();

      // Pause ≈ 400 ms puis sortie ≈ 450 ms (total ≈ 1,5 s).
      Animated.sequence([
        Animated.delay(900),
        Animated.parallel([
          Animated.timing(opaciteFond, {
            toValue: 0,
            duration: 450,
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(opaciteLogo, {
            toValue: 0,
            duration: 450,
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(echelleLogo, {
            toValue: 0.3,
            duration: 450,
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(opaciteTexte, {
            toValue: 0,
            duration: 450,
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(translateTexte, {
            toValue: -4,
            duration: 450,
            useNativeDriver: NATIVE_DRIVER,
          }),
        ]),
      ]).start(({ finished }) => {
        if (finished) terminer();
      });

      // Pendant la sortie : ne plus bloquer les clics.
      const timerPointer = setTimeout(() => {
        if (!annule) setPointerActif(false);
      }, 900);
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
      opaciteTexte.stopAnimation();
      translateTexte.stopAnimation();
    };
  }, [opaciteFond, opaciteLogo, echelleLogo, opaciteTexte, translateTexte]);

  if (!visible) return null;

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
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
        <Animated.View
          style={{
            opacity: opaciteTexte,
            transform: [{ translateY: translateTexte }],
          }}
        >
          <Text style={styles.nom}>
            Prod
            <Text style={styles.track}>Track</Text>
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  calque: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centre: {
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    width: TAILLE_LOGO,
    height: TAILLE_LOGO,
    borderRadius: RAYON_LOGO,
    overflow: 'hidden',
  },
  nom: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  track: {
    color: '#A86B2D',
  },
});
