import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { couleurs, degradeBoutonPrincipal, espacements, polices, rayonPilule, tailles } from '@/theme';

type Props = {
  message: string | null;
  type?: 'succes' | 'erreur';
  onFermer: () => void;
  duree?: number;
};

// Bannière de confirmation (ou d'erreur) qui disparaît toute seule.
export function Banniere({ message, type = 'succes', onFermer, duree = 3000 }: Props) {
  const opacite = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    if (!message) return;
    opacite.setValue(0);
    translateY.setValue(-8);
    Animated.parallel([
      Animated.timing(opacite, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    const minuteur = setTimeout(onFermer, duree);
    return () => clearTimeout(minuteur);
  }, [message, duree, onFermer, opacite, translateY]);

  if (!message) return null;

  const succes = type === 'succes';
  return (
    <Animated.View style={{ opacity: opacite, transform: [{ translateY }] }}>
      <Pressable
        accessibilityRole="alert"
        onPress={onFermer}
        style={[
          styles.banniere,
          succes
            ? degradeBoutonPrincipal()
            : { backgroundColor: couleurs.erreurClair, borderWidth: 1, borderColor: couleurs.erreur },
        ]}
      >
        <Text
          style={[
            styles.texte,
            { color: succes ? couleurs.texteSurSombre : couleurs.erreur },
          ]}
        >
          {succes ? '✓ ' : '⚠ '}
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banniere: {
    borderRadius: rayonPilule,
    paddingVertical: 12,
    paddingHorizontal: espacements.m,
    alignSelf: 'stretch',
  },
  texte: {
    fontSize: tailles.petit,
    fontWeight: '600',
    fontFamily: polices.sans,
    textAlign: 'center',
  },
});
