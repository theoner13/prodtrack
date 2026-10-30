import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { EcranAuth } from '@/components/ecran-auth';
import { supabase } from '@/lib/supabase';
import { couleurs, tailles } from '@/theme';

const schema = z
  .object({
    email: z.email('Adresse email invalide.'),
    motDePasse: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
    confirmation: z.string(),
  })
  .refine((valeurs) => valeurs.motDePasse === valeurs.confirmation, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['confirmation'],
  });

type Formulaire = z.infer<typeof schema>;

export default function EcranInscription() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Formulaire>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', motDePasse: '', confirmation: '' },
  });

  async function inscrire(valeurs: Formulaire) {
    if (!supabase) return;
    setErreur(null);
    setInfo(null);
    const { data, error } = await supabase.auth.signUp({
      email: valeurs.email.trim(),
      password: valeurs.motDePasse,
    });
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    if (!data.session) {
      setInfo('Un email de confirmation vous a été envoyé. Ouvrez-le, puis connectez-vous.');
    }
  }

  return (
    <EcranAuth titre="Inscription">
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
            autoComplete="new-password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmation"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Confirmation du mot de passe"
            secureTextEntry
            autoCapitalize="none"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}
      <Bouton
        titre="Créer mon compte"
        chargement={formState.isSubmitting}
        onPress={handleSubmit(inscrire)}
      />
      <Link href="/connexion" style={styles.lien}>
        J'ai déjà un compte
      </Link>
    </EcranAuth>
  );
}

const styles = StyleSheet.create({
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
  info: {
    fontSize: tailles.normal,
    color: couleurs.texte,
  },
  lien: {
    fontSize: tailles.normal,
    color: couleurs.principal,
    fontWeight: '700',
    textAlign: 'center',
  },
});
