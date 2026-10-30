import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useDefinirPhotoProfil } from '@/api/produits';
import { useAuth } from '@/auth/AuthProvider';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { ChoixPhoto } from '@/components/choix-photo';
import { Ecran } from '@/components/ecran';
import { couleurs, espacements, styleTitreSection, tailles } from '@/theme';
import type { RoleEmploye } from '@/types/database';

const ROLES: Record<RoleEmploye, string> = {
  admin: 'Admin',
  patissier: 'Pâtissier',
  vendeuse: 'Vente',
};

export default function EcranProfil() {
  const {
    profil,
    boutiqueNom,
    rechargerProfil,
    tablettePartagee,
    definirTablettePartagee,
    comptesAppareil,
    changerDePersonne,
    retirerMonCompte,
  } = useAuth();
  const definirPhoto = useDefinirPhotoProfil();
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [confirmerRetrait, setConfirmerRetrait] = useState(false);
  const [chargementTablette, setChargementTablette] = useState(false);
  const [chargementRetrait, setChargementRetrait] = useState(false);
  const fermer = useCallback(() => setConfirmation(null), []);

  if (!profil) return null;
  const moi = profil;
  const afficherChangerPersonne = comptesAppareil.length >= 2 || tablettePartagee;

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

  async function changerTablette(actif: boolean) {
    setChargementTablette(true);
    try {
      await definirTablettePartagee(actif);
    } finally {
      setChargementTablette(false);
    }
  }

  async function confirmerRetirer() {
    setChargementRetrait(true);
    try {
      await retirerMonCompte();
    } finally {
      setChargementRetrait(false);
      setConfirmerRetrait(false);
    }
  }

  return (
    <Ecran defilement>
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

      <Text style={styles.section}>Cet appareil</Text>
      <Text style={styles.aide}>Pour une tablette utilisée par plusieurs employés en boutique.</Text>
      <Text style={styles.ligne}>Tablette partagée : {tablettePartagee ? 'oui' : 'non'}</Text>
      <View style={styles.choix}>
        <View style={styles.choixBouton}>
          <Bouton
            titre="Oui"
            variante={tablettePartagee ? 'principal' : 'secondaire'}
            chargement={chargementTablette && !tablettePartagee}
            desactive={chargementTablette}
            onPress={() => void changerTablette(true)}
          />
        </View>
        <View style={styles.choixBouton}>
          <Bouton
            titre="Non"
            variante={!tablettePartagee ? 'principal' : 'secondaire'}
            chargement={chargementTablette && tablettePartagee}
            desactive={chargementTablette}
            onPress={() => void changerTablette(false)}
          />
        </View>
      </View>

      {afficherChangerPersonne ? (
        <Bouton
          titre="Changer de personne"
          variante="secondaire"
          onPress={() => void changerDePersonne()}
        />
      ) : null}

      {confirmerRetrait ? (
        <View style={styles.confirmation}>
          <Text style={styles.aide}>
            Retirer votre compte de cet appareil ? Il faudra votre email et votre mot de passe pour
            revenir.
          </Text>
          <Bouton
            titre="Oui, retirer mon compte"
            variante="danger"
            chargement={chargementRetrait}
            onPress={() => void confirmerRetirer()}
          />
          <Bouton
            titre="Annuler"
            variante="secondaire"
            desactive={chargementRetrait}
            onPress={() => setConfirmerRetrait(false)}
          />
        </View>
      ) : (
        <Bouton
          titre="Retirer mon compte de cet appareil"
          variante="danger"
          onPress={() => setConfirmerRetrait(true)}
        />
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: {
    fontSize: tailles.normal,
    color: couleurs.texte,
  },
  section: {
    ...styleTitreSection,
    marginTop: espacements.m,
  },
  aide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  choix: {
    flexDirection: 'row',
    gap: espacements.s,
  },
  choixBouton: {
    flex: 1,
  },
  confirmation: {
    gap: espacements.s,
  },
});
