import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { espacements } from '@/theme';

/** En dessous : une seule ligne qui défile. Au-dessus : retour à la ligne autorisé. */
const SEUIL_MOBILE = 700;

type Props = {
  children: ReactNode;
};

/**
 * Groupe de puces (Boutique, Période…) :
 * téléphone = une ligne horizontale défilante ; ordinateur = plusieurs lignes.
 */
export function RangPuces({ children }: Props) {
  const { width } = useWindowDimensions();
  const mobile = width < SEUIL_MOBILE;

  if (mobile) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rang}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.rang, styles.rangWrap]}>{children}</View>;
}

const styles = StyleSheet.create({
  rang: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    flexGrow: 1,
  },
  rangWrap: {
    flexWrap: 'wrap',
  },
});
