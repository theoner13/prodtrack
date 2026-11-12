import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { z } from 'zod';

import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { useBoutiques, useCreerBoutique } from '@/api/boutiques';
import { AdminCarte } from '@/components/admin-carte';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import {
  couleurs,
  espacements,
  polices,
  rayonPilule,
  seuilOrdinateur,
  styleChiffre,
  tailleToucheMin,
  tailles,
} from '@/theme';

const schema = z.object({
  nom: z.string().trim().min(1, 'Indiquez le nom de la boutique.'),
  adresse: z.string(),
});

type Formulaire = z.infer<typeof schema>;

function messageInvitation(nom: string, code: string): string {
  return `Rejoins ${nom} sur ProdTrack avec le code ${code}`;
}

export default function EcranBoutiques() {
  const { width } = useWindowDimensions();
  const ordinateur = width >= seuilOrdinateur;
  const { profil } = useAuth();
  const boutiques = useBoutiques();
  const creer = useCreerBoutique();
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [creationLabo, setCreationLabo] = useState(false);
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

  function ouvrirFormulaire(labo: boolean) {
    setCreationLabo(labo);
    setFormulaireOuvert(true);
    setErreur(null);
  }

  function fermerFormulaire() {
    setFormulaireOuvert(false);
    setCreationLabo(false);
    setErreur(null);
    reset();
  }

  async function enregistrer(valeurs: Formulaire) {
    if (!profil) return;
    setErreur(null);
    try {
      await creer.mutateAsync({
        entrepriseId: profil.entreprise_id,
        nom: valeurs.nom,
        adresse: valeurs.adresse,
        estLaboratoire: creationLabo,
      });
      reset();
      setFormulaireOuvert(false);
      setCreationLabo(false);
      setConfirmation(creationLabo ? 'Laboratoire créé.' : 'Boutique créée.');
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    }
  }

  return (
    <Ecran defilement>
      <Banniere message={confirmation} onFermer={fermerConfirmation} />
      <Banniere message={messagePartage} duree={60000} onFermer={fermerPartage} />

      <View style={styles.entete}>
        <Pressable
          onPress={() => ouvrirFormulaire(false)}
          style={styles.lien}
          accessibilityRole="button"
          accessibilityLabel="Nouvelle boutique"
        >
          <Text style={styles.lienTexte}>+ Nouvelle boutique</Text>
        </Pressable>
        <Pressable
          onPress={() => ouvrirFormulaire(true)}
          style={styles.lien}
          accessibilityRole="button"
          accessibilityLabel="Nouveau laboratoire"
        >
          <Text style={styles.lienTexte}>+ Nouveau laboratoire</Text>
        </Pressable>
      </View>

      {formulaireOuvert ? (
        <AdminCarte style={styles.formulaire}>
          <Text style={styles.titreFormulaire}>
            {creationLabo ? 'Nouveau laboratoire' : 'Nouvelle boutique'}
          </Text>
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
            titre={creationLabo ? 'Créer le laboratoire' : 'Créer la boutique'}
            chargement={formState.isSubmitting}
            onPress={handleSubmit(enregistrer)}
          />
          <Pressable
            onPress={fermerFormulaire}
            accessibilityRole="button"
            accessibilityLabel="Annuler"
            style={styles.lienAnnuler}
          >
            <Text style={styles.lienAnnulerTexte}>Annuler</Text>
          </Pressable>
        </AdminCarte>
      ) : null}

      {boutiques.isLoading ? <EtatChargement /> : null}
      {boutiques.isError ? (
        <EtatErreur message={messageErreur(boutiques.error)} onReessayer={() => void boutiques.refetch()} />
      ) : null}
      {boutiques.data && boutiques.data.length === 0 ? (
        <EtatVide message="Aucune boutique pour l’instant. Créez-en une avec + Nouvelle boutique." />
      ) : null}
      <View style={[styles.grille, ordinateur && styles.grilleOrdi]}>
        {boutiques.data?.map((boutique) => (
          <AdminCarte
            key={boutique.id}
            style={[styles.carte, ordinateur && styles.carteOrdi]}
          >
            <Text style={styles.nom}>{boutique.nom}</Text>
            {boutique.est_laboratoire ? <Text style={styles.badge}>Laboratoire</Text> : null}
            {boutique.adresse ? <Text style={styles.adresse}>{boutique.adresse}</Text> : null}
            <Text style={styles.code} selectable>
              {boutique.code_invitation}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Partager le code"
              onPress={() => void partager(boutique.nom, boutique.code_invitation)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={({ pressed }) => [styles.pastille, pressed && styles.pastilleAppuyee]}
            >
              <Ionicons name="share-outline" size={16} color={couleurs.texteSecondaire} />
              <Text style={styles.pastilleTexte}>Partager le code</Text>
            </Pressable>
          </AdminCarte>
        ))}
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: espacements.m,
  },
  lien: {
    minHeight: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: espacements.m,
    borderRadius: rayonPilule,
    backgroundColor: couleurs.fondPuce,
  },
  lienTexte: {
    fontSize: tailles.petit,
    fontWeight: '500',
    color: couleurs.principal,
    fontFamily: polices.sans,
  },
  formulaire: {
    gap: espacements.m,
    marginBottom: espacements.m,
  },
  titreFormulaire: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  badge: {
    overflow: 'hidden',
    alignSelf: 'flex-start',
    backgroundColor: couleurs.accentClair,
    color: couleurs.accentFonce,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rayonPilule,
    fontFamily: polices.sans,
  },
  lienAnnuler: {
    alignSelf: 'flex-start',
    minHeight: tailleToucheMin,
    justifyContent: 'center',
    paddingVertical: espacements.xs,
  },
  lienAnnulerTexte: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
  grille: {
    marginTop: espacements.s,
    gap: 10,
  },
  grilleOrdi: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 0,
    marginHorizontal: -5,
  },
  carte: {
    alignItems: 'center',
    gap: espacements.s,
  },
  carteOrdi: {
    width: '50%',
    paddingHorizontal: 5,
  },
  nom: {
    fontSize: tailles.grand,
    fontWeight: '600',
    color: couleurs.texte,
    alignSelf: 'stretch',
    fontFamily: polices.sans,
  },
  adresse: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    alignSelf: 'stretch',
    fontFamily: polices.sans,
  },
  code: {
    ...styleChiffre,
    fontSize: tailles.titre,
    letterSpacing: 4,
    color: couleurs.principalFonce,
    textAlign: 'center',
    marginVertical: espacements.s,
  },
  pastille: {
    minHeight: tailleToucheMin,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: rayonPilule,
    backgroundColor: couleurs.fondGroupe,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  pastilleAppuyee: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  pastilleTexte: {
    fontSize: tailles.petit,
    fontWeight: '500',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
});
