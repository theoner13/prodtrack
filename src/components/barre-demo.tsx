import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { COMPTES_DEMO, compteDemo, entrerDemo, quitterDemo, type CompteDemo } from '@/lib/demo';
import { couleurs, espacements, polices, rayonPilule, tailles } from '@/theme';

/** Barre en bas de l'écran, visible seulement avec un compte démo : changer de profil. */
export function BarreDemo() {
  const { session, rechargerComptesAppareil } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [enCours, setEnCours] = useState<string | null>(null);

  const actif = compteDemo(session?.user.id);
  if (!actif) return null;

  async function changer(compte: CompteDemo) {
    if (compte.id === actif?.id || enCours) return;
    setEnCours(compte.id);
    try {
      await entrerDemo(compte, queryClient);
      router.replace('/');
    } finally {
      setEnCours(null);
    }
  }

  async function quitter() {
    setEnCours('quitter');
    try {
      // D'abord la page démo (ouverte à tous), puis la déconnexion.
      router.replace('/demo');
      await quitterDemo(queryClient);
      await rechargerComptesAppareil();
    } finally {
      setEnCours(null);
    }
  }

  return (
    <View style={[styles.barre, { paddingBottom: espacements.s + insets.bottom }]}>
      <Text style={styles.etiquette}>Démo</Text>
      <View style={styles.profils}>
        {COMPTES_DEMO.map((compte) => {
          const choisi = compte.id === actif.id;
          return (
            <Pressable
              key={compte.id}
              accessibilityRole="button"
              accessibilityState={{ selected: choisi }}
              accessibilityLabel={`Voir le profil ${compte.libelle}`}
              onPress={() => void changer(compte)}
              style={[styles.profil, choisi && styles.profilChoisi]}
            >
              {enCours === compte.id ? (
                <ActivityIndicator size="small" color={couleurs.texteSurSombre} />
              ) : (
                <Text style={[styles.profilTexte, choisi && styles.profilTexteChoisi]}>
                  {compte.libelle}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => void quitter()}
        style={styles.quitter}
      >
        <Text style={styles.quitterTexte}>Quitter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    paddingTop: espacements.s,
    paddingHorizontal: espacements.m,
    backgroundColor: couleurs.fondSombre,
  },
  etiquette: {
    fontSize: tailles.legend,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: couleurs.croute,
    fontFamily: polices.sans,
  },
  profils: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espacements.xs,
  },
  profil: {
    minHeight: 36,
    minWidth: 72,
    paddingHorizontal: espacements.m,
    borderRadius: rayonPilule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilChoisi: {
    backgroundColor: couleurs.accent,
  },
  profilTexte: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texteSurSombreDoux,
    fontFamily: polices.sans,
  },
  profilTexteChoisi: {
    color: couleurs.principalFonce,
  },
  quitter: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: espacements.s,
  },
  quitterTexte: {
    fontSize: tailles.petit,
    color: couleurs.texteSurSombreDoux,
    textDecorationLine: 'underline',
    fontFamily: polices.sans,
  },
});
