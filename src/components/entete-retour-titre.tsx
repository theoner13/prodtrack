import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BoutonRetour } from '@/components/bouton-retour';
import { couleurs, polices } from '@/theme';

/**
 * Titre d'en-tête centré, une ligne entière (pas de troncature).
 */
function TitreEntete({ titre }: { titre: string }) {
  return <Text style={styles.titre}>{titre}</Text>;
}

/**
 * Options Stack : Retour à gauche (56 px), titre centré — comme Profil / Notifications.
 */
export function optionsEnteteRetourTitre(titre: string, secours: Href = '/(patissier)/produits') {
  return {
    title: titre,
    headerTitleAlign: 'center' as const,
    headerTitle: () => <TitreEntete titre={titre} />,
    headerLeft: () => (
      <View style={styles.enteteRetour}>
        <BoutonRetour
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace(secours);
          }}
        />
      </View>
    ),
    headerBackVisible: false,
    headerTitleContainerStyle: styles.titreConteneur,
  };
}

const styles = StyleSheet.create({
  enteteRetour: {
    marginLeft: 4,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  titreConteneur: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titre: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: polices.sans,
    color: couleurs.texte,
    textAlign: 'center',
  },
});
