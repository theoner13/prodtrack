import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BoutonRetour } from '@/components/bouton-retour';
import { couleurs, polices } from '@/theme';

type Props = {
  titre: string;
  /** Cible si on ne peut pas revenir en arrière. */
  secours?: Href;
};

/**
 * En-tête Stack : Retour à gauche, séparateur, titre à part (lisible sur 390 px).
 */
export function EnteteRetourTitre({ titre, secours = '/(patissier)/produits' }: Props) {
  return (
    <View style={styles.entete}>
      <BoutonRetour
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace(secours);
        }}
      />
      <View style={styles.separateur} />
      <Text style={styles.titre} numberOfLines={1}>
        {titre}
      </Text>
    </View>
  );
}

/** Options Stack pour masquer le titre natif et afficher EnteteRetourTitre. */
export function optionsEnteteRetourTitre(titre: string) {
  return {
    title: titre,
    headerTitle: () => null,
    headerLeft: () => <EnteteRetourTitre titre={titre} />,
    headerBackVisible: false,
    headerLeftContainerStyle: styles.gauchePleine,
    headerTitleContainerStyle: styles.titreMasque,
  };
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    maxWidth: 390,
    paddingRight: 8,
    gap: 10,
  },
  separateur: {
    width: StyleSheet.hairlineWidth * 2,
    alignSelf: 'stretch',
    maxHeight: 28,
    minHeight: 22,
    backgroundColor: couleurs.soulignement,
    borderRadius: 1,
  },
  titre: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: polices.sans,
    color: couleurs.texte,
  },
  gauchePleine: {
    flex: 1,
    maxWidth: '100%',
  },
  titreMasque: {
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
});
