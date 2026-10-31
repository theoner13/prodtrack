import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useEmploye, usePatissiers } from '@/api/employes';
import { useUrlSignee } from '@/api/photos';
import { useFicheProduit, useModifierProduit } from '@/api/produits';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { eurosVersCentimes, formatEuros } from '@/lib/format';
import { couleurs, espacements, tailles } from '@/theme';

export default function EcranFicheProduitAdmin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const produitId = typeof id === 'string' ? id : id?.[0];
  const fiche = useFicheProduit(produitId ?? null);
  const boutiques = useBoutiques();
  const produit = fiche.data?.produit;
  const photo = useUrlSignee(produit?.photo_url ?? null);
  const fabricant = useEmploye(produit?.fabricant_id ?? undefined);
  const patissiers = usePatissiers(produit?.boutique_id ?? null);
  const modifier = useModifierProduit();

  const [prixOuvert, setPrixOuvert] = useState(false);
  const [saisiePrix, setSaisiePrix] = useState('');
  const [fabricantOuvert, setFabricantOuvert] = useState(false);
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
      <Ecran titre="Produit" defilement>
        <Bouton titre="Retour" variante="secondaire" onPress={retour} />
        <EtatChargement />
      </Ecran>
    );
  }

  if (fiche.isError || boutiques.isError) {
    return (
      <Ecran titre="Produit" defilement>
        <Bouton titre="Retour" variante="secondaire" onPress={retour} />
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
      <Ecran titre="Produit" defilement>
        <Bouton titre="Retour" variante="secondaire" onPress={retour} />
        <EtatVide message="Produit introuvable." />
      </Ecran>
    );
  }

  const conservationLibelle = produit.conservation === 'surgele' ? 'Surgelé' : 'Frais';

  return (
    <Ecran titre="Produit" defilement>
      <Bouton titre="Retour" variante="secondaire" onPress={retour} />

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
        <Text style={styles.nom}>{produit.nom}</Text>
        <Text style={styles.meta}>Boutique : {boutiqueNom}</Text>
        <Text style={styles.meta}>Fabricant : {fabricantNom}</Text>
        {!produit.intermediaire ? (
          <Text style={styles.meta}>Prix : {formatEuros(produit.prix_centimes)}</Text>
        ) : null}
        <Text style={styles.meta}>
          Conservation : {conservationLibelle}
          {produit.duree_conservation_jours != null
            ? ` — ${produit.duree_conservation_jours} jour${produit.duree_conservation_jours > 1 ? 's' : ''}`
            : ''}
        </Text>
        <View style={styles.badges}>
          {produit.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
          {produit.impose_par_admin ? <Text style={styles.badge}>Imposé</Text> : null}
          {!produit.fabricant_id ? <Text style={styles.badge}>Sans pâtissier</Text> : null}
        </View>
      </View>

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      {!produit.intermediaire && prixOuvert ? (
        <>
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
        </>
      ) : !produit.intermediaire ? (
        <Bouton
          titre="Modifier le prix"
          variante="secondaire"
          onPress={() => {
            setPrixOuvert(true);
            setFabricantOuvert(false);
            setSaisiePrix((produit.prix_centimes / 100).toFixed(2).replace('.', ','));
          }}
        />
      ) : null}

      {fabricantOuvert ? (
        <>
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
        </>
      ) : (
        <Bouton
          titre="Réattribuer le fabricant"
          variante="secondaire"
          onPress={() => {
            setFabricantOuvert(true);
            setPrixOuvert(false);
          }}
        />
      )}
    </Ecran>
  );
}

const TAILLE_PHOTO = 120;

const styles = StyleSheet.create({
  entete: {
    alignItems: 'center',
    gap: espacements.s,
    paddingVertical: espacements.m,
  },
  photo: {
    width: TAILLE_PHOTO,
    height: TAILLE_PHOTO,
    borderRadius: 12,
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
  },
  nom: {
    fontSize: tailles.grand,
    fontWeight: '600',
    color: couleurs.texte,
  },
  meta: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
    justifyContent: 'center',
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
  },
  libelle: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
});
