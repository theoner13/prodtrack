import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import {
  useCatalogueProduits,
  useCatalogueRecette,
  useFabriquerAussi,
} from '@/api/catalogue';
import { useUrlSignee } from '@/api/photos';
import { useProduits } from '@/api/produits';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur } from '@/components/etats';
import { formatEuros } from '@/lib/format';
import {
  couleurs,
  espacements,
  ombres,
  polices,
  rayonCarte,
  rayonPetit,
  styleTitreSection,
  tailles,
} from '@/theme';

function nomNormalise(nom: string): string {
  return nom.trim().toLowerCase();
}

function quantiteTexte(valeur: number): string {
  return String(valeur).replace('.', ',');
}

export default function EcranCatalogueProduit() {
  const { id, boutique, boutiqueId } = useLocalSearchParams<{
    id: string;
    boutique?: string;
    boutiqueId?: string;
  }>();
  const { profil } = useAuth();
  const produits = useCatalogueProduits(boutiqueId ?? null);
  const recette = useCatalogueRecette(id ?? null);
  const produitsBoutique = useProduits(profil?.boutique_id ?? null);
  const fabriquer = useFabriquerAussi();
  const [erreur, setErreur] = useState<string | null>(null);

  const produit = (produits.data ?? []).find((item) => item.id === id);
  const photo = useUrlSignee(produit?.photo_url ?? null);
  const dejaChezMoi =
    Boolean(produit) &&
    (produitsBoutique.data ?? []).some(
      (item) => nomNormalise(item.nom) === nomNormalise(produit!.nom),
    );

  async function confirmer() {
    if (!profil?.boutique_id || !profil.id || !produit) {
      setErreur('Aucune boutique n’est associée à votre compte.');
      return;
    }
    setErreur(null);
    try {
      const nouvelId = await fabriquer.mutateAsync({
        boutiqueId: profil.boutique_id,
        fabricantId: profil.id,
        produit,
        lignes: recette.data ?? [],
      });
      router.replace({
        pathname: '/produits/[id]',
        params: { id: nouvelId, ajoute: '1' },
      } as Href);
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    }
  }

  if (produits.isLoading || recette.isLoading || produitsBoutique.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (produits.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(produits.error)}
          onReessayer={() => void produits.refetch()}
        />
      </Ecran>
    );
  }

  if (recette.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(recette.error)}
          onReessayer={() => void recette.refetch()}
        />
      </Ecran>
    );
  }

  if (!produit) {
    return (
      <Ecran>
        <EtatErreur message="Ce produit n’est plus disponible dans le catalogue." />
      </Ecran>
    );
  }

  const lignes = recette.data ?? [];
  const conservationLibelle = produit.conservation === 'surgele' ? 'Surgelé' : 'Frais';

  return (
    <Ecran defilement>
      <View style={styles.carte}>
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
        </View>
        {produit.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
      </View>

      <View style={styles.carte}>
        <Text style={styles.detail}>Boutique : {boutique ?? '—'}</Text>
        {!produit.intermediaire ? (
          <Text style={styles.prixDiscret}>Prix pratiqué : {formatEuros(produit.prix_centimes)}</Text>
        ) : null}
        <Text style={styles.detail}>
          Conservation : {conservationLibelle}
          {produit.duree_conservation_jours != null
            ? ` — ${produit.duree_conservation_jours} jour${produit.duree_conservation_jours > 1 ? 's' : ''}`
            : ''}
        </Text>
      </View>

      <View style={styles.carte}>
        <Text style={styles.titre}>Recette</Text>
        {lignes.length === 0 ? (
          <Text style={styles.aide}>Aucune recette n’a été saisie pour ce produit.</Text>
        ) : (
          <View style={styles.recette}>
            {lignes.map((ligne) => (
              <Text key={`${ligne.ordre}-${ligne.ingredient}`} style={styles.texte}>
                {ligne.ingredient} — {quantiteTexte(ligne.quantite)} {ligne.unite}
              </Text>
            ))}
          </View>
        )}
      </View>

      {dejaChezMoi ? (
        <Text style={styles.aide}>Ce produit est déjà dans votre boutique.</Text>
      ) : null}
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <Bouton
        titre="Fabriquer aussi dans ma boutique"
        desactive={dejaChezMoi}
        chargement={fabriquer.isPending}
        onPress={() => void confirmer()}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carte: {
    gap: espacements.s,
    padding: espacements.m,
    borderRadius: rayonCarte,
    backgroundColor: couleurs.surface,
    marginBottom: espacements.m,
    ...ombres.douce,
  },
  entete: {
    gap: espacements.s,
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 220,
    borderRadius: rayonPetit,
    alignSelf: 'center',
  },
  initiale: {
    backgroundColor: couleurs.principalClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lettre: {
    fontSize: tailles.titre,
    fontWeight: '700',
    color: couleurs.principalFonce,
    fontFamily: polices.sans,
  },
  nom: {
    fontSize: tailles.titreMoyen,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
    textAlign: 'center',
  },
  detail: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  prixDiscret: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  badge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    backgroundColor: couleurs.principalClair,
    color: couleurs.principalFonce,
    fontSize: tailles.legend,
    fontWeight: '600',
    paddingHorizontal: espacements.s,
    paddingVertical: espacements.xs,
    borderRadius: rayonPetit,
    fontFamily: polices.sans,
  },
  titre: {
    ...styleTitreSection,
    marginBottom: espacements.xs,
  },
  aide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
    marginBottom: espacements.s,
  },
  texte: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  recette: {
    gap: espacements.s,
    paddingTop: espacements.xs,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    fontFamily: polices.sans,
    marginBottom: espacements.s,
  },
});
