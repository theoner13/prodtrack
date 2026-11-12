import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useNombreNonLues } from '@/api/notifications';
import { useAuth } from '@/auth/AuthProvider';
import { couleurs, tailleToucheMin } from '@/theme';

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
      <View style={styles.zone}>
        <View style={styles.boite}>
          <Ionicons name="notifications-outline" size={22} color={couleurs.texte} />
          {n > 0 ? <View style={styles.pastille} /> : null}
        </View>
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  zone: {
    width: tailleToucheMin,
    height: tailleToucheMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boite: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  pastille: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: couleurs.croutePoint,
    borderWidth: 2,
    borderColor: couleurs.fond,
  },
});
