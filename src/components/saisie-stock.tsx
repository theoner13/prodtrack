import { router, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  libelleMotifCourt,
  useAnnulerPerte,
  useDeclarerPerte,
  useMesPertesDuJour,
  type MotifPerte,
} from '@/api/pertes';
import { useUrlsSignees } from '@/api/photos';
import { useMesProduits, useProduits, type ProduitListe } from '@/api/produits';
import {
  sousTitreDisponibleFrais,
  useAnnulerMouvement,
  useDisponibleFrais,
  useDisponibleFraisFabricant,
  useEnregistrerMouvements,
  useMesMouvementsDuJour,
  useStatsJourProduits,
  useStock,
  useStockFabricant,
} from '@/api/stock';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { CarteProduit } from '@/components/carte-produit';
import { Champ } from '@/components/champ';
import { ChoixSegmente } from '@/components/choix-segmente';
import { Compteur } from '@/components/compteur';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import {
  avecPrefixeFabricant,
  etiquetteBoutique,
  grouperParBoutiqueDestinataire,
  sousTitreExterieurFrais,
  sousTitreExterieurSurgele,
} from '@/lib/production-exterieure';
import {
  couleurs,
  espacements,
  polices,
  rayonPetit,
  styleTitreSection,
  tailles,
} from '@/theme';

type Props = {
  type: 'production' | 'sortie';
};

type OngletProduction = 'frais' | 'surgele';
type CategorieProduction = 'production' | 'intermediaire' | 'exterieure';

type CibleAnnulation =
  | { kind: 'mouvement'; id: string; quantite: number; conservation: 'frais' | 'surgele' }
  | { kind: 'perte'; id: string; quantite: number; dansLeStock: boolean };

const MOTIFS: { id: MotifPerte; libelle: string }[] = [
  { id: 'brule', libelle: 'Brûlé' },
  { id: 'tombe', libelle: 'Tombé ou abîmé' },
  { id: 'rate', libelle: 'Raté' },
  { id: 'autre', libelle: 'Autre' },
];

function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatHeure(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
}

export function SaisieStock({ type }: Props) {
  const { profil, verrouillerApresSaisie } = useAuth();
  const boutiqueId = profil?.boutique_id ?? null;
  const userId = profil?.id ?? null;

  const [categorie, setCategorie] = useState<CategorieProduction>('production');
  const modeExterieur = type === 'production' && categorie === 'exterieure';

  const produits = useProduits(boutiqueId);
  const mesProduits = useMesProduits(modeExterieur ? userId : null);
  const stockBoutique = useStock(boutiqueId);
  const stockFabricant = useStockFabricant(modeExterieur ? userId : null);
  const disponibleBoutique = useDisponibleFrais(
    type === 'production' && !modeExterieur ? boutiqueId : null,
  );
  const disponibleFabricant = useDisponibleFraisFabricant(modeExterieur ? userId : null);
  const mouvements = useMesMouvementsDuJour(userId, type);
  const pertes = useMesPertesDuJour(
    type === 'sortie' || modeExterieur ? userId : null,
  );
  const enregistrer = useEnregistrerMouvements();
  const declarerPerte = useDeclarerPerte();
  const annuler = useAnnulerMouvement();
  const annulerPerte = useAnnulerPerte();

  const [ongletProduction, setOngletProduction] = useState<OngletProduction>('frais');
  const [quantites, setQuantites] = useState<Record<string, number>>({});
  const [recherche, setRecherche] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [typeMessage, setTypeMessage] = useState<'succes' | 'erreur'>('succes');
  const [aAnnuler, setAAnnuler] = useState<CibleAnnulation | null>(null);

  const [formulairePerteOuvert, setFormulairePerteOuvert] = useState(false);
  const [perteProduitId, setPerteProduitId] = useState<string | null>(null);
  const [perteQuantite, setPerteQuantite] = useState(0);
  const [perteMotif, setPerteMotif] = useState<MotifPerte | null>(null);
  const [perteDansLeStock, setPerteDansLeStock] = useState(false);

  const produitsExterieurs = useMemo(() => {
    if (!modeExterieur) return [];
    return (mesProduits.data?.produits ?? []).filter(
      (produit) =>
        produit.provenance_boutique_id != null &&
        produit.provenance_boutique_id === boutiqueId &&
        produit.fabricant_id === userId,
    );
  }, [modeExterieur, mesProduits.data?.produits, boutiqueId, userId]);

  const idsExterieurs = useMemo(
    () => produitsExterieurs.map((produit) => produit.id),
    [produitsExterieurs],
  );
  const statsExterieurs = useStatsJourProduits(modeExterieur ? idsExterieurs : []);

  const tousEligibles = useMemo(() => {
    if (modeExterieur) return produitsExterieurs;

    const tous = (produits.data ?? []).filter((produit) => produit.fabricant_id != null);
    if (type === 'production') {
      if (categorie === 'intermediaire') {
        return tous.filter((produit) => produit.intermediaire);
      }
      // Production locale : mes produits non intermédiaires, hors extérieurs reçus.
      return tous.filter(
        (produit) =>
          !produit.intermediaire &&
          produit.provenance_boutique_id == null &&
          produit.fabricant_id === userId,
      );
    }
    return tous;
  }, [modeExterieur, produitsExterieurs, produits.data, type, categorie, userId]);

  const listeBase = useMemo(() => {
    if (type === 'production') {
      return tousEligibles.filter((produit) => produit.conservation === ongletProduction);
    }
    return tousEligibles.filter((produit) => produit.conservation === 'surgele');
  }, [tousEligibles, type, ongletProduction]);

  const listePertes = modeExterieur
    ? produitsExterieurs
    : type === 'sortie'
      ? tousEligibles
      : [];

  const stockData = modeExterieur ? stockFabricant.data : stockBoutique.data;
  const disponibleData = modeExterieur ? disponibleFabricant.data : disponibleBoutique.data;

  const stockParProduit = useMemo(() => {
    const map = new Map<string, number>();
    for (const ligne of stockData ?? []) {
      if (ligne.produit_id) map.set(ligne.produit_id, ligne.stock ?? 0);
    }
    return map;
  }, [stockData]);

  const disponibleParProduit = useMemo(() => {
    const map = new Map<
      string,
      { disponible: number; production_jour: number; restes_veille: number }
    >();
    for (const ligne of disponibleData ?? []) {
      if (ligne.produit_id) {
        map.set(ligne.produit_id, {
          disponible: ligne.disponible ?? 0,
          production_jour: ligne.production_jour ?? 0,
          restes_veille: ligne.restes_veille ?? 0,
        });
      }
    }
    return map;
  }, [disponibleData]);

  const nomsBoutiques = useMemo(() => {
    const map = new Map<string, string>();
    for (const produit of produitsExterieurs) {
      if (produit.boutiqueNom) map.set(produit.boutique_id, produit.boutiqueNom);
    }
    return map;
  }, [produitsExterieurs]);

  const groupesExterieurs = useMemo(() => {
    if (!modeExterieur) return [];
    const terme = sansAccents(recherche.trim());
    const filtre = terme
      ? listeBase.filter((produit) => sansAccents(produit.nom).includes(terme))
      : listeBase;
    return grouperParBoutiqueDestinataire(filtre, nomsBoutiques);
  }, [modeExterieur, listeBase, recherche, nomsBoutiques]);

  const listeFiltre = useMemo(() => {
    if (modeExterieur) return listeBase;
    const terme = sansAccents(recherche.trim());
    if (!terme) return listeBase;
    return listeBase.filter((produit) => sansAccents(produit.nom).includes(terme));
  }, [listeBase, recherche, modeExterieur]);

  const saisiesDuJour = useMemo(() => {
    type Ligne =
      | {
          kind: 'mouvement';
          id: string;
          quantite: number;
          created_at: string;
          produitNom: string;
          conservation: 'frais' | 'surgele';
        }
      | {
          kind: 'perte';
          id: string;
          quantite: number;
          created_at: string;
          produitNom: string;
          motif: MotifPerte;
          dans_le_stock: boolean;
        };

    const lignes: Ligne[] = (mouvements.data ?? []).map((saisie) => ({
      kind: 'mouvement' as const,
      id: saisie.id,
      quantite: saisie.quantite,
      created_at: saisie.created_at,
      produitNom: saisie.produitNom,
      conservation: saisie.conservation,
    }));

    if (type === 'sortie' || modeExterieur) {
      for (const perte of pertes.data ?? []) {
        lignes.push({
          kind: 'perte',
          id: perte.id,
          quantite: perte.quantite,
          created_at: perte.created_at,
          produitNom: perte.produitNom,
          motif: perte.motif,
          dans_le_stock: perte.dans_le_stock,
        });
      }
    }

    return lignes.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [mouvements.data, pertes.data, type, modeExterieur]);

  const cheminsPhotos = useMemo(() => {
    const source =
      type === 'sortie' || modeExterieur ? [...listeBase, ...listePertes] : listeBase;
    return source
      .map((produit) => produit.photo_url)
      .filter((chemin): chemin is string => Boolean(chemin));
  }, [listeBase, listePertes, type, modeExterieur]);
  const photos = useUrlsSignees(cheminsPhotos);

  const perteProduit = listePertes.find((p) => p.id === perteProduitId) ?? null;
  const perteEstFrais = perteProduit?.conservation === 'frais';

  const fermerMessage = useCallback(() => setMessage(null), []);

  function reinitialiserFormulairePerte() {
    setPerteProduitId(null);
    setPerteQuantite(0);
    setPerteMotif(null);
    setPerteDansLeStock(false);
  }

  function changerOngletProduction(valeur: OngletProduction) {
    setOngletProduction(valeur);
    setQuantites({});
    setRecherche('');
  }

  function changerCategorie(valeur: CategorieProduction) {
    setCategorie(valeur);
    setQuantites({});
    setRecherche('');
    setFormulairePerteOuvert(false);
    reinitialiserFormulairePerte();
  }

  async function rafraichir() {
    await Promise.all([
      produits.refetch(),
      stockBoutique.refetch(),
      mouvements.refetch(),
      modeExterieur ? mesProduits.refetch() : Promise.resolve(),
      modeExterieur ? stockFabricant.refetch() : Promise.resolve(),
      modeExterieur ? disponibleFabricant.refetch() : Promise.resolve(),
      modeExterieur ? statsExterieurs.refetch() : Promise.resolve(),
      type === 'production' && !modeExterieur
        ? disponibleBoutique.refetch()
        : Promise.resolve(),
      type === 'sortie' || modeExterieur ? pertes.refetch() : Promise.resolve(),
    ]);
  }

  function definirQuantite(id: string, valeur: number) {
    setQuantites((actuel) => ({ ...actuel, [id]: valeur }));
  }

  async function soumettre() {
    const lignes = listeBase
      .map((produit) => ({
        produitId: produit.id,
        quantite: quantites[produit.id] ?? 0,
        nom: produit.nom,
      }))
      .filter((ligne) => ligne.quantite > 0);

    if (lignes.length === 0) {
      setTypeMessage('erreur');
      setMessage('Indiquez au moins une quantité.');
      return;
    }

    try {
      const confirmation = await enregistrer.mutateAsync({
        type,
        lignes,
        confirmation:
          type === 'production' && ongletProduction === 'frais' ? 'disponible' : 'stock',
      });
      setQuantites({});
      setTypeMessage('succes');
      setMessage(confirmation);
      verrouillerApresSaisie();
    } catch (erreur) {
      setTypeMessage('erreur');
      setMessage(messageErreur(erreur));
    }
  }

  async function soumettrePerte() {
    if (!perteProduitId) {
      setTypeMessage('erreur');
      setMessage('Choisissez un produit.');
      return;
    }
    if (!perteMotif) {
      setTypeMessage('erreur');
      setMessage('Choisissez un motif.');
      return;
    }
    if (perteQuantite <= 0) {
      setTypeMessage('erreur');
      setMessage('Indiquez une quantité perdue.');
      return;
    }

    const produit = listePertes.find((p) => p.id === perteProduitId);
    if (!produit) {
      setTypeMessage('erreur');
      setMessage('Produit introuvable.');
      return;
    }

    const dansLeStock = produit.conservation === 'frais' ? false : perteDansLeStock;

    try {
      const confirmation = await declarerPerte.mutateAsync({
        produitId: perteProduitId,
        nom: produit.nom,
        quantite: perteQuantite,
        motif: perteMotif,
        dansLeStock,
      });
      reinitialiserFormulairePerte();
      setFormulairePerteOuvert(false);
      setTypeMessage('succes');
      setMessage(confirmation);
      verrouillerApresSaisie();
    } catch (erreur) {
      setTypeMessage('erreur');
      setMessage(messageErreur(erreur));
    }
  }

  async function confirmerAnnulation(cible: CibleAnnulation) {
    try {
      if (cible.kind === 'mouvement') {
        await annuler.mutateAsync(cible.id);
        setMessage('Saisie annulée.');
      } else {
        await annulerPerte.mutateAsync(cible.id);
        setMessage('Perte annulée.');
      }
      setAAnnuler(null);
      setTypeMessage('succes');
    } catch (erreur) {
      setAAnnuler(null);
      setTypeMessage('erreur');
      setMessage(messageErreur(erreur));
    }
  }

  const chargement =
    produits.isLoading ||
    stockBoutique.isLoading ||
    mouvements.isLoading ||
    (modeExterieur &&
      (mesProduits.isLoading ||
        stockFabricant.isLoading ||
        disponibleFabricant.isLoading ||
        statsExterieurs.isLoading)) ||
    (type === 'production' && !modeExterieur && disponibleBoutique.isLoading) ||
    ((type === 'sortie' || modeExterieur) && pertes.isLoading);
  const erreur =
    produits.error ??
    stockBoutique.error ??
    mouvements.error ??
    (modeExterieur
      ? (mesProduits.error ??
        stockFabricant.error ??
        disponibleFabricant.error ??
        statsExterieurs.error)
      : null) ??
    (type === 'production' && !modeExterieur ? disponibleBoutique.error : null) ??
    (type === 'sortie' || modeExterieur ? pertes.error : null);

  if (chargement) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (erreur) {
    return (
      <Ecran>
        <EtatErreur message={messageErreur(erreur)} onReessayer={() => void rafraichir()} />
      </Ecran>
    );
  }

  const titre = type === 'production' ? 'Production' : 'Sorties';
  const titreBouton =
    type === 'production'
      ? ongletProduction === 'frais'
        ? 'Enregistrer la production du jour'
        : 'Enregistrer la production'
      : 'Enregistrer les sorties';
  const messageVide = modeExterieur
    ? 'Aucun produit envoyé à une autre boutique.'
    : type === 'production'
      ? categorie === 'intermediaire'
        ? ongletProduction === 'frais'
          ? 'Aucun produit intermédiaire frais.'
          : 'Aucun produit intermédiaire surgelé.'
        : ongletProduction === 'frais'
          ? 'Aucun produit frais à produire. Ajoutez-en dans l’onglet Mes produits.'
          : 'Aucun produit surgelé à produire. Ajoutez-en dans l’onglet Mes produits.'
      : 'Aucun produit surgelé dans cette boutique.';

  const annulationEnCours = annuler.isPending || annulerPerte.isPending;
  const afficherPertes = type === 'sortie' || modeExterieur;

  function renduLigne(produit: ProduitListe) {
    const dispo = disponibleParProduit.get(produit.id);
    const stats = statsExterieurs.data?.get(produit.id);
    let detail: string;
    if (modeExterieur && ongletProduction === 'frais') {
      detail = sousTitreExterieurFrais({
        disponible: dispo?.disponible ?? 0,
        restesVeille: dispo?.restes_veille ?? 0,
        jetes: stats?.jetes ?? 0,
        pertes: stats?.pertes ?? 0,
      });
    } else if (modeExterieur) {
      detail = sousTitreExterieurSurgele({
        stock: stockParProduit.get(produit.id) ?? 0,
        jetes: stats?.jetes ?? 0,
        pertes: stats?.pertes ?? 0,
      });
    } else if (type === 'production' && ongletProduction === 'frais') {
      const texte = sousTitreDisponibleFrais(
        dispo?.disponible ?? 0,
        dispo?.production_jour ?? 0,
        dispo?.restes_veille ?? 0,
      );
      detail = produit.intermediaire
        ? avecPrefixeFabricant(produit.fabricantNom, texte)
        : texte;
    } else if (type === 'production') {
      detail = produit.intermediaire
        ? avecPrefixeFabricant(
            produit.fabricantNom,
            `Stock : ${stockParProduit.get(produit.id) ?? 0}`,
          )
        : `Stock : ${stockParProduit.get(produit.id) ?? 0}`;
    } else {
      detail = avecPrefixeFabricant(
        produit.fabricantNom,
        `Stock : ${stockParProduit.get(produit.id) ?? 0}`,
      );
    }

    const seuil = produit.seuil_min;
    const stockValeur = stockParProduit.get(produit.id) ?? 0;
    const sousSeuil =
      modeExterieur &&
      ongletProduction === 'surgele' &&
      produit.conservation === 'surgele' &&
      stockValeur < seuil;

    return (
      <LigneSaisie
        key={produit.id}
        produit={produit}
        detail={sousSeuil ? `${detail} · Sous le seuil (min. ${seuil})` : detail}
        alerte={sousSeuil}
        photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
        quantite={quantites[produit.id] ?? 0}
        onChange={(valeur) => definirQuantite(produit.id, valeur)}
        badgeProvenance={
          type === 'sortie' && produit.provenanceBoutiqueNom
            ? etiquetteBoutique(produit.provenanceBoutiqueNom)
            : null
        }
      />
    );
  }

  return (
    <Ecran
      titre={titre}
      defilement
      enRafraichissement={
        produits.isRefetching ||
        stockBoutique.isRefetching ||
        mouvements.isRefetching ||
        (modeExterieur &&
          (mesProduits.isRefetching ||
            stockFabricant.isRefetching ||
            disponibleFabricant.isRefetching ||
            statsExterieurs.isRefetching)) ||
        (type === 'production' && !modeExterieur && disponibleBoutique.isRefetching) ||
        ((type === 'sortie' || modeExterieur) && pertes.isRefetching)
      }
      onRafraichir={() => void rafraichir()}
    >
      {type === 'production' ? (
        <ChoixSegmente
          options={[
            { valeur: 'production', libelle: 'Production', accessibilite: 'Production' },
            {
              valeur: 'intermediaire',
              libelle: 'Intermédiaire',
              accessibilite: 'Production intermédiaire',
            },
            {
              valeur: 'exterieure',
              libelle: 'Extérieure',
              accessibilite: 'Production extérieure',
            },
          ]}
          valeur={categorie}
          onChange={changerCategorie}
        />
      ) : null}

      {modeExterieur ? (
        <View style={styles.enteteExterieur}>
          <Pressable
            onPress={() => router.push('/produits/nouveau?exterieur=1' as Href)}
            style={styles.lienNouveau}
            accessibilityRole="button"
            accessibilityLabel="Nouveau produit extérieur"
          >
            <Text style={styles.lienNouveauTexte}>+ Nouveau produit extérieur</Text>
          </Pressable>
        </View>
      ) : null}

      {type === 'production' ? (
        <ChoixSegmente
          options={[
            { valeur: 'frais', libelle: 'Frais du jour' },
            { valeur: 'surgele', libelle: 'Surgelés' },
          ]}
          valeur={ongletProduction}
          onChange={changerOngletProduction}
        />
      ) : null}

      {type === 'sortie' ? (
        <Text style={styles.rappel}>
          Le chiffre d'affaires reste attribué au fabricant du produit.
        </Text>
      ) : null}

      {listeBase.length > 10 ? (
        <Champ
          libelle="Rechercher un produit"
          value={recherche}
          onChangeText={setRecherche}
          autoCorrect={false}
          autoCapitalize="none"
        />
      ) : null}

      {listeBase.length === 0 ? <EtatVide message={messageVide} /> : null}

      {modeExterieur
        ? groupesExterieurs.map((groupe) => (
            <View key={groupe.boutiqueId} style={styles.groupe}>
              <Text style={styles.intertitre}>{groupe.nomBoutique}</Text>
              {groupe.produits.map((produit) => renduLigne(produit))}
            </View>
          ))
        : listeFiltre.map((produit) => renduLigne(produit))}

      {listeBase.length > 0 || (afficherPertes && listePertes.length > 0) ? (
        <>
          {!formulairePerteOuvert ? (
            <Banniere message={message} type={typeMessage} onFermer={fermerMessage} duree={5000} />
          ) : null}
          {listeBase.length > 0 ? (
            <Bouton
              titre={titreBouton}
              pleineLargeur
              onPress={() => void soumettre()}
              chargement={enregistrer.isPending}
            />
          ) : null}
          {afficherPertes ? (
            <>
              <Bouton
                titre="Déclarer une perte"
                variante="secondaire"
                onPress={() => {
                  setFormulairePerteOuvert((ouvert) => {
                    if (ouvert) reinitialiserFormulairePerte();
                    return !ouvert;
                  });
                }}
              />
              {formulairePerteOuvert ? (
                <View style={styles.formulairePerte}>
                  <Text style={styles.label}>Produit</Text>
                  <View style={styles.puces}>
                    {listePertes.map((produit) => (
                      <Pressable
                        key={produit.id}
                        onPress={() => {
                          setPerteProduitId(produit.id);
                          if (produit.conservation === 'frais') {
                            setPerteDansLeStock(false);
                          }
                        }}
                        style={[
                          styles.puce,
                          perteProduitId === produit.id && styles.puceActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: perteProduitId === produit.id }}
                      >
                        <Text
                          style={[
                            styles.puceTexte,
                            perteProduitId === produit.id && styles.puceTexteActive,
                          ]}
                        >
                          {produit.nom}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.label}>Quantité perdue</Text>
                  <Compteur
                    valeur={perteQuantite}
                    onChange={setPerteQuantite}
                    libelle="Quantité perdue"
                  />

                  <Text style={styles.label}>Motif</Text>
                  <View style={styles.puces}>
                    {MOTIFS.map((motif) => (
                      <Pressable
                        key={motif.id}
                        onPress={() => setPerteMotif(motif.id)}
                        style={[styles.puce, perteMotif === motif.id && styles.puceActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: perteMotif === motif.id }}
                      >
                        <Text
                          style={[
                            styles.puceTexte,
                            perteMotif === motif.id && styles.puceTexteActive,
                          ]}
                        >
                          {motif.libelle}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {!perteEstFrais ? (
                    <>
                      <Pressable
                        onPress={() => setPerteDansLeStock((v) => !v)}
                        style={styles.case}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: perteDansLeStock }}
                      >
                        <Text style={styles.caseSymbole}>{perteDansLeStock ? '☑' : '☐'}</Text>
                        <Text style={styles.caseTexte}>
                          Ces produits étaient encore dans le stock
                        </Text>
                      </Pressable>
                      <Text style={styles.aideCase}>
                        Laissez décoché si ces produits avaient déjà été sortis : le stock ne change
                        pas.
                      </Text>
                    </>
                  ) : null}

                  <Banniere
                    message={message}
                    type={typeMessage}
                    onFermer={fermerMessage}
                    duree={5000}
                  />
                  <Bouton
                    titre="Enregistrer la perte"
                    onPress={() => void soumettrePerte()}
                    chargement={declarerPerte.isPending}
                  />
                </View>
              ) : null}
            </>
          ) : null}
        </>
      ) : message ? (
        <Banniere message={message} type={typeMessage} onFermer={fermerMessage} duree={5000} />
      ) : null}

      <Text style={styles.section}>Mes saisies d'aujourd'hui</Text>

      {saisiesDuJour.length === 0 ? (
        <Text style={styles.vide}>Aucune saisie aujourd'hui.</Text>
      ) : (
        saisiesDuJour.map((saisie) => {
          const cible: CibleAnnulation =
            saisie.kind === 'mouvement'
              ? {
                  kind: 'mouvement',
                  id: saisie.id,
                  quantite: saisie.quantite,
                  conservation: saisie.conservation,
                }
              : {
                  kind: 'perte',
                  id: saisie.id,
                  quantite: saisie.quantite,
                  dansLeStock: saisie.dans_le_stock,
                };
          const ouverte =
            aAnnuler?.kind === cible.kind && aAnnuler.id === cible.id;

          return (
            <View key={`${saisie.kind}-${saisie.id}`} style={styles.saisie}>
              <View style={styles.saisieInfos}>
                <Text style={styles.saisieTexte}>
                  {saisie.kind === 'mouvement'
                    ? `${saisie.quantite} ${saisie.produitNom}`
                    : `${saisie.quantite} ${saisie.produitNom} — perte (${libelleMotifCourt(saisie.motif)})${
                        saisie.dans_le_stock ? ' · retirée du stock' : ''
                      }`}
                </Text>
                <Text style={styles.heure}>{formatHeure(saisie.created_at)}</Text>
              </View>
              {ouverte ? (
                <View style={styles.confirmation}>
                  <Text style={styles.confirmationTexte}>
                    {saisie.kind === 'mouvement'
                      ? saisie.conservation === 'frais'
                        ? 'Annuler cette saisie ?'
                        : `Annuler cette saisie ? Le stock sera corrigé de ${saisie.quantite}.`
                      : saisie.dans_le_stock
                        ? `Annuler cette perte ? Le stock sera corrigé de ${saisie.quantite}.`
                        : 'Annuler cette perte ?'}
                  </Text>
                  <Bouton
                    titre={
                      saisie.kind === 'mouvement'
                        ? 'Oui, annuler la saisie'
                        : 'Oui, annuler la perte'
                    }
                    variante="danger"
                    onPress={() => void confirmerAnnulation(cible)}
                    chargement={annulationEnCours}
                  />
                  <Bouton
                    titre={saisie.kind === 'mouvement' ? 'Non, la garder' : 'Non, la garder'}
                    variante="secondaire"
                    onPress={() => setAAnnuler(null)}
                    desactive={annulationEnCours}
                  />
                </View>
              ) : (
                <Bouton
                  titre="Annuler"
                  variante="secondaire"
                  onPress={() => setAAnnuler(cible)}
                />
              )}
            </View>
          );
        })
      )}
    </Ecran>
  );
}

function LigneSaisie({
  produit,
  detail,
  alerte,
  photoUrl,
  quantite,
  onChange,
  badgeProvenance,
}: {
  produit: ProduitListe;
  detail: string;
  alerte?: boolean;
  photoUrl?: string | null;
  quantite: number;
  onChange: (valeur: number) => void;
  badgeProvenance?: string | null;
}) {
  return (
    <CarteProduit
      nom={produit.nom}
      photoUrl={photoUrl}
      sousTitre={detail}
      alerte={alerte}
      sousLigne={<Compteur valeur={quantite} onChange={onChange} libelle={produit.nom} />}
    >
      {produit.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
      {badgeProvenance ? <Text style={styles.badge}>{badgeProvenance}</Text> : null}
    </CarteProduit>
  );
}

const styles = StyleSheet.create({
  rappel: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  enteteExterieur: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  lienNouveau: {
    paddingVertical: espacements.xs,
  },
  lienNouveauTexte: {
    fontSize: tailles.petit,
    fontWeight: '500',
    color: couleurs.principal,
    fontFamily: polices.sans,
  },
  groupe: {
    gap: espacements.xs,
  },
  intertitre: {
    ...styleTitreSection,
    marginTop: espacements.s,
  },
  section: {
    ...styleTitreSection,
    marginTop: espacements.m,
  },
  vide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  saisie: {
    gap: espacements.s,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  saisieInfos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: espacements.m,
  },
  saisieTexte: {
    flex: 1,
    fontSize: tailles.normal,
    fontWeight: '500',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  heure: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  confirmation: {
    gap: espacements.s,
  },
  confirmationTexte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  formulairePerte: {
    gap: espacements.m,
    padding: 12,
    borderRadius: rayonPetit,
    backgroundColor: couleurs.fondGroupe,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  label: {
    ...styleTitreSection,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
    padding: 2,
    borderRadius: rayonPetit,
    backgroundColor: couleurs.fondSegment,
  },
  puce: {
    height: 32,
    paddingHorizontal: espacements.m,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  puceActive: {
    backgroundColor: couleurs.principal,
  },
  puceTexte: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontWeight: '400',
    fontFamily: polices.sans,
  },
  puceTexteActive: {
    color: couleurs.texteSurPrincipal,
    fontWeight: '500',
  },
  case: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    minHeight: 44,
  },
  caseSymbole: {
    fontSize: tailles.grand,
    color: couleurs.texte,
  },
  caseTexte: {
    flex: 1,
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontWeight: '500',
    fontFamily: polices.sans,
  },
  aideCase: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  badge: {
    overflow: 'hidden',
    backgroundColor: couleurs.fondGroupe,
    color: couleurs.texteSecondaire,
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    fontFamily: polices.sans,
  },
});
