import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminCarte } from '@/components/admin-carte';
import {
  couleurs,
  espacements,
  polices,
  styleChiffre,
  tailleToucheMin,
  tailles,
} from '@/theme';

type Props = {
  nom: string;
  montant: string;
  /** Largeur de barre 0–100. */
  largeurPct: number;
  detail?: string;
  ouvert?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  children?: ReactNode;
};

/** Ligne de classement (boutique / employé) avec barre de progression. */
export function AdminCarteClassement({
  nom,
  montant,
  largeurPct,
  detail,
  ouvert,
  onPress,
  accessibilityLabel,
  children,
}: Props) {
  const entete = (
    <View style={styles.entete}>
      <View style={styles.ligne}>
        <Text style={styles.nom} numberOfLines={2}>
          {nom}
        </Text>
        <Text style={styles.montant}>{montant}</Text>
      </View>
      <View style={styles.barreFond}>
        <View
          style={[
            styles.barreRemplie,
            { width: `${Math.min(100, Math.max(0, largeurPct))}%` },
          ]}
        />
      </View>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );

  return (
    <AdminCarte style={ouvert ? styles.ouverte : undefined}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.zone, pressed && styles.appuye]}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ expanded: ouvert }}
        >
          {entete}
        </Pressable>
      ) : (
        entete
      )}
      {children}
    </AdminCarte>
  );
}

const styles = StyleSheet.create({
  ouverte: {
    gap: espacements.m,
  },
  zone: {
    gap: espacements.s,
    minHeight: tailleToucheMin,
    justifyContent: 'center',
  },
  entete: {
    gap: espacements.s,
  },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: espacements.m,
  },
  nom: {
    flex: 1,
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  montant: {
    ...styleChiffre,
    fontSize: tailles.normal,
    color: couleurs.texte,
  },
  barreFond: {
    height: 6,
    borderRadius: 999,
    backgroundColor: couleurs.fondSegment,
    overflow: 'hidden',
  },
  barreRemplie: {
    height: '100%',
    backgroundColor: couleurs.accent,
    borderRadius: 999,
  },
  detail: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
  },
  appuye: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
