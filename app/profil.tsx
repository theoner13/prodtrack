import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { couleurs, tailles } from '@/theme';
import type { RoleEmploye } from '@/types/database';

const ROLES: Record<RoleEmploye, string> = {
  admin: 'Patron',
  patissier: 'Pâtissier',
  vendeuse: 'Vendeuse',
};

export default function EcranProfil() {
  const { profil, boutiqueNom, deconnexion } = useAuth();
  if (!profil) return null;

  return (
    <Ecran titre="Profil" defilement>
      <Text style={styles.ligne}>
        {profil.prenom} {profil.nom}
      </Text>
      <Text style={styles.ligne}>Rôle : {ROLES[profil.role]}</Text>
      <Text style={styles.ligne}>Boutique : {boutiqueNom ?? '—'}</Text>
      <Bouton titre="Changer mon code PIN" variante="secondaire" onPress={() => router.push('/creer-pin?changer=1')} />
      <Bouton titre="Déconnexion" variante="danger" onPress={() => void deconnexion()} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: {
    fontSize: tailles.normal,
    color: couleurs.texte,
  },
});
