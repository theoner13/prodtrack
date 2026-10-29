import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { envoyerPhoto, supprimerPhoto } from '@/api/photos';
import {
  useArchiverMonProduit,
  useDefinirPhotoProduit,
  useEnregistrerMonProduit,
  useFicheProduit,
} from '@/api/produits';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { ChoixPhoto } from '@/components/choix-photo';
import { Ecran } from '@/components/ecran';
import { EditeurRecette, estVide, UNITES, type LigneSaisie, type Unite } from '@/components/editeur-recette';
import { EtatChargement, EtatErreur } from '@/components/etats';
import { Banniere } from '@/components/banniere';
import { eurosVersCentimes } from '@/lib/format';
import { couleurs, espacements, rayon, tailles } from '@/theme';

const schema = z
  .object({
    nom: z.string().trim().min(1, 'Indiquez le nom du produit.'),
    prix: z.string(),
    conservation: z.enum(['frais', 'surgele']),
    intermediaire: z.boolean(),
    duree: z.string().regex(/^[1-9]\d*$/, 'Indiquez une durée en jours (au moins 1).'),
    seuil: z.string().regex(/^\d+$/, 'Indiquez un nombre entier (0 ou plus).'),
    photo: z.string(),
    lignes: z.array(
      z
        .object({ ingredient: z.string(), quantite: z.string(), unite: z.enum(UNITES) })
        .superRefine((ligne, ctx) => {
          if (estVide(ligne)) return;
          if (ligne.ingredient.trim() === '') {
            ctx.addIssue({ code: 'custom', path: ['ingredient'], message: 'Indiquez l’ingrédient.' });
          }
          const nombre = Number(ligne.quantite.trim().replace(',', '.'));
          if (!Number.isFinite(nombre) || nombre <= 0) {
            ctx.addIssue({ code: 'custom', path: ['quantite'], message: 'Indiquez une quantité supérieure à 0.' });
          }
        }),
    ),
  })
  .superRefine((valeurs, ctx) => {
    if (valeurs.intermediaire) return;
    if (eurosVersCentimes(valeurs.prix) === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['prix'],
        message: 'Indiquez un prix en euros, par exemple 3,50.',
      });
    }
  });

type Formulaire = z.infer<typeof schema>;

function uniteValide(unite: string): Unite {
  return (UNITES as readonly string[]).includes(unite) ? (unite as Unite) : 'g';
}

function quantiteTexte(valeur: number): string {
  return String(valeur).replace('.', ',');
}

export default function EcranFicheProduit() {
  const { id, ajoute } = useLocalSearchParams<{ id: string; ajoute?: string }>();
  const creation = id === 'nouveau';
  const { profil } = useAuth();
  const fiche = useFicheProduit(creation ? null : (id ?? null));
  const enregistrer = useEnregistrerMonProduit();
  const definirPhoto = useDefinirPhotoProduit();
  const archiver = useArchiverMonProduit();
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(
    ajoute === '1'
      ? 'Produit ajouté à votre boutique : vérifiez le prix, le seuil et ajoutez une photo.'
      : null,
  );
  const [uriLocale, setUriLocale] = useState<string | null>(null);
  const [demandeRetrait, setDemandeRetrait] = useState(false);
  const fermerConfirmation = useCallback(() => setConfirmation(null), []);
  const dejaCharge = useRef(false);

  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<Formulaire>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: '',
      prix: '',
      conservation: 'frais',
      intermediaire: false,
      duree: '2',
      seuil: '0',
      photo: '',
      lignes: [],
    },
  });
  const conservation = watch('conservation');
  const intermediaire = watch('intermediaire');
  const photo = watch('photo');
  const lignes = watch('lignes');

  useEffect(() => {
    if (!fiche.data || dejaCharge.current) return;
    dejaCharge.current = true;
    const { produit, lignes: recette } = fiche.data;
    reset({
      nom: produit.nom,
      prix: (produit.prix_centimes / 100).toFixed(2).replace('.', ','),
      conservation: produit.conservation,
      intermediaire: produit.intermediaire,
      duree: String(produit.duree_conservation_jours ?? 2),
      seuil: String(produit.seuil_min),
      photo: produit.photo_url ?? '',
      lignes: recette.map(
        (ligne): LigneSaisie => ({
          ingredient: ligne.ingredient,
          quantite: quantiteTexte(ligne.quantite),
          unite: uniteValide(ligne.unite),
        }),
      ),
    });
    if (ajoute === '1' && produit.intermediaire) {
      setConfirmation(
        'Produit ajouté à votre boutique : vérifiez le seuil et ajoutez une photo.',
      );
    }
  }, [fiche.data, reset, ajoute]);

  async function photoChange(chemin: string | null) {
    setValue('photo', chemin ?? '');
    if (!creation && id) {
      await definirPhoto.mutateAsync({ id, photoUrl: chemin });
    }
    if (chemin) setConfirmation('Photo enregistrée.');
  }

  async function sauver(valeurs: Formulaire) {
    if (!profil?.boutique_id || !profil.id) {
      setErreur('Aucune boutique n’est associée à votre compte.');
      return;
    }
    setErreur(null);
    const impose = fiche.data?.produit.impose_par_admin ?? false;
    const estIntermediaire = impose ? false : valeurs.intermediaire;
    const prixCentimes = estIntermediaire ? 0 : eurosVersCentimes(valeurs.prix);
    if (prixCentimes === null) return;
    let photoUrl = creation ? null : valeurs.photo || null;
    let cheminEnvoye: string | null = null;
    try {
      if (creation && uriLocale) {
        cheminEnvoye = await envoyerPhoto(uriLocale, 'produits', profil.boutique_id);
        photoUrl = cheminEnvoye;
      }
      const produitId = await enregistrer.mutateAsync({
        id: creation ? undefined : id,
        boutiqueId: profil.boutique_id,
        fabricantId: profil.id,
        nom: valeurs.nom,
        prixCentimes,
        photoUrl,
        conservation: valeurs.conservation,
        dureeJours: Number(valeurs.duree),
        seuilMin: Number(valeurs.seuil),
        intermediaire: estIntermediaire,
        impose,
        lignes: valeurs.lignes
          .filter((ligne) => !estVide(ligne))
          .map((ligne) => ({
            ingredient: ligne.ingredient,
            quantite: Number(ligne.quantite.replace(',', '.')),
            unite: ligne.unite,
          })),
      });
      if (creation) router.replace(`/produits/${produitId}` as Href);
      else setConfirmation('Produit enregistré.');
    } catch (probleme: unknown) {
      if (cheminEnvoye) {
        try {
          await supprimerPhoto(cheminEnvoye);
        } catch {
          // Le fichier envoyé reste orphelin si la suppression échoue aussi.
        }
      }
      setErreur(messageErreur(probleme));
    }
  }

  async function confirmerRetrait() {
    if (!id || creation) return;
    setErreur(null);
    try {
      await archiver.mutateAsync(id);
      router.replace('/produits' as Href);
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    }
  }

  if (!creation && fiche.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (!creation && fiche.isError) {
    return (
      <Ecran>
        <EtatErreur message={messageErreur(fiche.error)} onReessayer={() => void fiche.refetch()} />
      </Ecran>
    );
  }

  const produit = fiche.data?.produit;
  if (!creation && produit && profil && produit.fabricant_id !== profil.id) {
    return (
      <Ecran>
        <EtatErreur message="Ce produit ne fait pas partie de vos produits." />
      </Ecran>
    );
  }

  const impose = produit?.impose_par_admin ?? false;
  const boutiqueId = profil?.boutique_id;

  return (
    <Ecran titre={creation ? 'Nouveau produit' : (produit?.nom ?? 'Produit')} defilement>
      <Stack.Screen options={{ title: creation ? 'Nouveau produit' : 'Modifier le produit' }} />
      <Banniere message={confirmation} onFermer={fermerConfirmation} />
      {boutiqueId ? (
        <ChoixPhoto
          chemin={creation ? uriLocale : photo || null}
          dossier="produits"
          proprietaireId={boutiqueId}
          envoiDiffere={creation}
          onPhotoLocale={setUriLocale}
          onChange={photoChange}
        />
      ) : (
        <Text style={styles.erreur}>Aucune boutique n’est associée à votre compte.</Text>
      )}

      {!impose ? (
        <>
          <Text style={styles.libelle}>Type de produit</Text>
          <Bouton
            titre="Produit fini"
            variante={!intermediaire ? 'principal' : 'secondaire'}
            onPress={() => setValue('intermediaire', false)}
          />
          <Bouton
            titre="Produit intermédiaire"
            variante={intermediaire ? 'principal' : 'secondaire'}
            onPress={() => setValue('intermediaire', true)}
          />
          <Text style={styles.aide}>
            Intermédiaire : sert à fabriquer d’autres produits, n’est pas vendu en boutique.
          </Text>
        </>
      ) : null}

      <Controller
        control={control}
        name="nom"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Nom"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            editable={!impose}
            erreur={fieldState.error?.message}
          />
        )}
      />
      {impose ? (
        <Text style={styles.aide}>Imposé par le patron : le nom ne peut pas être modifié.</Text>
      ) : null}
      {!intermediaire || impose ? (
        <Controller
          control={control}
          name="prix"
          render={({ field, fieldState }) => (
            <Champ
              libelle="Prix (€)"
              keyboardType="decimal-pad"
              placeholder="3,50"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erreur={fieldState.error?.message}
            />
          )}
        />
      ) : null}

      <Text style={styles.libelle}>Conservation</Text>
      <Bouton
        titre="Frais"
        variante={conservation === 'frais' ? 'principal' : 'secondaire'}
        desactive={impose}
        onPress={() => setValue('conservation', 'frais')}
      />
      <Bouton
        titre="Surgelé"
        variante={conservation === 'surgele' ? 'principal' : 'secondaire'}
        desactive={impose}
        onPress={() => setValue('conservation', 'surgele')}
      />

      <Controller
        control={control}
        name="duree"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Durée de conservation (jours)"
            keyboardType="number-pad"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="seuil"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Seuil minimum de stock"
            keyboardType="number-pad"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      <Text style={styles.aide}>Nombre d’unités qui doit toujours rester en stock.</Text>

      <Text style={styles.titre}>Recette</Text>
      {impose ? (
        <RecetteLecture lignes={fiche.data?.lignes ?? []} />
      ) : (
        <>
          <Text style={styles.aide}>
            Facultatif : vous pouvez enregistrer le produit sans recette et la compléter plus tard.
          </Text>
          <EditeurRecette
            lignes={lignes}
            onChange={(valeur) => setValue('lignes', valeur, { shouldValidate: true })}
            erreurs={lignes.map((_, index) => {
              const e = formState.errors.lignes?.[index];
              return e?.ingredient?.message ?? e?.quantite?.message;
            })}
          />
        </>
      )}

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <Bouton
        titre={creation ? 'Enregistrer le produit' : 'Enregistrer les modifications'}
        chargement={formState.isSubmitting}
        onPress={handleSubmit(sauver)}
      />

      {!creation && !impose ? (
        demandeRetrait ? (
          <View style={styles.confirmation}>
            <Text style={styles.texte}>
              Retirer ce produit ? Il n’apparaîtra plus dans vos listes. L’historique de production
              est conservé.
            </Text>
            <Bouton
              titre="Retirer ce produit"
              variante="danger"
              chargement={archiver.isPending}
              onPress={() => void confirmerRetrait()}
            />
            <Bouton titre="Annuler" variante="secondaire" onPress={() => setDemandeRetrait(false)} />
          </View>
        ) : (
          <Bouton titre="Retirer ce produit" variante="danger" onPress={() => setDemandeRetrait(true)} />
        )
      ) : null}
    </Ecran>
  );
}

function RecetteLecture({
  lignes,
}: {
  lignes: { ingredient: string; quantite: number; unite: string }[];
}) {
  if (lignes.length === 0) {
    return <Text style={styles.aide}>Aucune recette n’a été saisie pour ce produit.</Text>;
  }
  return (
    <View style={styles.recette}>
      {lignes.map((ligne) => (
        <Text key={`${ligne.ingredient}-${ligne.quantite}-${ligne.unite}`} style={styles.texte}>
          {ligne.ingredient} — {quantiteTexte(ligne.quantite)} {ligne.unite}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  libelle: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
  },
  titre: {
    fontSize: tailles.section,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  aide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
  texte: {
    fontSize: tailles.normal,
    color: couleurs.texte,
  },
  confirmation: {
    gap: espacements.s,
    padding: espacements.m,
    borderRadius: rayon,
    backgroundColor: couleurs.erreurClair,
  },
  recette: {
    gap: espacements.s,
  },
});
