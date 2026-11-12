import { router, Stack, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useDefinirPhotoProfil } from '@/api/produits';
import { useAuth } from '@/auth/AuthProvider';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { BoutonRetour } from '@/components/bouton-retour';
import { ChoixPhoto } from '@/components/choix-photo';
import { ChoixSegmente } from '@/components/choix-segmente';
import { Ecran } from '@/components/ecran';
import { styleEntete, styleTitreEntete } from '@/lib/options-onglets';
import {
  couleurs,
  espacements,
  ombres,
  polices,
  rayonCarte,
  seuilOrdinateur,
  styleTitreSection,
  tailles,
} from '@/theme';
import type { RoleEmploye } from '@/types/database';

const ROLES: Record<RoleEmploye, string> = {
  admin: 'Admin',
  patissier: 'Pâtissier',
  vendeuse: 'Vente',
  laboratoire: 'Laboratoire',
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
  const { width } = useWindowDimensions();
  const ordinateur = width >= seuilOrdinateur;
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
      moi.role === 'admin'
        ? '/(admin)'
        : moi.role === 'patissier'
          ? '/(patissier)'
          : moi.role === 'laboratoire'
            ? ('/(laboratoire)' as Href)
            : '/(vendeuse)';
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
      <Stack.Screen
        options={{
          title: ordinateur ? '' : 'Profil',
          headerStyle: styleEntete(ordinateur),
          headerTitleStyle: styleTitreEntete(ordinateur),
          headerTitleAlign: 'left',
          headerLeft: () => (
            <View style={styles.enteteRetour}>
              <BoutonRetour onPress={retour} />
            </View>
          ),
        }}
      />
      <View style={styles.colonne}>
        {ordinateur ? <Text style={styles.titrePage}>Profil</Text> : null}
        <Banniere message={confirmation} onFermer={fermer} />
        <View style={[styles.carteIdentite, ombres.douce]}>
          <ChoixPhoto
            chemin={moi.photo_url}
            dossier="profils"
            proprietaireId={moi.id}
            camera="avant"
            onChange={photoChange}
          />
          <Text style={styles.nom}>
            {moi.prenom} {moi.nom}
          </Text>
          <Text style={styles.meta}>Rôle : {ROLES[moi.role]}</Text>
          <Text style={styles.meta}>Boutique : {boutiqueNom ?? '—'}</Text>
        </View>
        <Bouton
          titre="Changer mon code PIN"
          variante="secondaire"
          pleineLargeur
          onPress={() => router.push('/creer-pin?changer=1')}
        />

        <Text style={styles.section}>Cet appareil</Text>
        <Text style={styles.aide}>Pour une tablette utilisée par plusieurs employés en boutique.</Text>
        <Text style={styles.ligne}>Tablette partagée : {tablettePartagee ? 'oui' : 'non'}</Text>
        <ChoixSegmente
          options={[
            { valeur: 'oui', libelle: 'Oui' },
            { valeur: 'non', libelle: 'Non' },
          ]}
          valeur={tablettePartagee ? 'oui' : 'non'}
          desactive={chargementTablette}
          onChange={(valeur) => void changerTablette(valeur === 'oui')}
        />

        {afficherChangerPersonne ? (
          <Bouton
            titre="Changer de personne"
            variante="secondaire"
            pleineLargeur
            onPress={() => void changerDePersonne()}
          />
        ) : null}

        <View style={styles.actionsBas}>
          {confirmerRetrait ? (
            <View style={styles.confirmation}>
              <Text style={styles.aide}>
                Retirer votre compte de cet appareil ? Il faudra votre email et votre mot de passe pour
                revenir.
              </Text>
              <Bouton
                titre="Oui, retirer mon compte"
                variante="danger"
                pleineLargeur
                chargement={chargementRetrait}
                onPress={() => void confirmerRetirer()}
              />
              <Bouton
                titre="Annuler"
                variante="secondaire"
                pleineLargeur
                desactive={chargementRetrait}
                onPress={() => setConfirmerRetrait(false)}
              />
            </View>
          ) : (
            <Bouton
              titre="Retirer mon compte de cet appareil"
              variante="danger"
              pleineLargeur
              onPress={() => setConfirmerRetrait(true)}
            />
          )}
        </View>
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  enteteRetour: {
    marginLeft: 4,
  },
  colonne: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    gap: espacements.s,
  },
  titrePage: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.6,
    color: couleurs.texte,
    fontFamily: polices.sans,
    marginBottom: espacements.xs,
  },
  carteIdentite: {
    backgroundColor: couleurs.surface,
    borderRadius: rayonCarte,
    padding: espacements.l,
    gap: espacements.s,
    marginBottom: espacements.s,
  },
  nom: {
    fontSize: 20,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  meta: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  ligne: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  section: {
    ...styleTitreSection,
    marginTop: espacements.m,
  },
  aide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  actionsBas: {
    marginTop: espacements.xl,
  },
  confirmation: {
    gap: espacements.s,
  },
});
