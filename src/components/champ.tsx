import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { couleurs, espacements, hauteurBouton, polices, rayonPetit, tailles } from '@/theme';

type Props = TextInputProps & {
  libelle: string;
  erreur?: string;
};

// Champ texte avec libellé et message d'erreur.
export function Champ({ libelle, erreur, style, ...props }: Props) {
  return (
    <View style={styles.conteneur}>
      <Text style={styles.libelle}>{libelle}</Text>
      <TextInput
        accessibilityLabel={libelle}
        placeholderTextColor={couleurs.texteMuet}
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
    fontSize: tailles.legend,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  champ: {
    minHeight: hauteurBouton - 12,
    borderWidth: 0,
    borderRadius: rayonPetit,
    paddingHorizontal: espacements.m,
    fontSize: tailles.normal,
    color: couleurs.texte,
    backgroundColor: couleurs.fondGroupe,
    fontFamily: polices.sans,
  },
  champErreur: {
    borderWidth: 1,
    borderColor: couleurs.erreur,
  },
  erreur: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
});
