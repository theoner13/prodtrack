import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useUrlsSignees } from '@/api/photos';
import { useProduits } from '@/api/produits';
import { messageErreur } from '@/auth/erreurs';
import { CarteProduit } from '@/components/carte-produit';
import { ChoixSegmente } from '@/components/choix-segmente';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { FormulaireImposer } from '@/components/formulaire-imposer';
import { etiquetteProvenanceAdmin } from '@/lib/production-exterieure';
import { couleurs, espacements, polices, styleTitreEcran, styleTitreSection, tailles } from '@/theme';

type FiltreProduits = 'vente' | 'intermediaire';

const OPTIONS_FILTRE: { valeur: FiltreProduits; libelle: string }[] = [
  { valeur: 'vente', libelle: 'Produits en vente' },
  { valeur: 'intermediaire', libelle: 'Intermédiaires' },
];

export default function EcranProduits() {
  const boutiques = useBoutiques();
  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<FiltreProduits>('vente');
  const [imposer, setImposer] = useState(false);
  const choisi = boutiqueId ?? boutiques.data?.[0]?.id ?? null;
  const produits = useProduits(choisi);
  const produitsFiltres = useMemo(() => {
    const liste = produits.data ?? [];
    if (filtre === 'intermediaire') {
      return liste.filter((produit) => produit.intermediaire);
    }
    return liste.filter((produit) => !produit.intermediaire);
  }, [produits.data, filtre]);
  const chemins = useMemo(
    () =>
      produitsFiltres
        .map((produit) => produit.photo_url)
        .filter((chemin): chemin is string => Boolean(chemin)),
    [produitsFiltres],
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
  const messageVide =
    filtre === 'intermediaire'
      ? 'Aucun produit intermédiaire dans cette boutique.'
      : 'Aucun produit en vente dans cette boutique.';

  return (
    <Ecran defilement>
      <View style={styles.entete}>
        <Text style={styles.titre}>Produits</Text>
        {boutiques.data && boutiques.data.length > 0 ? (
          <Pressable
            onPress={() => setImposer(true)}
            style={styles.boutonImposer}
            accessibilityRole="button"
            accessibilityLabel="Imposer un produit"
          >
            <Ionicons name="add" size={18} color={couleurs.principal} />
            <Text style={styles.boutonImposerTexte}>Imposer un produit</Text>
          </Pressable>
        ) : null}
      </View>

      {boutiques.data && boutiques.data.length > 0 ? (
        <>
          <Text style={styles.section}>Boutique</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.puces}
          >
            {boutiques.data.map((boutique) => {
              const active = choisi === boutique.id;
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
          </ScrollView>

          <ChoixSegmente
            options={OPTIONS_FILTRE}
            valeur={filtre}
            onChange={setFiltre}
          />
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
      {!chargement && choisi && !produits.isError && produitsFiltres.length === 0 ? (
        <EtatVide message={messageVide} />
      ) : null}
      {produitsFiltres.map((produit) => (
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
            {produit.impose_par_admin ? <Text style={styles.badge}>Imposé</Text> : null}
            {!produit.fabricant_id ? <Text style={styles.badge}>Sans pâtissier</Text> : null}
            {produit.provenanceBoutiqueNom ? (
              <Text style={styles.badge}>
                {etiquetteProvenanceAdmin(produit.provenanceBoutiqueNom)}
              </Text>
            ) : null}
          </CarteProduit>
        </Pressable>
      ))}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacements.s,
    marginBottom: espacements.xs,
  },
  titre: {
    ...styleTitreEcran,
    fontFamily: polices.sans,
  },
  boutonImposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingVertical: espacements.xs,
  },
  boutonImposerTexte: {
    fontSize: tailles.petit,
    fontWeight: '500',
    color: couleurs.principal,
    fontFamily: polices.sans,
  },
  section: {
    ...styleTitreSection,
  },
  puces: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
  },
  puce: {
    height: 32,
    paddingHorizontal: espacements.m,
    borderRadius: 16,
    backgroundColor: couleurs.fondPuce,
    justifyContent: 'center',
  },
  puceActive: {
    backgroundColor: couleurs.principal,
  },
  puceTexte: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontWeight: '500',
  },
  puceTexteActive: {
    color: couleurs.texteSurPrincipal,
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
