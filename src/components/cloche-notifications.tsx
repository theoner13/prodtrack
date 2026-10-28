import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useNombreNonLues } from '@/api/notifications';
import { useAuth } from '@/auth/AuthProvider';
import { couleurs, tailles } from '@/theme';

// Cloche d'en-tête : ouvre les notifications, pastille du nombre de non lues.
export function ClocheNotifications() {
  const { profil } = useAuth();
  const nombre = useNombreNonLues(profil?.id ?? null);
  const n = nombre.data ?? 0;
  const libelle = n > 9 ? '9+' : String(n);

  return (
    <Link
      href="/notifications"
      accessibilityLabel={n > 0 ? `Notifications, ${libelle} non lues` : 'Notifications'}
    >
      <View style={styles.boite}>
        <Ionicons name="notifications-outline" size={26} color={couleurs.principal} />
        {n > 0 ? (
          <View style={styles.pastille}>
            <Text style={styles.pastilleTexte}>{libelle}</Text>
          </View>
        ) : null}
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  boite: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastille: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 11,
    backgroundColor: couleurs.erreur,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleTexte: {
    color: couleurs.texteSurPrincipal,
    fontSize: tailles.petit,
    fontWeight: '700',
    lineHeight: 18,
  },
});
