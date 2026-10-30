import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useUrlsSignees } from '@/api/photos';
import {
  useMesProduits,
  usePrendreProduit,
  useProduitsAPrendre,
} from '@/api/produits';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { CarteProduit } from '@/components/carte-produit';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { couleurs, espacements, styleTitreSection, tailles } from '@/theme';

export default function EcranMesProduits() {
  const { profil } = useAuth();
  const mes = useMesProduits(profil?.id ?? null);
  const aPrendre = useProduitsAPrendre(profil?.boutique_id ?? null);
  const prendre = usePrendreProduit();
  const [banniere, setBanniere] = useState<string | null>(null);
  const [erreurPrise, setErreurPrise] = useState<string | null>(null);

  const chemins = [
    ...(mes.data?.produits ?? []).map((produit) => produit.photo_url),
    ...(aPrendre.data ?? []).map((produit) => produit.photo_url),
  ].filter((chemin): chemin is string => Boolean(chemin));
  const photos = useUrlsSignees(chemins);

  function ouvrir(id: string) {
    router.push(`/produits/${id}` as Href);
  }

  async function fabriquer(produitId: string, nom: string) {
    setErreurPrise(null);
    setBanniere(null);
    try {
      await prendre.mutateAsync(produitId);
      setBanniere(
        `${nom} ajouté à vos produits. Pensez à vérifier le seuil et la durée de conservation.`,
      );
      void mes.refetch();
      void aPrendre.refetch();
    } catch (probleme: unknown) {
      setErreurPrise(messageErreur(probleme));
    }
  }

  if (mes.isLoading || aPrendre.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (mes.isError || aPrendre.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(mes.error ?? aPrendre.error)}
          onReessayer={() => {
            void mes.refetch();
            void aPrendre.refetch();
          }}
        />
      </Ecran>
    );
  }

  const produits = mes.data?.produits ?? [];
  const aPrendreListe = aPrendre.data ?? [];
  const premiereFois =
    produits.length === 0 && aPrendreListe.length === 0 && !mes.data?.dejaEuUnProduit;

  return (
    <Ecran titre="Mes produits" defilement>
      <Banniere message={banniere} type="succes" onFermer={() => setBanniere(null)} duree={6000} />
      {erreurPrise ? <Text style={styles.erreur}>{erreurPrise}</Text> : null}

      {aPrendreListe.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.titreSection}>À prendre</Text>
          {aPrendreListe.map((produit) => (
            <View key={produit.id} style={styles.blocPrendre}>
              <CarteProduit
                nom={produit.nom}
                prixCentimes={produit.intermediaire ? undefined : produit.prix_centimes}
                photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
              >
                <Text style={styles.badge}>Imposé par l'admin</Text>
                {!produit.fabricant_id ? <Text style={styles.badge}>Sans pâtissier</Text> : null}
              </CarteProduit>
              <Bouton
                titre="Je le fabrique"
                chargement={prendre.isPending}
                onPress={() => void fabriquer(produit.id, produit.nom)}
              />
            </View>
          ))}
        </View>
      ) : null}

      {premiereFois ? (
        <EtatVide message="Ajoutez les produits que vous fabriquez." />
      ) : (
        <Bouton titre="Ajouter un produit" onPress={() => ouvrir('nouveau')} />
      )}
      <Bouton
        titre="Voir les autres boutiques"
        variante="secondaire"
        onPress={() => router.push('/produits/autres-boutiques' as Href)}
      />
      {produits.length === 0 && !premiereFois ? (
        <EtatVide message="Vous n'avez aucun produit en cours. Ajoutez-en un pour le fabriquer." />
      ) : null}
      {produits.map((produit) => (
        <Pressable key={produit.id} accessibilityRole="button" onPress={() => ouvrir(produit.id)}>
          <CarteProduit
            nom={produit.nom}
            prixCentimes={produit.intermediaire ? undefined : produit.prix_centimes}
            photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
          >
            {produit.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
            {produit.impose_par_admin ? <Text style={styles.badge}>Imposé par l'admin</Text> : null}
          </CarteProduit>
        </Pressable>
      ))}
      {premiereFois ? <Bouton titre="Ajouter un produit" onPress={() => ouvrir('nouveau')} /> : null}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: espacements.s,
  },
  titreSection: {
    ...styleTitreSection,
  },
  blocPrendre: {
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
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
});
