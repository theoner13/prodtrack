import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { ClocheNotifications } from '@/components/cloche-notifications';
import { couleurs, polices } from '@/theme';

/** Cloche + avatar Profil (initiale), pour les en-têtes d'onglets. */
export function ActionsEntete() {
  const { profil } = useAuth();
  const initiale = (profil?.prenom?.trim().charAt(0) ?? 'P').toUpperCase();

  return (
    <View style={styles.ligne}>
      <ClocheNotifications />
      <Link href="/profil" accessibilityLabel="Profil">
        <View style={styles.avatar} accessibilityRole="button">
          <Text style={styles.initiale}>{initiale}</Text>
        </View>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: couleurs.fondGroupe,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initiale: {
    color: couleurs.principal,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: polices.sans,
  },
});
