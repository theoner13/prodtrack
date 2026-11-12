import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
import { AdminCarte } from '@/components/admin-carte';
import { eurosVersCentimes, formatEuros } from '@/lib/format';
import {
  etiquetteBoutique,
  etiquetteProvenanceAdmin,
} from '@/lib/production-exterieure';
import {
  couleurs,
  espacements,
  polices,
  rayonCarte,
  rayonPilule,
  rayonPetit,
  seuilOrdinateur,
  tailleToucheMin,
  tailles,
} from '@/theme';

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
  const { width } = useWindowDimensions();
  const ordinateur = width >= seuilOrdinateur;
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
  const [fabricantChoisiId, setFabricantChoisiId] = useState<string | null>(null);
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
    ? 'Aucun'
    : fabricant.data
      ? `${fabricant.data.prenom} ${fabricant.data.nom}`.trim()
      : produit?.provenance_boutique_id
        ? ''
        : 'Fabricant inconnu';
  const etiquetteProv = provenanceNom ? etiquetteBoutique(provenanceNom) : null;
  const fabricantLigne = etiquetteProv
    ? fabricantNom
      ? `${fabricantNom} · ${etiquetteProv}`
      : etiquetteProv
    : fabricantNom || 'Aucun';

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

  function ouvrirFabricant() {
    if (!produit) return;
    setErreur(null);
    setPrixOuvert(false);
    setFabricantChoisiId(produit.fabricant_id);
    setFabricantOuvert(true);
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

  async function enregistrerFabricant() {
    if (!produitId || !fabricantChoisiId) {
      setErreur('Choisissez un pâtissier.');
      return;
    }
    setErreur(null);
    try {
      await modifier.mutateAsync({ id: produitId, fabricantId: fabricantChoisiId });
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
      <View style={ordinateur ? styles.colonneLimitee : undefined}>
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

      <AdminCarte style={styles.carte}>
        {fabricantOuvert ? (
          <View style={[styles.lignePrixEdition, styles.ligneSeparee]}>
            <Text style={styles.ligneLibelle}>Fabricant</Text>
            <View style={styles.editionFabricant}>
              {(patissiers.data ?? []).length === 0 ? (
                <Text style={styles.erreurInline}>Aucun pâtissier actif dans cette boutique.</Text>
              ) : (
                <View style={styles.puces}>
                  {patissiers.data?.map((personne) => {
                    const active = fabricantChoisiId === personne.id;
                    const libelle = `${personne.prenom} ${personne.nom}`;
                    return (
                      <Pressable
                        key={personne.id}
                        onPress={() => setFabricantChoisiId(personne.id)}
                        style={[styles.puce, active && styles.puceActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={libelle}
                      >
                        <Text style={[styles.puceTexte, active && styles.puceTexteActive]}>
                          {libelle}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <View style={styles.actionsPrix}>
                <View style={styles.actionPrixItem}>
                  <Bouton
                    titre="Enregistrer"
                    chargement={modifier.isPending}
                    onPress={() => void enregistrerFabricant()}
                  />
                </View>
                <View style={styles.actionPrixItem}>
                  <Bouton
                    titre="Annuler"
                    variante="secondaire"
                    onPress={() => {
                      setFabricantOuvert(false);
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
            accessibilityLabel={`Modifier le fabricant de ${produit.nom}`}
            onPress={ouvrirFabricant}
            style={({ pressed }) => [
              styles.ligneInfo,
              styles.ligneSeparee,
              pressed && styles.lignePresse,
            ]}
          >
            <Text style={styles.ligneLibelle}>Fabricant</Text>
            <View style={styles.prixValeur}>
              <Text style={styles.ligneValeur}>{fabricantLigne}</Text>
              <Ionicons name="create-outline" size={18} color={couleurs.texteMuet} />
            </View>
          </Pressable>
        )}
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
      </AdminCarte>

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      </View>
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
  colonneLimitee: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacements.m,
    paddingVertical: espacements.m,
  },
  photo: {
    width: TAILLE_PHOTO,
    height: TAILLE_PHOTO,
    borderRadius: rayonCarte,
  },
  initiale: {
    backgroundColor: couleurs.fondGroupe,
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
    fontSize: tailles.titreMoyen,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
    letterSpacing: -0.4,
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
    backgroundColor: couleurs.fondGroupe,
    color: couleurs.texteSecondaire,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rayonPilule,
    fontFamily: polices.sans,
  },
  carte: {
    marginBottom: espacements.m,
    paddingVertical: espacements.xs,
  },
  ligneInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: espacements.m,
    paddingVertical: espacements.m,
    minHeight: tailleToucheMin,
  },
  ligneSeparee: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordureDouce,
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
  editionFabricant: {
    gap: espacements.s,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  puce: {
    minHeight: tailleToucheMin,
    paddingHorizontal: espacements.m,
    borderRadius: rayonPilule,
    backgroundColor: couleurs.fondGroupe,
    justifyContent: 'center',
  },
  puceActive: {
    backgroundColor: couleurs.principal,
  },
  puceTexte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontWeight: '500',
    fontFamily: polices.sans,
  },
  puceTexteActive: {
    color: couleurs.texteSurPrincipal,
  },
  erreurInline: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
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
    backgroundColor: couleurs.fondGroupe,
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
    minHeight: tailleToucheMin,
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
    fontVariant: ['tabular-nums'],
  },
  recetteAbsente: {
    fontSize: tailles.normal,
    color: couleurs.texteMuet,
    paddingVertical: espacements.m,
    fontFamily: polices.sans,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    marginBottom: espacements.s,
    fontFamily: polices.sans,
  },
});

