import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { couleurs, espacements, polices, tailles } from '@/theme';

function Squelette({ largeur = '100%', hauteur = 16 }: { largeur?: number | `${number}%`; hauteur?: number }) {
  const opacite = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacite, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacite, {
          toValue: 0.45,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    boucle.start();
    return () => boucle.stop();
  }, [opacite]);

  return (
    <Animated.View
      style={[
        styles.squelette,
        { width: largeur, height: hauteur, opacity: opacite },
      ]}
    />
  );
}

// Les 3 états que chaque écran doit gérer : chargement, erreur, liste vide.

export function EtatChargement({ message = 'Chargement…' }: { message?: string }) {
  return (
    <View style={styles.centre} accessibilityLabel={message}>
      <View style={styles.squelettes}>
        <Squelette largeur="70%" hauteur={18} />
        <Squelette largeur="100%" hauteur={56} />
        <Squelette largeur="100%" hauteur={56} />
        <Squelette largeur="55%" hauteur={14} />
      </View>
      <Text style={styles.texte}>{message}</Text>
    </View>
  );
}

type PropsErreur = {
  message?: string;
  onReessayer?: () => void;
};

export function EtatErreur({
  message = 'Une erreur est survenue. Vérifiez votre connexion internet.',
  onReessayer,
}: PropsErreur) {
  return (
    <View style={styles.centre}>
      <View style={styles.iconeRond}>
        <Ionicons name="alert-circle-outline" size={28} color={couleurs.erreur} />
      </View>
      <Text style={[styles.texte, styles.erreur]}>{message}</Text>
      {onReessayer ? <Bouton titre="Réessayer" variante="secondaire" onPress={onReessayer} /> : null}
    </View>
  );
}

export function EtatVide({ message }: { message: string }) {
  return (
    <View style={styles.centre}>
      <View style={[styles.iconeRond, styles.iconeVide]}>
        <Ionicons name="file-tray-outline" size={28} color={couleurs.accentFonce} />
      </View>
      <Text style={styles.texte}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.m,
    padding: espacements.l,
  },
  squelettes: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  squelette: {
    borderRadius: 12,
    backgroundColor: couleurs.fondGroupe,
    alignSelf: 'stretch',
  },
  iconeRond: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: couleurs.erreurClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeVide: {
    backgroundColor: couleurs.accentClair,
  },
  texte: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    fontFamily: polices.sans,
  },
  erreur: {
    color: couleurs.erreur,
  },
});
