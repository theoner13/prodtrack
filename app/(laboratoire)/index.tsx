import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useUrlsSignees } from '@/api/photos';
import { useProduits } from '@/api/produits';
import { useStock } from '@/api/stock';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { CarteProduit } from '@/components/carte-produit';
import { Champ } from '@/components/champ';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { etiquetteBoutique } from '@/lib/production-exterieure';
import { grouperParPatissierLabo } from '@/lib/laboratoire';
import { couleurs, espacements, styleTitreSection, tailles } from '@/theme';

function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function EcranStockLaboratoire() {
  const { profil } = useAuth();
  const boutiqueId = profil?.boutique_id ?? null;
  const produits = useProduits(boutiqueId);
  const stock = useStock(boutiqueId);
  const [recherche, setRecherche] = useState('');

  const stockParProduit = useMemo(() => {
    const map = new Map<string, number>();
    for (const ligne of stock.data ?? []) {
      if (ligne.produit_id) map.set(ligne.produit_id, ligne.stock ?? 0);
    }
    return map;
  }, [stock.data]);

  const liste = useMemo(() => {
    const tous = (produits.data ?? []).filter((produit) => produit.conservation === 'surgele');
    const terme = sansAccents(recherche.trim());
    if (!terme) return tous;
    return tous.filter(
      (produit) =>
        sansAccents(produit.nom).includes(terme) ||
        sansAccents(produit.fabricantNom).includes(terme),
    );
  }, [produits.data, recherche]);

  const groupes = useMemo(() => grouperParPatissierLabo(liste), [liste]);

  const chemins = liste
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

  const total = produits.data?.length ?? 0;

  return (
    <Ecran
      defilement
      enRafraichissement={produits.isRefetching || stock.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      {total > 10 ? (
        <Champ
          libelle="Rechercher un produit ou un pâtissier"
          value={recherche}
          onChangeText={setRecherche}
          autoCorrect={false}
          autoCapitalize="none"
        />
      ) : null}

      {total === 0 ? (
        <EtatVide message="Aucun produit au laboratoire pour l’instant." />
      ) : null}

      {groupes.map((groupe) => (
        <View key={groupe.fabricantId} style={styles.section}>
          <Text style={styles.titreSection}>{groupe.fabricantNom}</Text>
          {groupe.produits.map((produit) => {
            const valeur = stockParProduit.get(produit.id) ?? 0;
            return (
              <CarteProduit
                key={produit.id}
                nom={produit.nom}
                photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
                sousTitre={
                  produit.provenanceBoutiqueNom
                    ? etiquetteBoutique(produit.provenanceBoutiqueNom)
                    : undefined
                }
                droite={
                  <Text
                    accessibilityLabel={`Stock ${produit.nom} : ${valeur}`}
                    style={styles.chiffre}
                  >
                    {valeur}
                  </Text>
                }
              />
            );
          })}
        </View>
      ))}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: espacements.s,
    marginBottom: espacements.m,
  },
  titreSection: {
    ...styleTitreSection,
  },
  chiffre: {
    fontSize: tailles.titre,
    fontWeight: '700',
    color: couleurs.texte,
    minWidth: 48,
    textAlign: 'right',
  },
});
