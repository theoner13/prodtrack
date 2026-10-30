import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useUrlsSignees } from '@/api/photos';
import { useProduits } from '@/api/produits';
import { useStock } from '@/api/stock';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { CarteProduit } from '@/components/carte-produit';
import { Champ } from '@/components/champ';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { couleurs, espacements, tailles } from '@/theme';

function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function EcranStock() {
  const { profil } = useAuth();
  const boutiqueId = profil?.boutique_id ?? null;
  const userId = profil?.id ?? null;
  const produits = useProduits(boutiqueId);
  const stock = useStock(boutiqueId);
  const [recherche, setRecherche] = useState('');

  const stockParProduit = useMemo(() => {
    const map = new Map<string, { stock: number; seuil: number }>();
    for (const ligne of stock.data ?? []) {
      if (ligne.produit_id) {
        map.set(ligne.produit_id, {
          stock: ligne.stock ?? 0,
          seuil: ligne.seuil_min ?? 0,
        });
      }
    }
    return map;
  }, [stock.data]);

  // Uniquement les produits dont le pâtissier connecté est le fabricant.
  const mesProduits = useMemo(
    () => (produits.data ?? []).filter((produit) => produit.fabricant_id === userId),
    [produits.data, userId],
  );

  const liste = useMemo(() => {
    const terme = sansAccents(recherche.trim());
    if (!terme) return mesProduits;
    return mesProduits.filter((produit) => sansAccents(produit.nom).includes(terme));
  }, [mesProduits, recherche]);

  const chemins = mesProduits
    .map((produit) => produit.photo_url)
    .filter((chemin): chemin is string => Boolean(chemin));
  const photos = useUrlsSignees(chemins);

  async function rafraichir() {
    await Promise.all([produits.refetch(), stock.refetch()]);
  }

  if (produits.isLoading || stock.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (produits.isError || stock.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(produits.error ?? stock.error)}
          onReessayer={() => void rafraichir()}
        />
      </Ecran>
    );
  }

  return (
    <Ecran
      titre="Stock"
      defilement
      enRafraichissement={produits.isRefetching || stock.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      {mesProduits.length > 10 ? (
        <Champ
          libelle="Rechercher un produit"
          value={recherche}
          onChangeText={setRecherche}
          autoCorrect={false}
          autoCapitalize="none"
        />
      ) : null}

      {mesProduits.length === 0 ? (
        <EtatVide message="Vous n’avez encore aucun produit." />
      ) : null}

      {liste.map((produit) => {
        const info = stockParProduit.get(produit.id);
        const valeur = info?.stock ?? 0;
        const seuil = info?.seuil ?? produit.seuil_min;
        // Alerte « sous le seuil » réservée aux surgelés (les frais n’ont pas de seuil métier).
        const sousSeuil = produit.conservation === 'surgele' && valeur < seuil;
        const sousTitre = sousSeuil ? `Sous le seuil (min. ${seuil})` : undefined;

        return (
          <Pressable
            key={produit.id}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir la fiche de ${produit.nom}`}
            onPress={() => router.push(`/produits/${produit.id}` as Href)}
          >
            <CarteProduit
              nom={produit.nom}
              photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
              sousTitre={sousTitre}
              alerte={sousSeuil}
            >
              {produit.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
              <Text
                accessibilityLabel={`Stock ${produit.nom} : ${valeur}`}
                style={styles.chiffre}
              >
                {valeur}
              </Text>
            </CarteProduit>
          </Pressable>
        );
      })}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  chiffre: {
    fontSize: tailles.titre,
    fontWeight: '700',
    color: couleurs.texte,
    minWidth: 48,
    textAlign: 'right',
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
