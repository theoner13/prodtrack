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
import { Ecran } from '@/components/ecran';
import { supabase } from '@/lib/supabase';
import { couleurs, tailles } from '@/theme';

const schema = z.object({
  entreprise: z.string().trim().min(1, 'Indiquez le nom de l’entreprise.'),
  prenom: z.string().trim().min(1, 'Indiquez votre prénom.'),
  nom: z.string().trim().min(1, 'Indiquez votre nom.'),
  boutique: z.string().trim().min(1, 'Indiquez le nom de la première boutique.'),
});

type Formulaire = z.infer<typeof schema>;

export default function EcranCreerEntreprise() {
  const { rechargerProfil } = useAuth();
  const [erreur, setErreur] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Formulaire>({
    resolver: zodResolver(schema),
    defaultValues: { entreprise: '', prenom: '', nom: '', boutique: '' },
  });

  async function creer(valeurs: Formulaire) {
    if (!supabase) return;
    setErreur(null);
    const { error } = await supabase.rpc('creer_entreprise', {
      p_nom_entreprise: valeurs.entreprise,
      p_prenom: valeurs.prenom,
      p_nom: valeurs.nom,
      p_nom_boutique: valeurs.boutique,
    });
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    await rechargerProfil();
  }

  return (
    <Ecran titre="Créer l'entreprise" defilement>
      <Controller
        control={control}
        name="entreprise"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Nom de l'entreprise"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="prenom"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Prénom"
            autoComplete="given-name"
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
            autoComplete="family-name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="boutique"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Nom de la première boutique"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <Bouton
        titre="Créer l'entreprise"
        chargement={formState.isSubmitting}
        onPress={handleSubmit(creer)}
      />
      <Bouton titre="Retour" variante="secondaire" onPress={() => router.back()} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
});
