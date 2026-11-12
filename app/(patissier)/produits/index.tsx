import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNomsBoutiquesEntreprise } from '@/api/boutiques';
import { useUrlsSignees } from '@/api/photos';
import {
  useMesProduits,
  usePrendreProduit,
  useProduitsAPrendre,
} from '@/api/produits';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Banniere } from '@/components/banniere';
import { CarteProduit } from '@/components/carte-produit';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { etiquetteLaboratoire } from '@/lib/laboratoire';
import { etiquetteBoutique } from '@/lib/production-exterieure';
import {
  couleurs,
  espacements,
  polices,
  rayonPilule,
  rayonPetit,
  styleTitreSection,
  tailles,
} from '@/theme';

export default function EcranMesProduits() {
  const { profil } = useAuth();
  const mes = useMesProduits(profil?.id ?? null);
  const aPrendre = useProduitsAPrendre(profil?.boutique_id ?? null);
  const nomsEntreprise = useNomsBoutiquesEntreprise();
  const prendre = usePrendreProduit();
  const [banniere, setBanniere] = useState<string | null>(null);
  const [erreurPrise, setErreurPrise] = useState<string | null>(null);

  const idsLaboratoires = useMemo(() => {
    const set = new Set<string>();
    for (const b of nomsEntreprise.data ?? []) {
      if (b.est_laboratoire) set.add(b.id);
    }
    return set;
  }, [nomsEntreprise.data]);

  const produits = mes.data?.produits ?? [];
  const locaux = useMemo(
    () => produits.filter((produit) => produit.provenance_boutique_id == null),
    [produits],
  );
  const auLabo = useMemo(
    () =>
      produits.filter(
        (produit) =>
          produit.provenance_boutique_id != null && idsLaboratoires.has(produit.boutique_id),
      ),
    [produits, idsLaboratoires],
  );
  const exterieurs = useMemo(
    () =>
      produits.filter(
        (produit) =>
          produit.provenance_boutique_id != null && !idsLaboratoires.has(produit.boutique_id),
      ),
    [produits, idsLaboratoires],
  );
  const chemins = [
    ...produits.map((produit) => produit.photo_url),
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

  const aPrendreListe = aPrendre.data ?? [];
  const premiereFois =
    produits.length === 0 && aPrendreListe.length === 0 && !mes.data?.dejaEuUnProduit;

  return (
    <Ecran defilement>
      <View style={styles.entete}>
        <Pressable
          onPress={() => router.push('/produits/nouveau?laboratoire=1' as Href)}
          style={styles.lien}
          accessibilityRole="button"
          accessibilityLabel="Nouveau produit au laboratoire"
        >
          <Text style={styles.lienTexte}>+ Produit au laboratoire</Text>
        </Pressable>
        <Pressable
          onPress={() => ouvrir('nouveau')}
          style={styles.lien}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un produit"
        >
          <Text style={styles.lienTexte}>+ Nouveau produit</Text>
        </Pressable>
      </View>

      <Banniere message={banniere} type="succes" onFermer={() => setBanniere(null)} duree={6000} />
      {erreurPrise ? <Text style={styles.erreur}>{erreurPrise}</Text> : null}

      {aPrendreListe.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.titreSection}>À prendre</Text>
          {aPrendreListe.map((produit) => (
            <CarteProduit
              key={produit.id}
              nom={produit.nom}
              prixCentimes={produit.intermediaire ? undefined : produit.prix_centimes}
              photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
              droite={
                <Pressable
                  onPress={() => void fabriquer(produit.id, produit.nom)}
                  disabled={prendre.isPending}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Je le fabrique"
                  style={({ pressed }) => [
                    styles.pastilleFabrique,
                    pressed && styles.pastilleAppuyee,
                    prendre.isPending && styles.pastilleInactive,
                  ]}
                >
                  <Text style={styles.pastilleFabriqueTexte}>Je le fabrique</Text>
                </Pressable>
              }
            >
              <Text style={styles.badge}>Imposé par l'admin</Text>
              {!produit.fabricant_id ? <Text style={styles.badge}>Sans pâtissier</Text> : null}
            </CarteProduit>
          ))}
          <Pressable
            onPress={() => router.push('/produits/autres-boutiques' as Href)}
            style={styles.lienGauche}
            accessibilityRole="button"
            accessibilityLabel="Voir les autres boutiques"
          >
            <Text style={styles.lienTexte}>Voir les autres boutiques</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => router.push('/produits/autres-boutiques' as Href)}
          style={styles.lienGauche}
          accessibilityRole="button"
          accessibilityLabel="Voir les autres boutiques"
        >
          <Text style={styles.lienTexte}>Voir les autres boutiques</Text>
        </Pressable>
      )}

      {premiereFois ? (
        <EtatVide message="Ajoutez les produits que vous fabriquez." />
      ) : null}
      {locaux.length === 0 && exterieurs.length === 0 && auLabo.length === 0 && !premiereFois ? (
        <EtatVide message="Vous n'avez aucun produit en cours. Ajoutez-en un pour le fabriquer." />
      ) : null}
      {locaux.map((produit) => (
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

      {auLabo.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.titreSection}>Au laboratoire</Text>
          {auLabo.map((produit) => (
            <Pressable
              key={produit.id}
              accessibilityRole="button"
              onPress={() => ouvrir(produit.id)}
            >
              <CarteProduit
                nom={produit.nom}
                prixCentimes={produit.prix_centimes}
                photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
              >
                <Text style={styles.badge}>{etiquetteLaboratoire()}</Text>
                <Text style={styles.badge}>{etiquetteBoutique(produit.boutiqueNom)}</Text>
              </CarteProduit>
            </Pressable>
          ))}
        </View>
      ) : null}

      {exterieurs.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.titreSection}>Envoyés à d'autres boutiques</Text>
          {exterieurs.map((produit) => (
            <Pressable
              key={produit.id}
              accessibilityRole="button"
              onPress={() => ouvrir(produit.id)}
            >
              <CarteProduit
                nom={produit.nom}
                prixCentimes={produit.prix_centimes}
                photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
              >
                <Text style={styles.badge}>
                  {etiquetteBoutique(produit.boutiqueNom)}
                </Text>
              </CarteProduit>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: espacements.m,
    marginBottom: espacements.s,
  },
  lien: {
    minHeight: 44,
    paddingVertical: espacements.s,
    paddingHorizontal: espacements.m,
    borderRadius: 999,
    backgroundColor: couleurs.fondPuce,
    justifyContent: 'center',
  },
  lienGauche: {
    alignSelf: 'flex-start',
    paddingVertical: espacements.xs,
    paddingHorizontal: espacements.s,
  },
  lienTexte: {
    fontSize: tailles.petit,
    fontWeight: '500',
    color: couleurs.principal,
    fontFamily: polices.sans,
  },
  section: {
    gap: espacements.s,
    marginTop: espacements.l,
  },
  titreSection: {
    ...styleTitreSection,
    marginBottom: espacements.xs,
  },
  pastilleFabrique: {
    height: 36,
    paddingHorizontal: espacements.m,
    borderRadius: rayonPilule,
    backgroundColor: couleurs.principal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pastilleAppuyee: {
    opacity: 0.75,
  },
  pastilleInactive: {
    opacity: 0.5,
  },
  pastilleFabriqueTexte: {
    fontSize: tailles.petit,
    fontWeight: '500',
    color: couleurs.texteSurPrincipal,
    fontFamily: polices.sans,
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
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
});
