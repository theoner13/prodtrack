import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { couleurs, espacements, hauteurBouton, polices, rayonPetit, tailles } from '@/theme';

type Props = TextInputProps & {
  libelle: string;
  erreur?: string;
};

// Champ texte avec libellé et message d'erreur.
export function Champ({ libelle, erreur, style, multiline, ...props }: Props) {
  return (
    <View style={styles.conteneur}>
      <Text style={styles.libelle}>{libelle}</Text>
      <TextInput
        accessibilityLabel={libelle}
        placeholderTextColor={couleurs.texteMuet}
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : props.textAlignVertical}
        style={[
          styles.champ,
          multiline ? styles.champMultiligne : null,
          erreur ? styles.champErreur : null,
          style,
        ]}
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
    minHeight: hauteurBouton - 10,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayonPetit,
    paddingHorizontal: espacements.m,
    fontSize: tailles.normal,
    color: couleurs.texte,
    backgroundColor: couleurs.surface,
    fontFamily: polices.sans,
  },
  champMultiligne: {
    paddingVertical: 14,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  champErreur: {
    borderColor: couleurs.erreur,
  },
  erreur: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
});
