import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNomsBoutiquesEntreprise } from '@/api/boutiques';
import { useCommandesLaboFabricant } from '@/api/commandes-labo';
import { useUrlsSignees } from '@/api/photos';
import { useMesPrevisions } from '@/api/previsions';
import { useMesProduits } from '@/api/produits';
import { useStockFabricant } from '@/api/stock';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { CarteHeros } from '@/components/carte-heros';
import { CarteProduit } from '@/components/carte-produit';
import { Champ } from '@/components/champ';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import {
  etiquetteLaboratoire,
  libelleJourCommandeLabo,
  libelleStatutCommandeLabo,
  statutCommandeLabo,
} from '@/lib/laboratoire';
import { aujourdhuiParis } from '@/lib/format';
import { etiquetteBoutique } from '@/lib/production-exterieure';
import {
  couleurs,
  espacements,
  polices,
  rayonCarte,
  rayonPetit,
  styleChiffre,
  styleTitreSection,
  tailles,
} from '@/theme';

function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function EcranStock() {
  const { profil } = useAuth();
  const userId = profil?.id ?? null;
  const mes = useMesProduits(userId);
  const stock = useStockFabricant(userId);
  const previsions = useMesPrevisions(userId);
  const commandesLabo = useCommandesLaboFabricant(userId);
  const nomsEntreprise = useNomsBoutiquesEntreprise();
  const [recherche, setRecherche] = useState('');
  const aujourdhui = aujourdhuiParis();

  const idsLaboratoires = useMemo(() => {
    const set = new Set<string>();
    for (const b of nomsEntreprise.data ?? []) {
      if (b.est_laboratoire) set.add(b.id);
    }
    return set;
  }, [nomsEntreprise.data]);

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

  // Surgelés dont je suis le fabricant (locaux + extérieurs + labo).
  const mesProduits = useMemo(
    () =>
      (mes.data?.produits ?? []).filter((produit) => produit.conservation === 'surgele'),
    [mes.data?.produits],
  );

  const locauxEtExterieurs = useMemo(
    () => mesProduits.filter((produit) => !idsLaboratoires.has(produit.boutique_id)),
    [mesProduits, idsLaboratoires],
  );

  const auLabo = useMemo(
    () => mesProduits.filter((produit) => idsLaboratoires.has(produit.boutique_id)),
    [mesProduits, idsLaboratoires],
  );

  const liste = useMemo(() => {
    const terme = sansAccents(recherche.trim());
    if (!terme) return locauxEtExterieurs;
    return locauxEtExterieurs.filter((produit) => sansAccents(produit.nom).includes(terme));
  }, [locauxEtExterieurs, recherche]);

  const chemins = mesProduits
    .map((produit) => produit.photo_url)
    .filter((chemin): chemin is string => Boolean(chemin));
  const photos = useUrlsSignees(chemins);

  const commandesParProduit = useMemo(() => {
    const map = new Map<string, NonNullable<typeof commandesLabo.data>>();
    for (const commande of commandesLabo.data ?? []) {
      const liste = map.get(commande.produit_id) ?? [];
      liste.push(commande);
      map.set(commande.produit_id, liste);
    }
    return map;
  }, [commandesLabo.data]);

  const previsionParProduit = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const ligne of previsions.data ?? []) {
      map.set(ligne.produitId, ligne.jourFabrication);
    }
    return map;
  }, [previsions.data]);

  async function rafraichir() {
    await Promise.all([
      mes.refetch(),
      stock.refetch(),
      nomsEntreprise.refetch(),
      previsions.refetch(),
      commandesLabo.refetch(),
    ]);
  }

  if (mes.isLoading || stock.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (mes.isError || stock.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(mes.error ?? stock.error)}
          onReessayer={() => void rafraichir()}
        />
      </Ecran>
    );
  }

  const nbSousSeuil = locauxEtExterieurs.filter((produit) => {
    const info = stockParProduit.get(produit.id);
    const valeur = info?.stock ?? 0;
    const seuil = info?.seuil ?? produit.seuil_min;
    return valeur < seuil;
  }).length;

  return (
    <Ecran
      defilement
      enRafraichissement={mes.isRefetching || stock.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      {mesProduits.length > 0 ? (
        <CarteHeros libelle="Produits surgelés" chiffre={locauxEtExterieurs.length}>
          {nbSousSeuil > 0 ? (
            <View style={styles.pastilleSeuil}>
              <Text style={styles.pastilleSeuilTexte}>{`${nbSousSeuil} sous le seuil`}</Text>
            </View>
          ) : null}
        </CarteHeros>
      ) : null}

      {locauxEtExterieurs.length > 10 ? (
        <Champ
          libelle="Rechercher un produit"
          value={recherche}
          onChangeText={setRecherche}
          autoCorrect={false}
          autoCapitalize="none"
        />
      ) : null}

      {mesProduits.length === 0 ? (
        <EtatVide message="Vous n’avez aucun produit surgelé. Les produits frais se suivent dans Production › Frais du jour." />
      ) : null}

      {liste.map((produit) => {
        const info = stockParProduit.get(produit.id);
        const valeur = info?.stock ?? 0;
        const seuil = info?.seuil ?? produit.seuil_min;
        const sousSeuil = valeur < seuil;
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
              droite={
                <Text
                  accessibilityLabel={`Stock ${produit.nom} : ${valeur}`}
                  style={[styles.chiffre, sousSeuil && styles.chiffreAlerte]}
                >
                  {valeur}
                </Text>
              }
            >
              {produit.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
              {produit.provenance_boutique_id ? (
                <Text style={styles.badge}>{etiquetteBoutique(produit.boutiqueNom)}</Text>
              ) : null}
            </CarteProduit>
          </Pressable>
        );
      })}

      {auLabo.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.titreSection}>Au laboratoire</Text>
          {auLabo.map((produit) => {
            const info = stockParProduit.get(produit.id);
            const valeur = info?.stock ?? 0;
            const commandesProduit = commandesParProduit.get(produit.id) ?? [];
            const jourFab = previsionParProduit.get(produit.id) ?? null;
            return (
              <View key={produit.id} style={styles.blocLabo}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir la fiche de ${produit.nom}`}
                  onPress={() => router.push(`/produits/${produit.id}` as Href)}
                >
                  <CarteProduit
                    nom={produit.nom}
                    photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
                    sousTitre={etiquetteBoutique(produit.boutiqueNom)}
                    droite={
                      <Text
                        accessibilityLabel={`Stock labo ${produit.nom} : ${valeur}`}
                        style={styles.chiffre}
                      >
                        {valeur}
                      </Text>
                    }
                  >
                    <Text style={styles.badge}>{etiquetteLaboratoire()}</Text>
                  </CarteProduit>
                </Pressable>
                {commandesProduit.length > 0 || jourFab ? (
                  <View style={styles.detailsLabo}>
                    {commandesProduit.map((commande) => {
                      const statut = statutCommandeLabo(commande);
                      return (
                        <Text key={commande.id} style={styles.detailLabo}>
                          {libelleJourCommandeLabo(commande.pour_le, aujourdhui)} ·{' '}
                          {commande.quantite}
                          {commande.client ? ` · ${commande.client}` : ''}
                          {' · '}
                          {libelleStatutCommandeLabo(statut)}
                        </Text>
                      );
                    })}
                    {jourFab ? (
                      <Text style={styles.detailLabo}>
                        Prochaine fabrication : {libelleJourCommandeLabo(jourFab, aujourdhui)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: espacements.s,
    marginTop: espacements.xl,
  },
  titreSection: {
    ...styleTitreSection,
    marginBottom: espacements.xs,
  },
  pastilleSeuil: {
    alignSelf: 'flex-start',
    marginTop: espacements.xs,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: couleurs.accentClair,
  },
  pastilleSeuilTexte: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.accentFonce,
    fontFamily: polices.sans,
  },
  blocLabo: {
    gap: espacements.s,
  },
  detailsLabo: {
    gap: espacements.xs,
    marginHorizontal: espacements.xs,
    paddingVertical: espacements.s,
    paddingHorizontal: espacements.m,
    borderRadius: rayonCarte,
    backgroundColor: couleurs.fondGroupe,
  },
  detailLabo: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  chiffre: {
    ...styleChiffre,
    fontSize: tailles.ca,
    letterSpacing: -1,
    minWidth: 48,
    textAlign: 'right',
  },
  chiffreAlerte: {
    color: couleurs.erreur,
  },
  badge: {
    overflow: 'hidden',
    backgroundColor: couleurs.principalClair,
    color: couleurs.principalFonce,
    fontSize: tailles.legend,
    fontWeight: '600',
    paddingHorizontal: espacements.s,
    paddingVertical: 2,
    borderRadius: rayonPetit,
    fontFamily: polices.sans,
  },
});
