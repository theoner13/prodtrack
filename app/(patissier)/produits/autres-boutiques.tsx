import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCatalogueBoutiques, useCatalogueProduits } from '@/api/catalogue';
import { useUrlsSignees } from '@/api/photos';
import { useProduits } from '@/api/produits';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { CarteProduit } from '@/components/carte-produit';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { formatEuros } from '@/lib/format';
import { couleurs, espacements, rayon, tailles } from '@/theme';

function nomNormalise(nom: string): string {
  return nom.trim().toLowerCase();
}

export default function EcranAutresBoutiques() {
  const { profil } = useAuth();
  const boutiques = useCatalogueBoutiques();
  const produitsBoutique = useProduits(profil?.boutique_id ?? null);
  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);

  useEffect(() => {
    if (!boutiques.data || boutiques.data.length === 0) return;
    if (boutiqueId && boutiques.data.some((b) => b.id === boutiqueId)) return;
    setBoutiqueId(boutiques.data[0].id);
  }, [boutiques.data, boutiqueId]);

  const produits = useCatalogueProduits(boutiqueId);
  const chemins = (produits.data ?? [])
    .map((produit) => produit.photo_url)
    .filter((chemin): chemin is string => Boolean(chemin));
  const photos = useUrlsSignees(chemins);

  const nomsChezMoi = new Set(
    (produitsBoutique.data ?? []).map((produit) => nomNormalise(produit.nom)),
  );

  async function rafraichir() {
    await Promise.all([
      boutiques.refetch(),
      produits.refetch(),
      produitsBoutique.refetch(),
    ]);
  }

  if (boutiques.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (boutiques.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(boutiques.error)}
          onReessayer={() => void boutiques.refetch()}
        />
      </Ecran>
    );
  }

  const listeBoutiques = boutiques.data ?? [];
  if (listeBoutiques.length === 0) {
    return (
      <Ecran titre="Autres boutiques" defilement>
        <EtatVide message="Votre entreprise n'a pas d'autre boutique." />
      </Ecran>
    );
  }

  const boutiqueChoisie = listeBoutiques.find((b) => b.id === boutiqueId) ?? listeBoutiques[0];

  return (
    <Ecran
      titre="Autres boutiques"
      defilement
      enRafraichissement={boutiques.isRefetching || produits.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      <View style={styles.puces}>
        {listeBoutiques.map((boutique) => {
          const active = boutique.id === boutiqueChoisie.id;
          return (
            <Pressable
              key={boutique.id}
              onPress={() => setBoutiqueId(boutique.id)}
              style={[styles.puce, active && styles.puceActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.puceTexte, active && styles.puceTexteActive]}>
                {boutique.nom}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {produits.isLoading ? <EtatChargement /> : null}
      {produits.isError ? (
        <EtatErreur
          message={messageErreur(produits.error)}
          onReessayer={() => void produits.refetch()}
        />
      ) : null}
      {!produits.isLoading && !produits.isError && (produits.data ?? []).length === 0 ? (
        <EtatVide message="Aucun produit dans cette boutique pour l'instant." />
      ) : null}
      {(produits.data ?? []).map((produit) => (
        <Pressable
          key={produit.id}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/produits/catalogue/[id]',
              params: {
                id: produit.id,
                boutique: boutiqueChoisie.nom,
                boutiqueId: boutiqueChoisie.id,
              },
            } as Href)
          }
        >
          <CarteProduit
            nom={produit.nom}
            photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
            sousTitre={
              produit.intermediaire
                ? undefined
                : `Prix pratiqué : ${formatEuros(produit.prix_centimes)}`
            }
          >
            {produit.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
            {nomsChezMoi.has(nomNormalise(produit.nom)) ? (
              <Text style={styles.badge}>Déjà dans ma boutique</Text>
            ) : null}
          </CarteProduit>
        </Pressable>
      ))}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  puce: {
    minHeight: 44,
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.s,
    borderRadius: rayon,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.surface,
    justifyContent: 'center',
  },
  puceActive: {
    borderColor: couleurs.principal,
    backgroundColor: couleurs.principalClair,
  },
  puceTexte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontWeight: '600',
  },
  puceTexteActive: {
    color: couleurs.principalFonce,
  },
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
