import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useUrlsSignees } from '@/api/photos';
import { useMesPrevisions, type PrevisionProduit } from '@/api/previsions';
import { useMesProduits } from '@/api/produits';
import { useStock } from '@/api/stock';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { CarteProduit } from '@/components/carte-produit';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { aujourdhuiParis } from '@/lib/format';
import { couleurs, espacements, styleTitreSection, tailles } from '@/theme';

const LARGEUR_TABLETTE = 700;

function ajouterJours(jour: string, nombre: number): string {
  const date = new Date(`${jour}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + nombre);
  return date.toISOString().slice(0, 10);
}

function nomJour(jour: string, capitale: boolean): string {
  const date = new Date(`${jour}T12:00:00Z`);
  const nom = date.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const jj = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const libelle = `${nom} ${jj}/${mm}`;
  return capitale ? libelle.charAt(0).toUpperCase() + libelle.slice(1) : libelle;
}

function formatMoment(iso: string): string {
  const date = new Date(iso);
  const jour = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hh = (parts.find((part) => part.type === 'hour')?.value ?? '00').padStart(2, '0');
  const mm = (parts.find((part) => part.type === 'minute')?.value ?? '00').padStart(2, '0');
  return `${jour} à ${hh}:${mm}`;
}

function phraseFabrication(jour: string, quantite: number | null, aujourdhui: string): string {
  const quand = jour === aujourdhui ? "Aujourd'hui" : `Au plus tard ${nomJour(jour, false)}`;
  if (quantite === null) return quand;
  return `${quand} — environ ${quantite} unités`;
}

function DetailPrevision({ ligne }: { ligne: PrevisionProduit }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.texte}>Stock actuel : {ligne.stockActuel ?? 0}</Text>
      <Text style={styles.repere}>Seuil : {ligne.seuilMin}</Text>
      <View style={styles.ligneTableau}>
        <Text style={[styles.entete, styles.colJour]}>Jour</Text>
        <Text style={[styles.entete, styles.colNombre]}>Sorties prévues</Text>
        <Text style={[styles.entete, styles.colNombre]}>Stock prévu en fin de journée</Text>
      </View>
      {ligne.detail.map((jour) => {
        const sousSeuil = jour.stockFin < ligne.seuilMin;
        return (
          <View key={jour.jour} style={styles.ligneTableau}>
            <Text style={[styles.cellule, styles.colJour, sousSeuil && styles.orange]}>
              {nomJour(jour.jour, true)}
            </Text>
            <Text style={[styles.cellule, styles.colNombre, sousSeuil && styles.orange]}>
              {Math.round(jour.prevu)}
            </Text>
            <Text style={[styles.cellule, styles.colNombre, sousSeuil && styles.orange]}>
              {Math.round(jour.stockFin)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function EcranPlanning() {
  const { profil } = useAuth();
  const { width } = useWindowDimensions();
  const tablette = width >= LARGEUR_TABLETTE;
  const boutiqueId = profil?.boutique_id ?? null;
  const mes = useMesProduits(profil?.id ?? null);
  const previsions = useMesPrevisions(profil?.id ?? null);
  const stock = useStock(boutiqueId);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const chemins = [
    ...(previsions.data ?? []).map((ligne) => ligne.photoUrl),
    ...(mes.data?.produits ?? []).map((produit) => produit.photo_url),
  ].filter((chemin): chemin is string => Boolean(chemin));
  const photos = useUrlsSignees(chemins);

  async function rafraichir() {
    await Promise.all([mes.refetch(), previsions.refetch(), stock.refetch()]);
  }

  function basculer(id: string) {
    setOuvert((actuel) => (actuel === id ? null : id));
  }

  if (mes.isLoading || previsions.isLoading || stock.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (mes.isError || previsions.isError || stock.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(mes.error ?? previsions.error ?? stock.error)}
          onReessayer={() => void rafraichir()}
        />
      </Ecran>
    );
  }

  const produits = mes.data?.produits ?? [];
  if (produits.length === 0) {
      return (
      <Ecran
        titre="Planning"
        defilement
        enRafraichissement={mes.isRefetching || previsions.isRefetching || stock.isRefetching}
        onRafraichir={() => void rafraichir()}
      >
        <EtatVide message="Vous n'avez aucun produit. Ajoutez-en dans Mes produits." />
        <Bouton titre="Mes produits" onPress={() => router.push('/(patissier)/produits' as Href)} />
      </Ecran>
    );
  }

  const stockParProduit = new Map(
    (stock.data ?? [])
      .filter((ligne) => ligne.produit_id)
      .map((ligne) => [
        ligne.produit_id as string,
        { stock: ligne.stock ?? 0, seuil: ligne.seuil_min ?? 0 },
      ]),
  );
  const sousSeuil = produits
    .map((produit) => {
      const info = stockParProduit.get(produit.id);
      const valeur = info?.stock ?? 0;
      const seuil = info?.seuil ?? produit.seuil_min;
      return { produit, stock: valeur, seuil, ecart: seuil - valeur };
    })
    .filter((ligne) => ligne.stock < ligne.seuil)
    .sort((a, b) => b.ecart - a.ecart || a.produit.nom.localeCompare(b.produit.nom, 'fr'));

  const lignes = previsions.data ?? [];
  const calculees = lignes.filter((ligne) => ligne.calculeLe);
  const aujourdhui = aujourdhuiParis();
  const fin = ajouterJours(aujourdhui, 6);
  const jours = Array.from({ length: 7 }, (_, index) => ajouterJours(aujourdhui, index));
  const semaine = calculees
    .filter((ligne) => ligne.jourFabrication !== null && ligne.jourFabrication >= aujourdhui && ligne.jourFabrication <= fin)
    .sort((a, b) => a.jourFabrication!.localeCompare(b.jourFabrication!) || a.nom.localeCompare(b.nom, 'fr'));
  const dernier = calculees.reduce(
    (max, ligne) => (ligne.calculeLe && ligne.calculeLe > max ? ligne.calculeLe : max),
    '',
  );

  return (
    <Ecran
      titre="Planning"
      defilement
      enRafraichissement={mes.isRefetching || previsions.isRefetching || stock.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      {sousSeuil.length > 0 ? (
        <>
          <Text style={styles.section}>Sous le seuil maintenant</Text>
          {sousSeuil.map((ligne) => (
            <CarteProduit
              key={ligne.produit.id}
              nom={ligne.produit.nom}
              photoUrl={ligne.produit.photo_url ? photos.data?.[ligne.produit.photo_url] : null}
              alerte
              sousTitre={`Stock ${ligne.stock} · seuil ${ligne.seuil} — à fabriquer dès que possible`}
              onPressNom={() => router.push(`/produits/${ligne.produit.id}` as Href)}
            >
              {ligne.produit.intermediaire ? (
                <Text style={styles.badge}>Intermédiaire</Text>
              ) : null}
            </CarteProduit>
          ))}
        </>
      ) : null}

      {calculees.length === 0 ? (
        <Text style={styles.texte}>Les prévisions sont calculées chaque nuit. Revenez demain.</Text>
      ) : (
        <>
          <Text style={styles.section}>À fabriquer cette semaine</Text>
          {semaine.length === 0 ? (
            <Text style={styles.texte}>Rien à fabriquer dans les 7 prochains jours.</Text>
          ) : (
            semaine.map((ligne) => {
              const estAujourdhui = ligne.jourFabrication === aujourdhui;
              const deplie = ouvert === ligne.produitId;
              return (
                <Pressable
                  key={ligne.produitId}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: deplie }}
                  onPress={() => basculer(ligne.produitId)}
                >
                  <CarteProduit
                    nom={ligne.nom}
                    photoUrl={ligne.photoUrl ? photos.data?.[ligne.photoUrl] : null}
                    alerte={estAujourdhui}
                    onPressNom={() => router.push(`/produits/${ligne.produitId}` as Href)}
                    sousLigne={
                      <View style={styles.sous}>
                        <Text style={[styles.phrase, estAujourdhui && styles.rouge]}>
                          {phraseFabrication(ligne.jourFabrication ?? aujourdhui, ligne.quantiteSuggeree, aujourdhui)}
                        </Text>
                        {ligne.fiable === false ? (
                          <Text style={styles.bandeau}>
                            Prévision indicative : moins de 8 semaines de données.
                          </Text>
                        ) : null}
                        {deplie ? <DetailPrevision ligne={ligne} /> : null}
                      </View>
                    }
                  >
                    {ligne.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
                  </CarteProduit>
                </Pressable>
              );
            })
          )}

          <Text style={styles.section}>Vue de la semaine</Text>
          <View style={tablette ? styles.colonnes : styles.jours}>
            {jours.map((jour) => {
              const duJour = semaine.filter((ligne) => ligne.jourFabrication === jour);
              return (
                <View key={jour} style={[styles.jour, tablette && styles.jourColonne]}>
                  <Text style={styles.titreJour}>{nomJour(jour, true)}</Text>
                  {duJour.length === 0 ? (
                    <Text style={styles.vide}>—</Text>
                  ) : (
                    duJour.map((ligne) => (
                      <Pressable
                        key={ligne.produitId}
                        accessibilityRole="button"
                        onPress={() => basculer(ligne.produitId)}
                      >
                        <Text style={[styles.produitJour, ouvert === ligne.produitId && styles.produitOuvert]}>
                          {ligne.nom}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              );
            })}
          </View>

          {dernier ? <Text style={styles.calcul}>Dernier calcul : {formatMoment(dernier)}</Text> : null}
        </>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  section: {
    ...styleTitreSection,
    marginTop: espacements.m,
  },
  texte: {
    fontSize: tailles.normal,
    color: couleurs.texte,
  },
  phrase: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
  },
  rouge: {
    color: couleurs.erreur,
  },
  sous: {
    alignSelf: 'stretch',
    gap: espacements.s,
  },
  bandeau: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.alerte,
    backgroundColor: couleurs.alerteClair,
    borderRadius: 8,
    padding: espacements.s,
  },
  detail: {
    gap: espacements.xs,
    alignSelf: 'stretch',
  },
  repere: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
  },
  ligneTableau: {
    flexDirection: 'row',
    gap: espacements.s,
    alignSelf: 'stretch',
  },
  colJour: {
    flex: 1.3,
  },
  colNombre: {
    flex: 1,
    textAlign: 'right',
  },
  entete: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  cellule: {
    fontSize: tailles.petit,
    color: couleurs.texte,
  },
  orange: {
    color: couleurs.alerte,
    fontWeight: '600',
  },
  colonnes: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: espacements.s,
  },
  jours: {
    gap: 0,
  },
  jour: {
    gap: espacements.xs,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
  },
  jourColonne: {
    flex: 1,
    minWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: espacements.xs,
  },
  titreJour: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
  },
  vide: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
  },
  produitJour: {
    fontSize: tailles.petit,
    color: couleurs.principalFonce,
    fontWeight: '600',
  },
  produitOuvert: {
    backgroundColor: couleurs.fondPuce,
    borderRadius: 8,
    overflow: 'hidden',
  },
  calcul: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginTop: espacements.s,
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
