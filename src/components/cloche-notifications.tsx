import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useNombreNonLues } from '@/api/notifications';
import { useAuth } from '@/auth/AuthProvider';
import { couleurs } from '@/theme';

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
        <Ionicons name="notifications-outline" size={20} color={couleurs.texte} />
        {n > 0 ? <View style={styles.pastille} /> : null}
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
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: couleurs.croutePoint,
    borderWidth: 2,
    borderColor: couleurs.fond,
  },
});
