import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { PaveNumerique } from '@/components/pave-numerique';
import { biometrieActive, verifierPin } from '@/lib/pin';
import { couleurs, tailles } from '@/theme';

export default function EcranDeverrouiller() {
  const { session, deverrouiller, deconnexion, definirAnnonce } = useAuth();
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [avecBiometrie, setAvecBiometrie] = useState(false);
  const [chargement, setChargement] = useState(false);

  async function tenterBiometrie() {
    const resultat = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouiller ProdTrack',
      cancelLabel: 'Utiliser le code',
      disableDeviceFallback: true,
    });
    if (resultat.success) deverrouiller();
  }

  useEffect(() => {
    if (!session || Platform.OS === 'web') return;
    let annule = false;
    biometrieActive(session.user.id).then((actif) => {
      if (annule) return;
      setAvecBiometrie(actif);
      if (actif) void tenterBiometrie();
    });
    return () => {
      annule = true;
    };
  }, [session?.user.id]);

  async function onSaisie(valeur: string) {
    setSaisie(valeur);
    if (valeur.length < 4 || !session || chargement) return;
    setChargement(true);
    const resultat = await verifierPin(session.user.id, valeur);
    if (resultat.ok) {
      deverrouiller();
      return;
    }
    if (resultat.bloque) {
      definirAnnonce(
        'Trop de codes incorrects. Reconnectez-vous avec votre email et votre mot de passe.',
      );
      await deconnexion();
      return;
    }
    setErreur(
      resultat.restants > 1
        ? `Code incorrect. Encore ${resultat.restants} essais.`
        : 'Code incorrect. Encore 1 essai.',
    );
    setSaisie('');
    setChargement(false);
  }

  return (
    <Ecran titre="Déverrouiller" defilement>
      <Text style={styles.consigne}>Saisissez votre code à 4 chiffres.</Text>
      <PaveNumerique valeur={saisie} onChange={(valeur) => void onSaisie(valeur)} />
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      {avecBiometrie ? (
        <Bouton titre="Utiliser Face ID ou l'empreinte" variante="secondaire" onPress={() => void tenterBiometrie()} />
      ) : null}
      <Bouton
        titre="Se connecter avec un autre compte"
        variante="secondaire"
        onPress={() => void deconnexion()}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
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
