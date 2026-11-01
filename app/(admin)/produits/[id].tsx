import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useEmploye, usePatissiers } from '@/api/employes';
import { useUrlSignee } from '@/api/photos';
import { useFicheProduit, useModifierProduit } from '@/api/produits';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { BoutonRetour } from '@/components/bouton-retour';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { eurosVersCentimes, formatEuros } from '@/lib/format';
import {
  etiquetteBoutique,
  etiquetteProvenanceAdmin,
} from '@/lib/production-exterieure';
import { couleurs, espacements, polices, rayonPetit, tailles } from '@/theme';

const PAS_PRIX_CENTIMES = 10;
const MIN_PRIX_CENTIMES = 10;
const TOUCHER_MIN = 48;

function quantiteTexte(valeur: number): string {
  return String(valeur).replace('.', ',');
}

function formatSaisiePrix(centimes: number): string {
  return (centimes / 100).toFixed(2).replace('.', ',');
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
  const boutiqueFabricantsId =
    produit?.provenance_boutique_id ?? produit?.boutique_id ?? null;
  const patissiers = usePatissiers(boutiqueFabricantsId);
  const modifier = useModifierProduit();

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

  const provenanceNom = useMemo(() => {
    const pid = produit?.provenance_boutique_id;
    if (!pid) return null;
    return (boutiques.data ?? []).find((b) => b.id === pid)?.nom ?? null;
  }, [produit?.provenance_boutique_id, boutiques.data]);

  const fabricantNom = !produit?.fabricant_id
    ? 'Sans pâtissier'
    : fabricant.data
      ? `${fabricant.data.prenom} ${fabricant.data.nom}`.trim()
      : 'Fabricant inconnu';
  const fabricantLigne = provenanceNom
    ? `${fabricantNom} · ${etiquetteBoutique(provenanceNom)}`
    : fabricantNom;

  function retour() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(admin)/produits');
  }

  function ouvrirPrix() {
    if (!produit) return;
    setErreur(null);
    setFabricantOuvert(false);
    setSaisiePrix(formatSaisiePrix(produit.prix_centimes));
    setPrixOuvert(true);
  }

  function ajusterPrix(deltaCentimes: number) {
    const actuel = eurosVersCentimes(saisiePrix);
    const base = actuel ?? MIN_PRIX_CENTIMES;
    const suivant = Math.max(MIN_PRIX_CENTIMES, base + deltaCentimes);
    setSaisiePrix(formatSaisiePrix(suivant));
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
  const centimesSaisis = eurosVersCentimes(saisiePrix);
  const peutDiminuer = (centimesSaisis ?? MIN_PRIX_CENTIMES) > MIN_PRIX_CENTIMES;

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
            {provenanceNom ? (
              <Text style={styles.badge}>{etiquetteProvenanceAdmin(provenanceNom)}</Text>
            ) : null}
          </View>
          <Text style={styles.boutique}>{boutiqueNom}</Text>
        </View>
      </View>

      <View style={styles.carte}>
        <LigneInfo libelle="Fabricant" valeur={fabricantLigne} />
        {!produit.intermediaire ? (
          prixOuvert ? (
            <View style={[styles.lignePrixEdition, styles.ligneSeparee]}>
              <Text style={styles.ligneLibelle}>Prix</Text>
              <View style={styles.editionPrix}>
                <View style={styles.compteurPrix}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Diminuer le prix de 0,10 euro"
                    disabled={!peutDiminuer}
                    onPress={() => ajusterPrix(-PAS_PRIX_CENTIMES)}
                    style={({ pressed }) => [
                      styles.boutonPas,
                      !peutDiminuer && styles.boutonPasInactif,
                      pressed && styles.appuye,
                    ]}
                  >
                    <Text style={styles.signePas}>−</Text>
                  </Pressable>
                  <TextInput
                    accessibilityLabel="Prix en euros"
                    value={saisiePrix}
                    onChangeText={setSaisiePrix}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    style={styles.champPrix}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Augmenter le prix de 0,10 euro"
                    onPress={() => ajusterPrix(PAS_PRIX_CENTIMES)}
                    style={({ pressed }) => [styles.boutonPas, pressed && styles.appuye]}
                  >
                    <Text style={styles.signePas}>+</Text>
                  </Pressable>
                </View>
                <View style={styles.actionsPrix}>
                  <View style={styles.actionPrixItem}>
                    <Bouton
                      titre="Enregistrer"
                      chargement={modifier.isPending}
                      onPress={() => void enregistrerPrix()}
                    />
                  </View>
                  <View style={styles.actionPrixItem}>
                    <Bouton
                      titre="Annuler"
                      variante="secondaire"
                      onPress={() => {
                        setPrixOuvert(false);
                        setErreur(null);
                      }}
                    />
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Modifier le prix de ${produit.nom}`}
              onPress={ouvrirPrix}
              style={({ pressed }) => [
                styles.ligneInfo,
                styles.ligneSeparee,
                pressed && styles.lignePresse,
              ]}
            >
              <Text style={styles.ligneLibelle}>Prix</Text>
              <View style={styles.prixValeur}>
                <Text style={styles.ligneValeur}>{formatEuros(produit.prix_centimes)}</Text>
                <Ionicons name="create-outline" size={18} color={couleurs.texteMuet} />
              </View>
            </Pressable>
          )
        ) : null}
        <LigneInfo libelle="Conservation" valeur={conservationValeur} />

        {aUneRecette ? (
          <>
            <Pressable
              onPress={() => setRecetteOuverte((o) => !o)}
              accessibilityRole="button"
              accessibilityState={{ expanded: recetteOuverte }}
              accessibilityLabel={`Voir la recette de ${produit.nom}`}
              style={({ pressed }) => [styles.ligneRecette, pressed && styles.lignePresse]}
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

      {!fabricantOuvert ? (
        <View style={styles.actions}>
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
  lignePresse: {
    opacity: 0.7,
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
  prixValeur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
  },
  lignePrixEdition: {
    paddingVertical: espacements.m,
    gap: espacements.s,
  },
  editionPrix: {
    gap: espacements.s,
  },
  compteurPrix: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.s,
  },
  boutonPas: {
    minWidth: TOUCHER_MIN,
    minHeight: TOUCHER_MIN,
    borderRadius: TOUCHER_MIN / 2,
    backgroundColor: couleurs.fond,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonPasInactif: {
    opacity: 0.35,
  },
  signePas: {
    fontSize: 22,
    fontWeight: '500',
    color: couleurs.texte,
    fontFamily: polices.sans,
    lineHeight: 26,
  },
  champPrix: {
    minWidth: 88,
    minHeight: TOUCHER_MIN,
    paddingHorizontal: espacements.s,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: couleurs.bordure,
    borderRadius: rayonPetit,
    backgroundColor: couleurs.fond,
    textAlign: 'center',
    fontSize: tailles.grand,
    fontWeight: '500',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  actionsPrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
    justifyContent: 'center',
  },
  actionPrixItem: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 120,
  },
  appuye: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  ligneRecette: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: espacements.m,
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
    alignItems: 'flex-start',
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
