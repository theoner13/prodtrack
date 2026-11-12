import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { couleurs, espacements, ombres, rayonCarte } from '@/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Carte blanche arrondie pour les listes et blocs admin. */
export function AdminCarte({ children, style }: Props) {
  return <View style={[styles.carte, ombres.douce, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.surface,
    borderRadius: rayonCarte,
    paddingVertical: espacements.m,
    paddingHorizontal: espacements.m,
    gap: espacements.s,
    marginBottom: 2,
  },
});
