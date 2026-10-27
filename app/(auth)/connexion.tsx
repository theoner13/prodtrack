import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { Ecran } from '@/components/ecran';
import { supabase } from '@/lib/supabase';
import { couleurs, tailles } from '@/theme';

const schema = z.object({
  email: z.email('Adresse email invalide.'),
  motDePasse: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
});

type Formulaire = z.infer<typeof schema>;

export default function EcranConnexion() {
  const { annonce, definirAnnonce } = useAuth();
  const [erreur, setErreur] = useState<string | null>(null);
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

  return (
    <Ecran titre="Connexion" defilement>
      {annonce ? <Text style={styles.erreur}>{annonce}</Text> : null}
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
});
