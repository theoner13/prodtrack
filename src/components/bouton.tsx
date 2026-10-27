import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { couleurs, espacements, hauteurBouton, rayon, tailles } from '@/theme';

type Variante = 'principal' | 'secondaire' | 'danger';

type Props = {
  titre: string;
  onPress: () => void;
  variante?: Variante;
  chargement?: boolean;
  desactive?: boolean;
};

const fonds: Record<Variante, string> = {
  principal: couleurs.principal,
  secondaire: couleurs.surface,
  danger: couleurs.erreur,
};

const textes: Record<Variante, string> = {
  principal: couleurs.texteSurPrincipal,
  secondaire: couleurs.principalFonce,
  danger: couleurs.texteSurPrincipal,
};

export function Bouton({
  titre,
  onPress,
  variante = 'principal',
  chargement = false,
  desactive = false,
}: Props) {
  const inactif = desactive || chargement;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif, busy: chargement }}
      disabled={inactif}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bouton,
        { backgroundColor: inactif ? couleurs.desactive : fonds[variante] },
        variante === 'secondaire' && !inactif && styles.bordure,
        pressed && styles.appuye,
      ]}
    >
      {chargement ? (
        <ActivityIndicator color={textes[variante]} />
      ) : (
        <Text style={[styles.texte, { color: inactif ? couleurs.texteSecondaire : textes[variante] }]}>
          {titre}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bouton: {
    minHeight: hauteurBouton,
    borderRadius: rayon,
    paddingHorizontal: espacements.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bordure: {
    borderWidth: 2,
    borderColor: couleurs.principal,
  },
  appuye: {
    opacity: 0.8,
  },
  texte: {
    fontSize: tailles.normal,
    fontWeight: '700',
  },
});
