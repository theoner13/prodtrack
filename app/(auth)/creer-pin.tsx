import * as LocalAuthentication from 'expo-local-authentication';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { Logo } from '@/components/logo';
import { PaveNumerique } from '@/components/pave-numerique';
import { creerPin } from '@/lib/pin';
import { couleurs, espacements, tailles } from '@/theme';

export default function EcranCreerPin() {
  const { session, rechargerPin, deverrouiller, tablettePartagee } = useAuth();
  const { changer } = useLocalSearchParams<{ changer?: string }>();
  const [etape, setEtape] = useState<'choix' | 'confirmation' | 'biometrie'>('choix');
  const [premier, setPremier] = useState('');
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [biometrieDispo, setBiometrieDispo] = useState(false);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' || tablettePartagee) {
      setBiometrieDispo(false);
      return;
    }
    Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]).then(([materiel, enregistre]) => setBiometrieDispo(materiel && enregistre));
  }, [tablettePartagee]);

  async function enregistrer(code: string, biometrie: boolean) {
    if (!session) return;
    setChargement(true);
    setErreur(null);
    try {
      await creerPin(session.user.id, code, biometrie);
      await rechargerPin();
      deverrouiller();
      if (changer === '1') router.replace('/profil');
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
      setEtape('choix');
      setPremier('');
      setSaisie('');
    } finally {
      setChargement(false);
    }
  }

  function onSaisie(valeur: string) {
    setSaisie(valeur);
    if (valeur.length < 4) return;
    if (etape === 'choix') {
      setPremier(valeur);
      setSaisie('');
      setErreur(null);
      setEtape('confirmation');
      return;
    }
    if (valeur !== premier) {
      setErreur('Les deux codes ne correspondent pas.');
      setPremier('');
      setSaisie('');
      setEtape('choix');
      return;
    }
    if (biometrieDispo) {
      setEtape('biometrie');
      return;
    }
    void enregistrer(valeur, false);
  }

  const titreEcran = changer === '1' ? 'Changer mon code PIN' : 'Créer un code PIN';
  const titre =
    etape === 'choix'
      ? 'Choisissez un code à 4 chiffres'
      : etape === 'confirmation'
        ? 'Saisissez le code une seconde fois'
        : 'Déverrouillage de l’appareil';

  return (
    <Ecran>
      <View style={styles.centre}>
        <Logo />
        <Text style={styles.titre}>{titreEcran}</Text>
        <Text style={styles.consigne}>{titre}</Text>
        {etape === 'biometrie' ? (
          <>
            <Text style={styles.consigne}>
              Cet appareil peut utiliser Face ID ou l’empreinte. Voulez-vous l’activer pour ouvrir
              ProdTrack ?
            </Text>
            <Bouton
              titre="Activer"
              chargement={chargement}
              onPress={() => void enregistrer(premier, true)}
            />
            <Bouton
              titre="Pas maintenant"
              variante="secondaire"
              desactive={chargement}
              onPress={() => void enregistrer(premier, false)}
            />
          </>
        ) : (
          <PaveNumerique valeur={saisie} onChange={onSaisie} />
        )}
        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: espacements.m,
  },
  titre: {
    fontSize: tailles.titre,
    fontWeight: '600',
    color: couleurs.texte,
    textAlign: 'center',
  },
  consigne: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    textAlign: 'center',
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    textAlign: 'center',
  },
});
