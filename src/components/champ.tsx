import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { couleurs, espacements, hauteurBouton, rayon, tailles } from '@/theme';

type Props = TextInputProps & {
  libelle: string;
  erreur?: string;
};

// Champ texte avec libellé et message d'erreur.
// Avec react-hook-form : l'utiliser dans un <Controller> en passant
// value, onChangeText, onBlur et erreur={fieldState.error?.message}.
export function Champ({ libelle, erreur, style, ...props }: Props) {
  return (
    <View style={styles.conteneur}>
      <Text style={styles.libelle}>{libelle}</Text>
      <TextInput
        accessibilityLabel={libelle}
        placeholderTextColor={couleurs.texteSecondaire}
        style={[styles.champ, erreur ? styles.champErreur : null, style]}
        {...props}
      />
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    gap: espacements.xs,
  },
  libelle: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
  },
  champ: {
    minHeight: hauteurBouton,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espacements.m,
    fontSize: tailles.normal,
    color: couleurs.texte,
    backgroundColor: couleurs.surface,
  },
  champErreur: {
    borderColor: couleurs.erreur,
    borderWidth: 1,
  },
  erreur: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
  },
});
