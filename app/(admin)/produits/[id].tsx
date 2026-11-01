import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useEmploye, usePatissiers } from '@/api/employes';
import { useUrlSignee } from '@/api/photos';
import { useFicheProduit, useModifierProduit } from '@/api/produits';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { BoutonRetour } from '@/components/bouton-retour';
import { Champ } from '@/components/champ';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { eurosVersCentimes, formatEuros } from '@/lib/format';
import { couleurs, espacements, polices, rayonPetit, tailles } from '@/theme';

function quantiteTexte(valeur: number): string {
  return String(valeur).replace('.', ',');
}

export default function EcranFicheProduitAdmin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const produitId = typeof id === 'string' ? id : id?.[0];
  const fiche = useFicheProduit(produitId ?? null);
  const boutiques = useBoutiques();
  const produit = fiche.data?.produit;
  const lignes = fiche.data?.lignes ?? [];
  const photo = useUrlSignee(produit?.photo_url ?? null);
  const fabricant = useEmploye(produit?.fabricant_id ?? undefined);
  const patissiers = usePatissiers(produit?.boutique_id ?? null);
  const modifier = useModifierProduit();
  const { width } = useWindowDimensions();
  const actionsEmpilees = width < 420;

  const [prixOuvert, setPrixOuvert] = useState(false);
  const [saisiePrix, setSaisiePrix] = useState('');
  const [fabricantOuvert, setFabricantOuvert] = useState(false);
  const [recetteOuverte, setRecetteOuverte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const boutiqueNom = useMemo(() => {
    const bid = produit?.boutique_id;
    if (!bid) return '—';
    return (boutiques.data ?? []).find((b) => b.id === bid)?.nom ?? '—';
  }, [produit?.boutique_id, boutiques.data]);

  const fabricantNom = !produit?.fabricant_id
    ? 'Sans pâtissier'
    : fabricant.data
      ? `${fabricant.data.prenom} ${fabricant.data.nom}`.trim()
      : 'Fabricant inconnu';

  function retour() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(admin)/produits');
  }

  async function enregistrerPrix() {
    if (!produitId) return;
    const centimes = eurosVersCentimes(saisiePrix);
    if (centimes === null) {
      setErreur('Indiquez un prix en euros, par exemple 3,50.');
      return;
    }
    setErreur(null);
    try {
      await modifier.mutateAsync({ id: produitId, prixCentimes: centimes });
      setPrixOuvert(false);
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    }
  }

  async function choisirFabricant(fabricantId: string) {
    if (!produitId) return;
    setErreur(null);
    try {
      await modifier.mutateAsync({ id: produitId, fabricantId });
      setFabricantOuvert(false);
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    }
  }

  if (fiche.isLoading || boutiques.isLoading) {
    return (
      <Ecran defilement>
        <BoutonRetour onPress={retour} />
        <EtatChargement />
      </Ecran>
    );
  }

  if (fiche.isError || boutiques.isError) {
    return (
      <Ecran defilement>
        <BoutonRetour onPress={retour} />
        <EtatErreur
          message={messageErreur(fiche.error ?? boutiques.error)}
          onReessayer={() => {
            void fiche.refetch();
            void boutiques.refetch();
          }}
        />
      </Ecran>
    );
  }

  if (!produit) {
    return (
      <Ecran defilement>
        <BoutonRetour onPress={retour} />
        <EtatVide message="Produit introuvable." />
      </Ecran>
    );
  }

  const conservationLibelle = produit.conservation === 'surgele' ? 'Surgelé' : 'Frais';
  const conservationValeur =
    produit.duree_conservation_jours != null
      ? `${conservationLibelle} · ${produit.duree_conservation_jours} jour${produit.duree_conservation_jours > 1 ? 's' : ''}`
      : conservationLibelle;
  const aUneRecette = lignes.length > 0;

  return (
    <Ecran defilement>
      <BoutonRetour onPress={retour} />

      <View style={styles.entete}>
        {produit.photo_url && photo.data ? (
          <Image
            source={{ uri: photo.data }}
            style={styles.photo}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.photo, styles.initiale]}>
            <Text style={styles.lettre}>{produit.nom.trim().charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.enteteTextes}>
          <Text style={styles.nom}>{produit.nom}</Text>
          <View style={styles.badges}>
            {produit.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
            {produit.impose_par_admin ? <Text style={styles.badge}>Imposé</Text> : null}
            {!produit.fabricant_id ? <Text style={styles.badge}>Sans pâtissier</Text> : null}
          </View>
          <Text style={styles.boutique}>{boutiqueNom}</Text>
        </View>
      </View>

      <View style={styles.carte}>
        <LigneInfo libelle="Fabricant" valeur={fabricantNom} />
        {!produit.intermediaire ? (
          <LigneInfo libelle="Prix" valeur={formatEuros(produit.prix_centimes)} />
        ) : null}
        <LigneInfo libelle="Conservation" valeur={conservationValeur} />

        {aUneRecette ? (
          <>
            <Pressable
              onPress={() => setRecetteOuverte((o) => !o)}
              accessibilityRole="button"
              accessibilityState={{ expanded: recetteOuverte }}
              accessibilityLabel={`Voir la recette de ${produit.nom}`}
              style={({ pressed }) => [styles.ligneRecette, pressed && styles.ligneRecettePresse]}
            >
              <Text style={styles.recetteTitre}>Recette</Text>
              <Text style={styles.chevron}>{recetteOuverte ? '˄' : '›'}</Text>
            </Pressable>
            {recetteOuverte ? (
              <View style={styles.recetteBloc}>
                {lignes.map((ligne) => (
                  <View key={`${ligne.ordre}-${ligne.ingredient}`} style={styles.ingredient}>
                    <Text style={styles.ingredientNom}>{ligne.ingredient}</Text>
                    <Text style={styles.ingredientQte}>
                      {quantiteTexte(ligne.quantite)} {ligne.unite}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.recetteAbsente}>Recette — non renseignée</Text>
        )}
      </View>

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      <View style={[styles.actions, actionsEmpilees && styles.actionsEmpilees]}>
        {!produit.intermediaire && !prixOuvert ? (
          <View style={styles.actionItem}>
            <Bouton
              titre="Modifier le prix"
              variante="secondaire"
              onPress={() => {
                setPrixOuvert(true);
                setFabricantOuvert(false);
                setSaisiePrix((produit.prix_centimes / 100).toFixed(2).replace('.', ','));
              }}
            />
          </View>
        ) : null}
        {!fabricantOuvert ? (
          <View style={styles.actionItem}>
            <Bouton
              titre="Réattribuer le fabricant"
              variante="secondaire"
              onPress={() => {
                setFabricantOuvert(true);
                setPrixOuvert(false);
              }}
            />
          </View>
        ) : null}
      </View>

      {!produit.intermediaire && prixOuvert ? (
        <View style={styles.panneau}>
          <Champ
            libelle="Nouveau prix (€)"
            keyboardType="decimal-pad"
            value={saisiePrix}
            onChangeText={setSaisiePrix}
          />
          <Bouton
            titre="Enregistrer le prix"
            chargement={modifier.isPending}
            onPress={() => void enregistrerPrix()}
          />
          <Bouton titre="Annuler" variante="secondaire" onPress={() => setPrixOuvert(false)} />
        </View>
      ) : null}

      {fabricantOuvert ? (
        <View style={styles.panneau}>
          <Text style={styles.libelle}>Nouveau fabricant</Text>
          {(patissiers.data ?? []).length === 0 ? (
            <Text style={styles.erreur}>Aucun pâtissier actif dans cette boutique.</Text>
          ) : (
            patissiers.data?.map((personne) => (
              <Bouton
                key={personne.id}
                titre={`${personne.prenom} ${personne.nom}`}
                variante={personne.id === produit.fabricant_id ? 'principal' : 'secondaire'}
                chargement={modifier.isPending}
                onPress={() => void choisirFabricant(personne.id)}
              />
            ))
          )}
          <Bouton titre="Annuler" variante="secondaire" onPress={() => setFabricantOuvert(false)} />
        </View>
      ) : null}
    </Ecran>
  );
}

function LigneInfo({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <View style={[styles.ligneInfo, styles.ligneSeparee]}>
      <Text style={styles.ligneLibelle}>{libelle}</Text>
      <Text style={styles.ligneValeur}>{valeur}</Text>
    </View>
  );
}

const TAILLE_PHOTO = 88;

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacements.m,
    paddingVertical: espacements.m,
  },
  photo: {
    width: TAILLE_PHOTO,
    height: TAILLE_PHOTO,
    borderRadius: rayonPetit,
  },
  initiale: {
    backgroundColor: couleurs.principalClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lettre: {
    fontSize: tailles.titre,
    fontWeight: '600',
    color: couleurs.principalFonce,
    fontFamily: polices.sans,
  },
  enteteTextes: {
    flex: 1,
    gap: espacements.s,
    justifyContent: 'center',
    minHeight: TAILLE_PHOTO,
  },
  nom: {
    fontSize: tailles.grand,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  boutique: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  badge: {
    overflow: 'hidden',
    backgroundColor: couleurs.principalClair,
    color: couleurs.principalFonce,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: espacements.s,
    paddingVertical: 2,
    borderRadius: 8,
    fontFamily: polices.sans,
  },
  carte: {
    backgroundColor: couleurs.fondGroupe,
    borderRadius: rayonPetit,
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.xs,
    marginBottom: espacements.m,
  },
  ligneInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: espacements.m,
    paddingVertical: espacements.m,
  },
  ligneSeparee: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
  },
  ligneLibelle: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  ligneValeur: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: tailles.normal,
    fontWeight: '500',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  ligneRecette: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: espacements.m,
  },
  ligneRecettePresse: {
    opacity: 0.7,
  },
  recetteTitre: {
    fontSize: tailles.normal,
    fontWeight: '500',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  chevron: {
    fontSize: tailles.grand,
    color: couleurs.texteMuet,
    fontFamily: polices.sans,
  },
  recetteBloc: {
    paddingBottom: espacements.m,
    gap: espacements.s,
  },
  ingredient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: espacements.m,
  },
  ingredientNom: {
    flex: 1,
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  ingredientQte: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  recetteAbsente: {
    fontSize: tailles.normal,
    color: couleurs.texteMuet,
    paddingVertical: espacements.m,
    fontFamily: polices.sans,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.m,
    alignItems: 'flex-start',
  },
  actionsEmpilees: {
    flexDirection: 'column',
  },
  actionItem: {
    flexGrow: 1,
    flexShrink: 1,
  },
  panneau: {
    gap: espacements.s,
    marginTop: espacements.m,
  },
  libelle: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    marginBottom: espacements.s,
    fontFamily: polices.sans,
  },
});
