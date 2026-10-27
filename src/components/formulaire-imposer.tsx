import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { useBoutiques } from '@/api/boutiques';
import { usePatissiersActifs } from '@/api/employes';
import { useImposerProduits } from '@/api/produits';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { EditeurRecette, estVide, UNITES } from '@/components/editeur-recette';
import { EtatChargement, EtatErreur } from '@/components/etats';
import { eurosVersCentimes } from '@/lib/format';
import { couleurs, tailles } from '@/theme';
import type { Profil } from '@/types/database';

const schema = z.object({
  nom: z.string().trim().min(1, 'Indiquez le nom du produit.'),
  prix: z.string().refine((valeur) => eurosVersCentimes(valeur) !== null, {
    message: 'Indiquez un prix en euros, par exemple 3,50.',
  }),
  conservation: z.enum(['frais', 'surgele']),
  duree: z.string().regex(/^[1-9]\d*$/, 'Indiquez une durée en jours (au moins 1).'),
  seuil: z.string().regex(/^\d+$/, 'Indiquez un nombre entier (0 ou plus).'),
  fabricantId: z.string().min(1, 'Choisissez le pâtissier qui fabrique ce produit.'),
  // Les lignes entièrement vides sont ignorées (la dernière l'est toujours).
  lignes: z
    .array(
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
    )
    .refine((lignes) => lignes.some((ligne) => !estVide(ligne)), 'Ajoutez au moins un ingrédient.'),
});

type Formulaire = z.infer<typeof schema>;

type Props = {
  boutiqueInitialeId: string;
  onTermine: () => void;
  onAnnuler: () => void;
};

export function FormulaireImposer({ boutiqueInitialeId, onTermine, onAnnuler }: Props) {
  const boutiques = useBoutiques();
  const patissiers = usePatissiersActifs();
  const imposer = useImposerProduits();
  const [boutiqueId, setBoutiqueId] = useState(boutiqueInitialeId);
  const [aussi, setAussi] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const { control, handleSubmit, setValue, watch, formState } = useForm<Formulaire>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: '',
      prix: '',
      conservation: 'frais',
      duree: '2',
      seuil: '0',
      fabricantId: '',
      lignes: [],
    },
  });
  const conservation = watch('conservation');
  const fabricantId = watch('fabricantId');

  function patissiersDe(id: string): Profil[] {
    return (patissiers.data ?? []).filter((personne) => personne.boutique_id === id);
  }

  function choisirBoutique(id: string) {
    setBoutiqueId(id);
    setValue('fabricantId', '');
    setAussi((actuel) => {
      const copie = { ...actuel };
      delete copie[id];
      return copie;
    });
  }

  async function enregistrer(valeurs: Formulaire) {
    const prixCentimes = eurosVersCentimes(valeurs.prix);
    if (prixCentimes === null) return;
    const boutique = boutiques.data?.find((item) => item.id === boutiqueId);
    if (!boutique) return;

    const cibles = [
      { boutiqueId, fabricantId: valeurs.fabricantId, nomBoutique: boutique.nom },
    ];
    for (const [id, fabricant] of Object.entries(aussi)) {
      if (!fabricant) {
        setErreur('Choisissez le pâtissier de chaque boutique ajoutée.');
        return;
      }
      const autre = boutiques.data?.find((item) => item.id === id);
      cibles.push({
        boutiqueId: id,
        fabricantId: fabricant,
        nomBoutique: autre?.nom ?? 'Boutique',
      });
    }

    setErreur(null);
    try {
      await imposer.mutateAsync({
        produit: {
          nom: valeurs.nom,
          prixCentimes,
          conservation: valeurs.conservation,
          dureeJours: Number(valeurs.duree),
          seuilMin: Number(valeurs.seuil),
          lignes: valeurs.lignes.filter((ligne) => !estVide(ligne)).map((ligne) => ({
            ingredient: ligne.ingredient.trim(),
            quantite: Number(ligne.quantite.replace(',', '.')),
            unite: ligne.unite,
          })),
        },
        cibles,
      });
      onTermine();
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    }
  }

  if (boutiques.isLoading || patissiers.isLoading) return <EtatChargement />;
  if (boutiques.isError || patissiers.isError) {
    return (
      <EtatErreur
        message={messageErreur(boutiques.error ?? patissiers.error)}
        onReessayer={() => {
          void boutiques.refetch();
          void patissiers.refetch();
        }}
      />
    );
  }

  const fabricants = patissiersDe(boutiqueId);
  const autres = (boutiques.data ?? []).filter((item) => item.id !== boutiqueId);

  return (
    <View style={styles.bloc}>
      <Text style={styles.titre}>Imposer un produit</Text>
      <Text style={styles.libelle}>Boutique</Text>
      {boutiques.data?.map((item) => (
        <Bouton
          key={item.id}
          titre={item.nom}
          variante={item.id === boutiqueId ? 'principal' : 'secondaire'}
          onPress={() => choisirBoutique(item.id)}
        />
      ))}

      {fabricants.length === 0 ? (
        <Text style={styles.avertissement}>
          Cette boutique n’a aucun pâtissier actif. Un pâtissier doit d’abord la rejoindre avec le
          code d’invitation.
        </Text>
      ) : (
        <>
          <Text style={styles.libelle}>Pâtissier fabricant</Text>
          {fabricants.map((personne) => (
            <Bouton
              key={personne.id}
              titre={`${personne.prenom} ${personne.nom}`}
              variante={fabricantId === personne.id ? 'principal' : 'secondaire'}
              onPress={() => setValue('fabricantId', personne.id, { shouldValidate: true })}
            />
          ))}
          {formState.errors.fabricantId ? (
            <Text style={styles.erreur}>{formState.errors.fabricantId.message}</Text>
          ) : null}
        </>
      )}

      <Controller
        control={control}
        name="nom"
        render={({ field, fieldState }) => (
          <Champ
            libelle="Nom du produit"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
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
      <Text style={styles.libelle}>Conservation</Text>
      <Bouton
        titre="Frais"
        variante={conservation === 'frais' ? 'principal' : 'secondaire'}
        onPress={() => setValue('conservation', 'frais')}
      />
      <Bouton
        titre="Surgelé"
        variante={conservation === 'surgele' ? 'principal' : 'secondaire'}
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

      <Text style={styles.titre}>Recette</Text>
      <Controller
        control={control}
        name="lignes"
        render={({ field }) => (
          <EditeurRecette
            lignes={field.value}
            onChange={field.onChange}
            erreurs={field.value.map((_, index) => {
              const e = formState.errors.lignes?.[index];
              return e?.ingredient?.message ?? e?.quantite?.message;
            })}
          />
        )}
      />
      {formState.errors.lignes?.message || formState.errors.lignes?.root?.message ? (
        <Text style={styles.erreur}>
          {formState.errors.lignes?.message ?? formState.errors.lignes?.root?.message}
        </Text>
      ) : null}

      <Text style={styles.titre}>Imposer aussi dans d’autres boutiques</Text>
      {autres.length === 0 ? (
        <Text style={styles.avertissement}>Il n’y a pas d’autre boutique.</Text>
      ) : (
        autres.map((item) => {
          const equipe = patissiersDe(item.id);
          const choisi = item.id in aussi;
          return (
            <View key={item.id} style={styles.autre}>
              {equipe.length === 0 ? (
                <Text style={styles.avertissement}>
                  {item.nom} : aucun pâtissier actif. Impossible d’y imposer un produit pour
                  l’instant.
                </Text>
              ) : (
                <>
                  <Bouton
                    titre={choisi ? `Retirer ${item.nom}` : `Imposer aussi dans ${item.nom}`}
                    variante={choisi ? 'principal' : 'secondaire'}
                    onPress={() =>
                      setAussi((actuel) => {
                        const copie = { ...actuel };
                        if (item.id in copie) delete copie[item.id];
                        else copie[item.id] = '';
                        return copie;
                      })
                    }
                  />
                  {choisi
                    ? equipe.map((personne) => (
                        <Bouton
                          key={personne.id}
                          titre={`${personne.prenom} ${personne.nom}`}
                          variante={aussi[item.id] === personne.id ? 'principal' : 'secondaire'}
                          onPress={() =>
                            setAussi((actuel) => ({ ...actuel, [item.id]: personne.id }))
                          }
                        />
                      ))
                    : null}
                </>
              )}
            </View>
          );
        })
      )}

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <Bouton
        titre="Imposer le produit"
        chargement={formState.isSubmitting}
        desactive={fabricants.length === 0}
        onPress={handleSubmit(enregistrer)}
      />
      <Bouton titre="Annuler" variante="secondaire" onPress={onAnnuler} />
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: {
    gap: 12,
  },
  titre: {
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.texte,
  },
  libelle: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
  },
  avertissement: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
  autre: {
    gap: 8,
  },
});
