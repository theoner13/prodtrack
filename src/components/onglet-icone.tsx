import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { couleurs } from '@/theme';

type NomIcone = ComponentProps<typeof Ionicons>['name'];

type Props = {
  nom: NomIcone;
  nomActif?: NomIcone;
  focused: boolean;
};

/** Icône d'onglet avec pastille beige quand actif (maquettes). */
export function OngletIcone({ nom, nomActif, focused }: Props) {
  return (
    <View style={[styles.pilule, focused && styles.piluleActive]}>
      <Ionicons
        name={focused && nomActif ? nomActif : nom}
        size={20}
        color={focused ? couleurs.crouteFonce : couleurs.ongletInactif}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pilule: {
    width: 52,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piluleActive: {
    backgroundColor: couleurs.fondOngletActif,
  },
});
