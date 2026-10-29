import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { Ecran } from '@/components/ecran';
import { supabase } from '@/lib/supabase';
import { couleurs, espacements, tailles } from '@/theme';

const schema = z.object({
  email: z.email('Adresse email invalide.'),
  motDePasse: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
});

type Formulaire = z.infer<typeof schema>;

type CompteTest = { libelle: string; email: string };

// Uniquement en local (__DEV__). En export prod, la branche morte est retirée
// pour que les comptes / mot de passe de test n'apparaissent pas dans dist/.
const comptesTestBruts = __DEV__ ? process.env.EXPO_PUBLIC_COMPTES_TEST : undefined;
const mdpTest = __DEV__ ? process.env.EXPO_PUBLIC_MDP_TEST : undefined;

function parserComptesTest(valeur: string | undefined): CompteTest[] {
  if (!valeur) return [];
  return valeur
    .split(';')
    .map((entree) => {
      const parties = entree.split('|');
      if (parties.length !== 2) return null;
      const libelle = parties[0]?.trim();
      const email = parties[1]?.trim();
      if (!libelle || !email) return null;
      return { libelle, email };
    })
    .filter((compte): compte is CompteTest => compte !== null);
}

const comptesTest = parserComptesTest(comptesTestBruts);
const afficherConnexionRapide =
  __DEV__ && Boolean(comptesTestBruts?.trim()) && Boolean(mdpTest?.trim());

export default function EcranConnexion() {
  const { annonce, definirAnnonce, comptesAppareil, modeAjoutCompte, annulerAjoutCompte } =
    useAuth();
  const [erreur, setErreur] = useState<string | null>(null);
  const [emailRapide, setEmailRapide] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Formulaire>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', motDePasse: '' },
  });

  async function connecter(valeurs: Formulaire) {
    if (!supabase) return;
    setErreur(null);
    definirAnnonce(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: valeurs.email.trim(),
      password: valeurs.motDePasse,
    });
    if (error) setErreur(messageErreur(error));
  }

  async function connecterRapide(email: string) {
    if (!supabase || !mdpTest) return;
    setErreur(null);
    definirAnnonce(null);
    setEmailRapide(email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: mdpTest,
      });
      if (error) setErreur(messageErreur(error));
    } finally {
      setEmailRapide(null);
    }
  }

  const retourChoixCompte = comptesAppareil.length > 0 || modeAjoutCompte;

  return (
    <Ecran titre="Connexion" defilement>
      {annonce ? <Text style={styles.erreur}>{annonce}</Text> : null}
      {retourChoixCompte ? (
        <Bouton
          titre="Retour au choix du compte"
          variante="secondaire"
          onPress={() => annulerAjoutCompte()}
        />
      ) : null}
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="motDePasse"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Mot de passe"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <Bouton
        titre="Se connecter"
        chargement={formState.isSubmitting}
        onPress={handleSubmit(connecter)}
      />
      <Link href="/inscription" style={styles.lien}>
        Créer un compte
      </Link>
      {afficherConnexionRapide ? (
        <View style={styles.rapide}>
          <Text style={styles.rapideTitre}>Connexion rapide (test)</Text>
          {comptesTest.map((compte) => (
            <Bouton
              key={compte.email}
              titre={compte.libelle}
              variante="secondaire"
              chargement={emailRapide === compte.email}
              desactive={emailRapide !== null && emailRapide !== compte.email}
              onPress={() => connecterRapide(compte.email)}
            />
          ))}
        </View>
      ) : null}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
  lien: {
    fontSize: tailles.normal,
    color: couleurs.principal,
    fontWeight: '700',
    textAlign: 'center',
  },
  rapide: {
    marginTop: espacements.l,
    gap: espacements.s,
  },
  rapideTitre: {
    fontSize: tailles.normal,
    fontWeight: '700',
    color: couleurs.texteSecondaire,
    marginBottom: espacements.xs,
  },
});
