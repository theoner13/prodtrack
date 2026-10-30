import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { EcranAuth } from '@/components/ecran-auth';
import { supabase } from '@/lib/supabase';
import { couleurs, tailles } from '@/theme';

const schema = z
  .object({
    code: z.string().regex(/^[A-Z0-9]{8}$/, 'Le code comporte 8 caractères.'),
    role: z.enum(['patissier', 'vendeuse'], { error: 'Choisissez un rôle.' }),
    prenom: z.string().trim().min(1, 'Indiquez votre prénom.'),
    nom: z.string().trim().min(1, 'Indiquez votre nom.'),
    equipe: z.enum(['jour', 'nuit']).optional(),
  })
  .refine((valeurs) => valeurs.role !== 'patissier' || valeurs.equipe, {
    message: 'Choisissez une équipe.',
    path: ['equipe'],
  });

type Formulaire = z.infer<typeof schema>;

export default function EcranRejoindre() {
  const { rechargerProfil } = useAuth();
  const [erreur, setErreur] = useState<string | null>(null);
  const { control, handleSubmit, setValue, watch, formState } = useForm<Formulaire>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', prenom: '', nom: '', role: undefined, equipe: undefined },
  });
  const role = watch('role');
  const equipe = watch('equipe');

  async function rejoindre(valeurs: Formulaire) {
    if (!supabase) return;
    setErreur(null);
    const { error } = await supabase.rpc('rejoindre_boutique', {
      p_code: valeurs.code,
      p_role: valeurs.role,
      p_prenom: valeurs.prenom,
      p_nom: valeurs.nom,
      p_equipe: valeurs.role === 'patissier' ? valeurs.equipe : undefined,
    });
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    await rechargerProfil();
  }

  return (
    <EcranAuth titre="Rejoindre une boutique">
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Code boutique"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            value={field.value}
            onChangeText={(texte) =>
              field.onChange(
                texte
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 8),
              )
            }
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      <Text style={styles.libelle}>Rôle</Text>
      <Bouton
        titre="Pâtissier"
        variante={role === 'patissier' ? 'principal' : 'secondaire'}
        onPress={() => setValue('role', 'patissier', { shouldValidate: true })}
      />
      <Bouton
        titre="Vente"
        variante={role === 'vendeuse' ? 'principal' : 'secondaire'}
        onPress={() => setValue('role', 'vendeuse', { shouldValidate: true })}
      />
      {formState.errors.role ? <Text style={styles.erreur}>{formState.errors.role.message}</Text> : null}
      {role === 'patissier' ? (
        <>
          <Text style={styles.libelle}>Équipe</Text>
          <Bouton
            titre="Jour"
            variante={equipe === 'jour' ? 'principal' : 'secondaire'}
            onPress={() => setValue('equipe', 'jour', { shouldValidate: true })}
          />
          <Bouton
            titre="Nuit"
            variante={equipe === 'nuit' ? 'principal' : 'secondaire'}
            onPress={() => setValue('equipe', 'nuit', { shouldValidate: true })}
          />
          {formState.errors.equipe ? (
            <Text style={styles.erreur}>{formState.errors.equipe.message}</Text>
          ) : null}
        </>
      ) : null}
      <Controller
        control={control}
        name="prenom"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Prénom"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="nom"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Nom"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <Bouton
        titre="Rejoindre la boutique"
        chargement={formState.isSubmitting}
        onPress={handleSubmit(rejoindre)}
      />
      <Bouton titre="Retour" variante="secondaire" onPress={() => router.back()} />
    </EcranAuth>
  );
}

const styles = StyleSheet.create({
  libelle: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
});
