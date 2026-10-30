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
import { couleurs, styleTitreSection, tailles } from '@/theme';
import type { Profil } from '@/types/database';

/** Chaîne vide = aucun pâtissier (premier qui le prend). */
const AUCUN_PATISSIER = '';

const schema = z.object({
  nom: z.string().trim().min(1, 'Indiquez le nom du produit.'),
  prix: z.string().refine((valeur) => eurosVersCentimes(valeur) !== null, {
    message: 'Indiquez un prix en euros, par exemple 3,50.',
  }),
  conservation: z.enum(['frais', 'surgele']),
  duree: z
    .string()
    .refine((valeur) => valeur.trim() === '' || /^[1-9]\d*$/.test(valeur.trim()), {
      message: 'Indiquez une durée en jours (au moins 1), ou laissez vide.',
    }),
  seuil: z
    .string()
    .refine((valeur) => valeur.trim() === '' || /^\d+$/.test(valeur.trim()), {
      message: 'Indiquez un nombre entier (0 ou plus), ou laissez vide.',
    }),
  fabricantId: z.string(),
  // Les lignes entièrement vides sont ignorées ; la recette est facultative.
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
          ctx.addIssue({
            code: 'custom',
            path: ['quantite'],
            message: 'Indiquez une quantité supérieure à 0.',
          });
        }
      }),
  ),
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
      duree: '',
      seuil: '',
      fabricantId: AUCUN_PATISSIER,
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
    setValue('fabricantId', AUCUN_PATISSIER);
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

    const fabricantPrincipal =
      valeurs.fabricantId.trim() === '' ? null : valeurs.fabricantId;

    const cibles = [
      {
        boutiqueId,
        fabricantId: fabricantPrincipal,
        nomBoutique: boutique.nom,
      },
    ];
    for (const [id, fabricant] of Object.entries(aussi)) {
      const autre = boutiques.data?.find((item) => item.id === id);
      cibles.push({
        boutiqueId: id,
        fabricantId: fabricant.trim() === '' ? null : fabricant,
        nomBoutique: autre?.nom ?? 'Boutique',
      });
    }

    const dureeTrim = valeurs.duree.trim();
    const seuilTrim = valeurs.seuil.trim();
    const seuilMin =
      valeurs.conservation === 'surgele'
        ? seuilTrim === ''
          ? 0
          : Number(seuilTrim)
        : 0;

    setErreur(null);
    try {
      await imposer.mutateAsync({
        produit: {
          nom: valeurs.nom,
          prixCentimes,
          conservation: valeurs.conservation,
          dureeJours: dureeTrim === '' ? 2 : Number(dureeTrim),
          seuilMin,
          lignes: valeurs.lignes
            .filter((ligne) => !estVide(ligne))
            .map((ligne) => ({
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

      <Text style={styles.libelle}>Pâtissier fabricant (facultatif)</Text>
      {fabricants.length === 0 ? (
        <Text style={styles.info}>
          Aucun pâtissier actif : le premier qui rejoint pourra prendre ce produit.
        </Text>
      ) : null}
      <Bouton
        titre="Aucun : le premier pâtissier qui le prend"
        variante={fabricantId === AUCUN_PATISSIER ? 'principal' : 'secondaire'}
        onPress={() => setValue('fabricantId', AUCUN_PATISSIER, { shouldValidate: true })}
      />
      {fabricants.map((personne) => (
        <Bouton
          key={personne.id}
          titre={`${personne.prenom} ${personne.nom}`}
          variante={fabricantId === personne.id ? 'principal' : 'secondaire'}
          onPress={() => setValue('fabricantId', personne.id, { shouldValidate: true })}
        />
      ))}

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
      <Text style={styles.libelle}>Conservation (facultatif, défaut : frais)</Text>
      <Bouton
        titre="Frais"
        variante={conservation === 'frais' ? 'principal' : 'secondaire'}
        onPress={() => {
          setValue('conservation', 'frais');
          setValue('seuil', '');
        }}
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
            libelle="Durée de conservation en jours (facultatif)"
            keyboardType="number-pad"
            placeholder="2"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erreur={fieldState.error?.message}
          />
        )}
      />
      {conservation === 'surgele' ? (
        <Controller
          control={control}
          name="seuil"
          render={({ field, fieldState }) => (
            <Champ
              libelle="Seuil minimum de stock (facultatif)"
              keyboardType="number-pad"
              placeholder="0"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              erreur={fieldState.error?.message}
            />
          )}
        />
      ) : null}

      <Text style={styles.titre}>Recette (facultatif)</Text>
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

      <Text style={styles.titre}>Imposer aussi dans d’autres boutiques</Text>
      {autres.length === 0 ? (
        <Text style={styles.info}>Il n’y a pas d’autre boutique.</Text>
      ) : (
        autres.map((item) => {
          const equipe = patissiersDe(item.id);
          const choisi = item.id in aussi;
          return (
            <View key={item.id} style={styles.autre}>
              <Bouton
                titre={choisi ? `Retirer ${item.nom}` : `Imposer aussi dans ${item.nom}`}
                variante={choisi ? 'principal' : 'secondaire'}
                onPress={() =>
                  setAussi((actuel) => {
                    const copie = { ...actuel };
                    if (item.id in copie) delete copie[item.id];
                    else copie[item.id] = AUCUN_PATISSIER;
                    return copie;
                  })
                }
              />
              {choisi ? (
                <>
                  {equipe.length === 0 ? (
                    <Text style={styles.info}>
                      Aucun pâtissier actif : le premier pourra le prendre.
                    </Text>
                  ) : null}
                  <Bouton
                    titre="Aucun : le premier pâtissier qui le prend"
                    variante={aussi[item.id] === AUCUN_PATISSIER ? 'principal' : 'secondaire'}
                    onPress={() =>
                      setAussi((actuel) => ({ ...actuel, [item.id]: AUCUN_PATISSIER }))
                    }
                  />
                  {equipe.map((personne) => (
                    <Bouton
                      key={personne.id}
                      titre={`${personne.prenom} ${personne.nom}`}
                      variante={aussi[item.id] === personne.id ? 'principal' : 'secondaire'}
                      onPress={() =>
                        setAussi((actuel) => ({ ...actuel, [item.id]: personne.id }))
                      }
                    />
                  ))}
                </>
              ) : null}
            </View>
          );
        })
      )}

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <Bouton
        titre="Imposer le produit"
        chargement={formState.isSubmitting}
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
    ...styleTitreSection,
  },
  libelle: {
    ...styleTitreSection,
  },
  info: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
  autre: {
    gap: 8,
  },
});
