import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  couleurs,
  espacements,
  ombres,
  polices,
  rayonCarte,
  styleTitreSection,
} from '@/theme';

type Props = {
  titre?: string;
  children: ReactNode;
};

/** Carte blanche de section pour les formulaires vente. */
export function VenteSection({ titre, children }: Props) {
  return (
    <View style={[styles.carte, ombres.douce]}>
      {titre ? <Text style={styles.titre}>{titre}</Text> : null}
      <View style={styles.contenu}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.surface,
    borderRadius: rayonCarte,
    paddingVertical: espacements.m,
    paddingHorizontal: espacements.m,
    gap: espacements.s,
  },
  titre: {
    ...styleTitreSection,
    fontFamily: polices.sans,
  },
  contenu: {
    gap: espacements.m,
  },
});
