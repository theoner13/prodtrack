import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useUrlsSignees } from '@/api/photos';
import { useProduits } from '@/api/produits';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { CarteProduit } from '@/components/carte-produit';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { FormulaireImposer } from '@/components/formulaire-imposer';
import { couleurs, espacements, tailles } from '@/theme';

export default function EcranProduits() {
  const boutiques = useBoutiques();
  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [imposer, setImposer] = useState(false);
  const choisi = boutiqueId ?? boutiques.data?.[0]?.id ?? null;
  const produits = useProduits(choisi);
  const chemins = useMemo(
    () =>
      (produits.data ?? [])
        .map((produit) => produit.photo_url)
        .filter((chemin): chemin is string => Boolean(chemin)),
    [produits.data],
  );
  const photos = useUrlsSignees(chemins);

  function reessayer() {
    void boutiques.refetch();
    void produits.refetch();
  }

  if (imposer && choisi) {
    return (
      <Ecran titre="Produits" defilement>
        <FormulaireImposer
          boutiqueInitialeId={choisi}
          onTermine={() => setImposer(false)}
          onAnnuler={() => setImposer(false)}
        />
      </Ecran>
    );
  }

  const chargement = boutiques.isLoading || (choisi !== null && produits.isLoading);

  return (
    <Ecran titre="Produits" defilement>
      {boutiques.data && boutiques.data.length > 0 ? (
        <>
          <Text style={styles.libelle}>Boutique</Text>
          {boutiques.data.map((boutique) => (
            <Bouton
              key={boutique.id}
              titre={boutique.nom}
              variante={(choisi ?? boutiques.data[0]?.id) === boutique.id ? 'principal' : 'secondaire'}
              onPress={() => setBoutiqueId(boutique.id)}
            />
          ))}
          <Bouton titre="Imposer un produit" onPress={() => setImposer(true)} />
        </>
      ) : null}
      {chargement ? <EtatChargement /> : null}
      {boutiques.isError || produits.isError ? (
        <EtatErreur
          message={messageErreur(boutiques.error ?? produits.error)}
          onReessayer={reessayer}
        />
      ) : null}
      {!chargement && boutiques.data?.length === 0 ? (
        <EtatVide message="Créez d’abord une boutique dans l’onglet Boutiques." />
      ) : null}
      {!chargement && choisi && produits.data?.length === 0 ? (
        <EtatVide message="Aucun produit dans cette boutique. Imposer un produit, ou demander au pâtissier d’ajouter les siens." />
      ) : null}
      {produits.data?.map((produit) => (
        <Pressable
          key={produit.id}
          onPress={() =>
            router.push({ pathname: '/produits/[id]', params: { id: produit.id } })
          }
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir le produit ${produit.nom}`}
        >
          <CarteProduit
            nom={produit.nom}
            prixCentimes={produit.intermediaire ? undefined : produit.prix_centimes}
            photoUrl={
              produit.photo_url ? (photos.data?.[produit.photo_url] ?? undefined) : undefined
            }
          >
            {produit.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
            {produit.impose_par_admin ? <Text style={styles.badge}>Imposé</Text> : null}
            {!produit.fabricant_id ? <Text style={styles.badge}>Sans pâtissier</Text> : null}
          </CarteProduit>
        </Pressable>
      ))}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  libelle: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
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
});
