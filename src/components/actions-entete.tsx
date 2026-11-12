import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { ClocheNotifications } from '@/components/cloche-notifications';
import { couleurs, polices, tailleToucheMin } from '@/theme';

/** Cloche + avatar Profil (initiale), pour les en-têtes d'onglets. */
export function ActionsEntete() {
  const { profil } = useAuth();
  const initiale = (profil?.prenom?.trim().charAt(0) ?? 'P').toUpperCase();

  return (
    <View style={styles.ligne}>
      <ClocheNotifications />
      <Link href="/profil" accessibilityLabel="Profil">
        <View style={styles.avatarZone} accessibilityRole="button">
          <View style={styles.avatar}>
            <Text style={styles.initiale}>{initiale}</Text>
          </View>
        </View>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 16,
  },
  avatarZone: {
    width: tailleToucheMin,
    height: tailleToucheMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: couleurs.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initiale: {
    color: couleurs.texteSurPrincipal,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: polices.sans,
  },
});
