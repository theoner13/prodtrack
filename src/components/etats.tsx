import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { couleurs, espacements, tailles } from '@/theme';

// Les 3 états que chaque écran doit gérer : chargement, erreur, liste vide.

export function EtatChargement({ message = 'Chargement…' }: { message?: string }) {
  return (
    <View style={styles.centre}>
      <ActivityIndicator size="large" color={couleurs.principal} />
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
      <Text style={[styles.texte, styles.erreur]}>{message}</Text>
      {onReessayer ? <Bouton titre="Réessayer" variante="secondaire" onPress={onReessayer} /> : null}
    </View>
  );
}

export function EtatVide({ message }: { message: string }) {
  return (
    <View style={styles.centre}>
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
  texte: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
  },
  erreur: {
    color: couleurs.erreur,
  },
});
