import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useDefinirPhotoProfil } from '@/api/produits';
import { useAuth } from '@/auth/AuthProvider';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { ChoixPhoto } from '@/components/choix-photo';
import { Ecran } from '@/components/ecran';
import { couleurs, tailles } from '@/theme';
import type { RoleEmploye } from '@/types/database';

const ROLES: Record<RoleEmploye, string> = {
  admin: 'Patron',
  patissier: 'Pâtissier',
  vendeuse: 'Vendeuse',
};

export default function EcranProfil() {
  const { profil, boutiqueNom, deconnexion, rechargerProfil } = useAuth();
  const definirPhoto = useDefinirPhotoProfil();
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const fermer = useCallback(() => setConfirmation(null), []);

  if (!profil) return null;
  const moi = profil;

  async function photoChange(chemin: string | null) {
    await definirPhoto.mutateAsync({ id: moi.id, photoUrl: chemin });
    await rechargerProfil();
    if (chemin) setConfirmation('Photo enregistrée.');
  }

  function retour() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const accueil: Href =
      moi.role === 'admin' ? '/(admin)' : moi.role === 'patissier' ? '/(patissier)' : '/(vendeuse)';
    router.replace(accueil);
  }

  return (
    <Ecran titre="Profil" defilement>
      <Bouton titre="Retour" variante="secondaire" onPress={retour} />
      <Banniere message={confirmation} onFermer={fermer} />
      <ChoixPhoto
        chemin={moi.photo_url}
        dossier="profils"
        proprietaireId={moi.id}
        camera="avant"
        onChange={photoChange}
      />
      <Text style={styles.ligne}>
        {moi.prenom} {moi.nom}
      </Text>
      <Text style={styles.ligne}>Rôle : {ROLES[moi.role]}</Text>
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
