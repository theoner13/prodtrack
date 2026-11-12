import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform } from 'react-native';

type Props = {
  index: number;
  children: ReactNode;
};

/** Apparition douce (fondu + 12 px), décalée pour les 8 premiers éléments. */
export function VenteApparition({ index, children }: Props) {
  const opacite = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    let annule = false;
    const demarrer = async () => {
      const reduire =
        Platform.OS !== 'web' &&
        (await AccessibilityInfo.isReduceMotionEnabled().catch(() => false));
      if (annule) return;
      if (reduire || index >= 8) {
        opacite.setValue(1);
        translateY.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(opacite, {
          toValue: 1,
          duration: 280,
          delay: index * 35,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          delay: index * 35,
          useNativeDriver: true,
        }),
      ]).start();
    };
    void demarrer();
    return () => {
      annule = true;
    };
  }, [index, opacite, translateY]);

  return (
    <Animated.View style={{ opacity: opacite, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
