import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { useBoutiques, useCreerBoutique } from '@/api/boutiques';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { couleurs, espacements, styleTitreSection, tailles } from '@/theme';

const schema = z.object({
  nom: z.string().trim().min(1, 'Indiquez le nom de la boutique.'),
  adresse: z.string(),
});

type Formulaire = z.infer<typeof schema>;

function messageInvitation(nom: string, code: string): string {
  return `Rejoins ${nom} sur ProdTrack avec le code ${code}`;
}

export default function EcranBoutiques() {
  const { profil } = useAuth();
  const boutiques = useBoutiques();
  const creer = useCreerBoutique();
  const [erreur, setErreur] = useState<string | null>(null);
  const [messagePartage, setMessagePartage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const fermerPartage = useCallback(() => setMessagePartage(null), []);
  const fermerConfirmation = useCallback(() => setConfirmation(null), []);
  const { control, handleSubmit, reset, formState } = useForm<Formulaire>({
    resolver: zodResolver(schema),
    defaultValues: { nom: '', adresse: '' },
  });

  async function partager(nom: string, code: string) {
    const message = messageInvitation(nom, code);
    const partagePossible =
      Platform.OS !== 'web' || (typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    if (!partagePossible) {
      setMessagePartage(message);
      return;
    }
    try {
      await Share.share({ message });
    } catch (probleme: unknown) {
      const texte = probleme instanceof Error ? probleme.message.toLowerCase() : '';
      if (texte.includes('cancel') || texte.includes('abort') || texte.includes('dismiss')) return;
      setMessagePartage(message);
    }
  }

  async function enregistrer(valeurs: Formulaire) {
    if (!profil) return;
    setErreur(null);
    try {
      await creer.mutateAsync({
        entrepriseId: profil.entreprise_id,
        nom: valeurs.nom,
        adresse: valeurs.adresse,
      });
      reset();
      setConfirmation('Boutique créée.');
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    }
  }

  return (
    <Ecran titre="Boutiques" defilement>
      <Banniere message={confirmation} onFermer={fermerConfirmation} />
      <Banniere message={messagePartage} duree={60000} onFermer={fermerPartage} />
      <Text style={styles.sousTitre}>Nouvelle boutique</Text>
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
      <Controller
        control={control}
        name="adresse"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Adresse (facultative)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <Bouton
        titre="Créer la boutique"
        chargement={formState.isSubmitting}
        onPress={handleSubmit(enregistrer)}
      />

      {boutiques.isLoading ? <EtatChargement /> : null}
      {boutiques.isError ? (
        <EtatErreur message={messageErreur(boutiques.error)} onReessayer={() => void boutiques.refetch()} />
      ) : null}
      {boutiques.data && boutiques.data.length === 0 ? (
        <EtatVide message="Aucune boutique pour l’instant. Créez-en une avec le formulaire ci-dessus." />
      ) : null}
      {boutiques.data?.map((boutique) => (
        <View key={boutique.id} style={styles.carte}>
          <Text style={styles.nom}>{boutique.nom}</Text>
          {boutique.adresse ? <Text style={styles.adresse}>{boutique.adresse}</Text> : null}
          <Text style={styles.code} selectable>
            {boutique.code_invitation}
          </Text>
          <Bouton
            titre="Partager le code"
            variante="secondaire"
            onPress={() => void partager(boutique.nom, boutique.code_invitation)}
          />
        </View>
      ))}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  sousTitre: {
    ...styleTitreSection,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
  carte: {
    gap: espacements.s,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
  },
  nom: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
  },
  adresse: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  code: {
    fontSize: tailles.titre,
    fontWeight: '600',
    letterSpacing: 4,
    color: couleurs.principalFonce,
    textAlign: 'center',
  },
});
