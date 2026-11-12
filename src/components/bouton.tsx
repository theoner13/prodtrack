import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import {
  couleurs,
  degradeBoutonPrincipal,
  hauteurBouton,
  hauteurBoutonCompact,
  polices,
  rayonPilule,
  tailles,
} from '@/theme';

type Variante = 'principal' | 'secondaire' | 'danger';

type Props = {
  titre: string;
  onPress: () => void;
  variante?: Variante;
  chargement?: boolean;
  desactive?: boolean;
  /** Bouton fixe en pied d'écran : toute la largeur. */
  pleineLargeur?: boolean;
  /** Hauteur réduite (ex. barre d'enregistrement flottante). */
  compact?: boolean;
};

const textes: Record<Variante, string> = {
  principal: couleurs.texteSurPrincipal,
  secondaire: couleurs.principal,
  danger: couleurs.erreur,
};

const fonds: Record<Variante, string | null> = {
  principal: null,
  secondaire: couleurs.fondPuce,
  danger: couleurs.erreurClair,
};

export function Bouton({
  titre,
  onPress,
  variante = 'principal',
  chargement = false,
  desactive = false,
  pleineLargeur = false,
  compact = false,
}: Props) {
  const inactif = desactive || chargement;
  const hauteur = compact ? hauteurBoutonCompact : hauteurBouton;
  const fondVariante = fonds[variante];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif, busy: chargement }}
      disabled={inactif}
      onPress={onPress}
      hitSlop={{ top: 2, bottom: 2, left: 4, right: 4 }}
      style={({ pressed }) => [
        styles.bouton,
        {
          height: hauteur,
          borderRadius: rayonPilule,
          ...(variante === 'principal'
            ? inactif
              ? { backgroundColor: couleurs.desactive }
              : degradeBoutonPrincipal()
            : {
                backgroundColor: inactif ? couleurs.desactive : (fondVariante ?? couleurs.fondPuce),
              }),
        },
        pleineLargeur ? styles.pleineLargeur : styles.autoLargeur,
        pressed && styles.appuye,
      ]}
    >
      {chargement ? (
        <ActivityIndicator color={inactif ? couleurs.texteSecondaire : textes[variante]} />
      ) : (
        <Text
          style={[
            styles.texte,
            {
              color: inactif ? couleurs.texteSecondaire : textes[variante],
            },
          ]}
        >
          {titre}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bouton: {
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoLargeur: {
    alignSelf: 'center',
  },
  pleineLargeur: {
    alignSelf: 'stretch',
  },
  appuye: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  texte: {
    fontSize: tailles.bouton,
    fontWeight: '600',
    fontFamily: polices.sans,
  },
});
