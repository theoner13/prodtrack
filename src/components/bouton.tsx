import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import {
  couleurs,
  espacements,
  hauteurBouton,
  hauteurBoutonCompact,
  polices,
  rayon,
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
  const texteSeul = variante === 'secondaire' || variante === 'danger';
  const hauteur = compact ? hauteurBoutonCompact : hauteurBouton;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif, busy: chargement }}
      disabled={inactif}
      onPress={onPress}
      hitSlop={{ top: 2, bottom: 2, left: 4, right: 4 }}
      style={({ pressed }) => [
        texteSeul ? styles.texteSeul : styles.bouton,
        !texteSeul && {
          height: hauteur,
          borderRadius: compact ? 14 : rayon,
          backgroundColor: inactif ? couleurs.desactive : couleurs.principal,
        },
        pleineLargeur ? styles.pleineLargeur : !texteSeul && styles.autoLargeur,
        pressed && styles.appuye,
      ]}
    >
      {chargement ? (
        <ActivityIndicator color={inactif ? couleurs.texteSecondaire : textes[variante]} />
      ) : (
        <Text
          style={[
            texteSeul ? styles.texteLien : styles.texte,
            {
              color: inactif ? couleurs.texteSecondaire : textes[variante],
              textDecorationLine: texteSeul ? 'underline' : 'none',
              textDecorationColor: couleurs.soulignement,
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
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoLargeur: {
    alignSelf: 'center',
  },
  pleineLargeur: {
    alignSelf: 'stretch',
  },
  texteSeul: {
    minHeight: hauteurBoutonCompact,
    paddingHorizontal: espacements.s,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  appuye: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  texte: {
    fontSize: tailles.bouton,
    fontWeight: '500',
    fontFamily: polices.sans,
  },
  texteLien: {
    fontSize: tailles.bouton,
    fontWeight: '500',
    fontFamily: polices.sans,
  },
});
