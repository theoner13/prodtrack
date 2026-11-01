import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMesPrevisions, type PrevisionProduit } from '@/api/previsions';
import { useMesProduits } from '@/api/produits';
import { useStockFabricant } from '@/api/stock';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { aujourdhuiParis } from '@/lib/format';
import {
  construirePlanning,
  libelleAccessibiliteLigne,
  type LignePlanning,
} from '@/lib/planning';
import { etiquetteBoutique } from '@/lib/production-exterieure';
import {
  couleurs,
  espacements,
  ombres,
  polices,
  tailles,
} from '@/theme';

const BORDURE_AUJOURDHUI = '#E6D8C6';

function nomJour(jour: string, capitale: boolean): string {
  const date = new Date(`${jour}T12:00:00Z`);
  const nom = date.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const jj = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const libelle = `${nom} ${jj}/${mm}`;
  return capitale ? libelle.charAt(0).toUpperCase() + libelle.slice(1) : libelle;
}

function initialeJour(jour: string): string {
  const date = new Date(`${jour}T12:00:00Z`);
  const nom = date.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const court = nom.replace(/\./g, '').trim();
  return court.charAt(0).toUpperCase() + court.slice(1);
}

function numeroJour(jour: string): string {
  return String(new Date(`${jour}T12:00:00Z`).getUTCDate());
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

function DetailPrevision({ ligne }: { ligne: PrevisionProduit }) {
  return (
    <View style={styles.detail}>
      <View style={styles.ligneTableau}>
        <Text style={[styles.entete, styles.colJour]}>Jour</Text>
        <Text style={[styles.entete, styles.colNombre]}>Sorties prévues</Text>
        <Text style={[styles.entete, styles.colNombre]}>Stock prévu</Text>
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
      <Text style={styles.repere}>Seuil : {ligne.seuilMin}</Text>
    </View>
  );
}

function LigneProduitPlanning({
  ligne,
  aujourdhui,
  prevision,
  deplie,
  onBasculer,
  derniere,
}: {
  ligne: LignePlanning;
  aujourdhui: string;
  prevision: PrevisionProduit | undefined;
  deplie: boolean;
  onBasculer: () => void;
  derniere: boolean;
}) {
  const aDetail = Boolean(prevision?.detail.length);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={libelleAccessibiliteLigne(ligne, aujourdhui)}
      accessibilityState={{ expanded: aDetail ? deplie : undefined }}
      onPress={aDetail ? onBasculer : undefined}
      style={[styles.ligneProduit, !derniere && styles.ligneProduitBordure]}
    >
      <View style={styles.ligneHaute}>
        <View style={styles.centre}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Ouvrir la fiche de ${ligne.nom}`}
            onPress={(event) => {
              event.stopPropagation?.();
              router.push(`/produits/${ligne.produitId}` as Href);
            }}
          >
            <Text style={styles.nomLien} numberOfLines={1}>
              {ligne.nom}
            </Text>
          </Pressable>
          {ligne.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
          {ligne.boutiqueDestinataire ? (
            <Text style={styles.badge}>{ligne.boutiqueDestinataire}</Text>
          ) : null}
        </View>
        <View style={styles.droite}>
          {ligne.quantite !== null ? (
            <View style={styles.blocQuantite}>
              <Text style={styles.quantite}>{ligne.quantite}</Text>
              <Text style={styles.aFaire}>à faire</Text>
            </View>
          ) : (
            <View style={styles.badgeUrgent}>
              <View style={styles.pointUrgent} />
              <Text style={styles.desQuePossible}>dès que possible</Text>
            </View>
          )}
        </View>
      </View>
      {deplie && prevision ? <DetailPrevision ligne={prevision} /> : null}
    </Pressable>
  );
}

export default function EcranPlanning() {
  const { profil } = useAuth();
  const mes = useMesProduits(profil?.id ?? null);
  const previsions = useMesPrevisions(profil?.id ?? null);
  const stock = useStockFabricant(profil?.id ?? null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);

  async function rafraichir() {
    await Promise.all([mes.refetch(), previsions.refetch(), stock.refetch()]);
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
        defilement
        enRafraichissement={mes.isRefetching || previsions.isRefetching || stock.isRefetching}
        onRafraichir={() => void rafraichir()}
      >
        <EtatVide message="Vous n'avez aucun produit. Ajoutez-en dans Mes produits." />
        <Bouton titre="Mes produits" onPress={() => router.push('/(patissier)/produits' as Href)} />
      </Ecran>
    );
  }

  const surgeles = produits.filter((produit) => produit.conservation === 'surgele');
  if (surgeles.length === 0) {
    return (
      <Ecran
        defilement
        enRafraichissement={mes.isRefetching || previsions.isRefetching || stock.isRefetching}
        onRafraichir={() => void rafraichir()}
      >
        <EtatVide message="Aucun produit surgelé à planifier." />
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

  const lignesPrevision = previsions.data ?? [];
  const previsionParId = new Map(lignesPrevision.map((ligne) => [ligne.produitId, ligne]));
  const aujourdhui = aujourdhuiParis();

  const entrees = surgeles.map((produit) => {
    const prevision = previsionParId.get(produit.id);
    const info = stockParProduit.get(produit.id);
    const stockValeur = info?.stock ?? prevision?.stockActuel ?? 0;
    const seuil = info?.seuil ?? produit.seuil_min;
    return {
      produitId: produit.id,
      nom: produit.nom,
      intermediaire: produit.intermediaire,
      boutiqueDestinataire: produit.provenance_boutique_id
        ? etiquetteBoutique(produit.boutiqueNom)
        : null,
      stock: stockValeur,
      seuil,
      jourFabrication: prevision?.jourFabrication ?? null,
      quantiteSuggeree: prevision?.quantiteSuggeree ?? null,
      fiable: prevision?.fiable ?? null,
      calculeLe: prevision?.calculeLe ?? null,
    };
  });

  const groupes = construirePlanning(entrees, aujourdhui);
  const jourActif = jourSelectionne ?? aujourdhui;
  const groupeActif = groupes.find((groupe) => groupe.jour === jourActif) ?? groupes[0];
  const aSousSeuil = groupes.some((groupe) => groupe.lignes.some((ligne) => ligne.sousSeuil));
  const aIndicative = groupes.some((groupe) =>
    groupe.lignes.some((ligne) => ligne.fiable === false),
  );
  const calculees = lignesPrevision.filter((ligne) => ligne.calculeLe);
  const dernier = calculees.reduce(
    (max, ligne) => (ligne.calculeLe && ligne.calculeLe > max ? ligne.calculeLe : max),
    '',
  );

  return (
    <Ecran
      defilement
      enRafraichissement={mes.isRefetching || previsions.isRefetching || stock.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      {aIndicative ? (
        <Text style={styles.indicative}>
          Prévisions indicatives : moins de 8 semaines de données.
        </Text>
      ) : null}

      <View style={styles.bandeJours} accessibilityRole="tablist">
        {groupes.map((groupe) => {
          const selectionne = groupe.jour === groupeActif.jour;
          const estAujourdhui = groupe.jour === aujourdhui;
          return (
            <Pressable
              key={groupe.jour}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectionne }}
              accessibilityLabel={groupe.libelle}
              onPress={() => {
                setJourSelectionne(groupe.jour);
                setOuvert(null);
              }}
              style={[
                styles.caseJour,
                selectionne && styles.caseJourActive,
                !selectionne && estAujourdhui && styles.caseJourAujourdhui,
              ]}
            >
              <Text
                style={[
                  styles.caseJourSemaine,
                  selectionne && styles.caseJourSemaineActive,
                ]}
              >
                {initialeJour(groupe.jour)}
              </Text>
              <Text
                style={[styles.caseJourNumero, selectionne && styles.caseJourNumeroActive]}
              >
                {numeroJour(groupe.jour)}
              </Text>
              <View style={styles.pointsJour}>
                {groupe.lignes.slice(0, 3).map((ligne) => (
                  <View
                    key={ligne.produitId}
                    style={[
                      styles.pointJour,
                      {
                        backgroundColor: selectionne
                          ? ligne.sousSeuil
                            ? '#F2A49B'
                            : '#E9B98C'
                          : ligne.sousSeuil
                            ? couleurs.erreur
                            : couleurs.croutePoint,
                      },
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.enteteJour}>{groupeActif.libelle}</Text>

      <View style={styles.carteListe}>
        {groupeActif.lignes.length === 0 ? (
          <Text style={styles.jourVide}>Rien à fabriquer</Text>
        ) : (
          groupeActif.lignes.map((ligne, index) => (
            <LigneProduitPlanning
              key={ligne.produitId}
              ligne={ligne}
              aujourdhui={aujourdhui}
              prevision={previsionParId.get(ligne.produitId)}
              deplie={ouvert === ligne.produitId}
              derniere={index === groupeActif.lignes.length - 1}
              onBasculer={() =>
                setOuvert((actuel) => (actuel === ligne.produitId ? null : ligne.produitId))
              }
            />
          ))
        )}
      </View>

      {aSousSeuil ? <Text style={styles.legende}>● sous le seuil de stock</Text> : null}
      {dernier ? <Text style={styles.calcul}>Dernier calcul : {formatMoment(dernier)}</Text> : null}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  indicative: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.s,
    fontFamily: polices.sans,
  },
  bandeJours: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    borderRadius: 22,
    backgroundColor: couleurs.fondSegment,
    marginBottom: espacements.s,
  },
  caseJour: {
    flex: 1,
    minHeight: 84,
    paddingTop: 9,
    paddingBottom: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  caseJourActive: {
    backgroundColor: couleurs.principal,
    ...ombres.jourActif,
  },
  caseJourAujourdhui: {
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: BORDURE_AUJOURDHUI,
  },
  caseJourSemaine: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  caseJourSemaineActive: {
    color: '#E8D9C6',
  },
  caseJourNumero: {
    fontSize: 19,
    fontWeight: '500',
    letterSpacing: -0.4,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  caseJourNumeroActive: {
    color: couleurs.texteSurPrincipal,
  },
  pointsJour: {
    height: 6,
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  pointJour: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  enteteJour: {
    fontSize: tailles.grand,
    fontWeight: '500',
    color: couleurs.texte,
    marginBottom: espacements.xs,
    letterSpacing: -0.4,
    fontFamily: polices.sans,
  },
  carteListe: {
    borderRadius: 22,
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: couleurs.bordureDouce,
    paddingHorizontal: espacements.m,
    marginBottom: espacements.s,
  },
  jourVide: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    paddingVertical: 34,
    textAlign: 'center',
    fontFamily: polices.sans,
  },
  ligneProduit: {
    paddingVertical: 15,
    backgroundColor: couleurs.fond,
    gap: espacements.s,
  },
  ligneProduitBordure: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1E9DE',
  },
  ligneHaute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  centre: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  nomLien: {
    fontSize: 16,
    fontWeight: '500',
    color: couleurs.texte,
    letterSpacing: -0.1,
    fontFamily: polices.sans,
  },
  badge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    backgroundColor: couleurs.fondGroupe,
    color: couleurs.texteSecondaire,
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    marginTop: 2,
    fontFamily: polices.sans,
  },
  droite: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  blocQuantite: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  quantite: {
    fontSize: tailles.grand,
    fontWeight: '500',
    color: couleurs.texte,
    letterSpacing: -0.4,
    fontFamily: polices.sans,
  },
  aFaire: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  badgeUrgent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: couleurs.erreurClair,
  },
  pointUrgent: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: couleurs.erreur,
  },
  desQuePossible: {
    fontSize: 12,
    fontWeight: '500',
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
  detail: {
    gap: 2,
    paddingBottom: 4,
  },
  repere: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginTop: 2,
    fontFamily: polices.sans,
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
    fontSize: 12,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  cellule: {
    fontSize: 12,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  orange: {
    color: couleurs.alerte,
    fontWeight: '600',
  },
  legende: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginTop: espacements.m,
    fontFamily: polices.sans,
  },
  calcul: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginTop: espacements.s,
    fontFamily: polices.sans,
  },
});
