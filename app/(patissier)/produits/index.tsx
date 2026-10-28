import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useUrlsSignees } from '@/api/photos';
import { useMesProduits } from '@/api/produits';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { CarteProduit } from '@/components/carte-produit';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { couleurs, espacements, rayon, tailles } from '@/theme';

export default function EcranMesProduits() {
  const { profil } = useAuth();
  const mes = useMesProduits(profil?.id ?? null);
  const chemins = (mes.data?.produits ?? [])
    .map((produit) => produit.photo_url)
    .filter((chemin): chemin is string => Boolean(chemin));
  const photos = useUrlsSignees(chemins);

  function ouvrir(id: string) {
    router.push(`/produits/${id}` as Href);
  }

  if (mes.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (mes.isError) {
    return (
      <Ecran>
        <EtatErreur message={messageErreur(mes.error)} onReessayer={() => void mes.refetch()} />
      </Ecran>
    );
  }

  const produits = mes.data?.produits ?? [];
  const premiereFois = produits.length === 0 && !mes.data?.dejaEuUnProduit;

  return (
    <Ecran titre="Mes produits" defilement>
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
            {produit.impose_par_admin ? <Text style={styles.badge}>Imposé par le patron</Text> : null}
          </CarteProduit>
        </Pressable>
      ))}
      {premiereFois ? <Bouton titre="Ajouter un produit" onPress={() => ouvrir('nouveau')} /> : null}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  badge: {
    overflow: 'hidden',
    backgroundColor: couleurs.principalClair,
    color: couleurs.principalFonce,
    fontSize: tailles.petit,
    fontWeight: '700',
    paddingHorizontal: espacements.s,
    paddingVertical: espacements.xs,
    borderRadius: rayon,
  },
});
