import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMesPrevisions, type PrevisionProduit } from '@/api/previsions';
import { useMesProduits } from '@/api/produits';
import { useStock } from '@/api/stock';
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
import { couleurs, espacements, styleTitreSection, tailles } from '@/theme';

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
}: {
  ligne: LignePlanning;
  aujourdhui: string;
  prevision: PrevisionProduit | undefined;
  deplie: boolean;
  onBasculer: () => void;
}) {
  const aDetail = Boolean(prevision?.detail.length);
  const stockTexte = ligne.sousSeuil
    ? `Stock ${ligne.stock} / seuil ${ligne.seuil}`
    : `Stock ${ligne.stock}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={libelleAccessibiliteLigne(ligne, aujourdhui)}
      accessibilityState={{ expanded: aDetail ? deplie : undefined }}
      onPress={aDetail ? onBasculer : undefined}
      style={styles.ligneProduit}
    >
      <View style={styles.ligneHaute}>
        <View style={styles.pointSlot}>
          {ligne.sousSeuil ? <View style={styles.point} /> : null}
        </View>
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
          <Text style={styles.stock}>{stockTexte}</Text>
          {ligne.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
        </View>
        <View style={styles.droite}>
          {ligne.quantite !== null ? (
            <>
              <Text style={styles.quantite}>{ligne.quantite}</Text>
              <Text style={styles.aFaire}>à faire</Text>
            </>
          ) : (
            <Text style={styles.desQuePossible}>dès que possible</Text>
          )}
        </View>
      </View>
      {deplie && prevision ? <DetailPrevision ligne={prevision} /> : null}
    </Pressable>
  );
}

export default function EcranPlanning() {
  const { profil } = useAuth();
  const boutiqueId = profil?.boutique_id ?? null;
  const mes = useMesProduits(profil?.id ?? null);
  const previsions = useMesPrevisions(profil?.id ?? null);
  const stock = useStock(boutiqueId);
  const [ouvert, setOuvert] = useState<string | null>(null);

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

  const lignesPrevision = previsions.data ?? [];
  const previsionParId = new Map(lignesPrevision.map((ligne) => [ligne.produitId, ligne]));
  const aujourdhui = aujourdhuiParis();

  const entrees = produits.map((produit) => {
    const prevision = previsionParId.get(produit.id);
    const info = stockParProduit.get(produit.id);
    const stockValeur = info?.stock ?? prevision?.stockActuel ?? 0;
    const seuil = info?.seuil ?? produit.seuil_min;
    return {
      produitId: produit.id,
      nom: produit.nom,
      intermediaire: produit.intermediaire,
      stock: stockValeur,
      seuil,
      jourFabrication: prevision?.jourFabrication ?? null,
      quantiteSuggeree: prevision?.quantiteSuggeree ?? null,
      fiable: prevision?.fiable ?? null,
      calculeLe: prevision?.calculeLe ?? null,
    };
  });

  const groupes = construirePlanning(entrees, aujourdhui);
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
      titre="Planning"
      defilement
      enRafraichissement={mes.isRefetching || previsions.isRefetching || stock.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      {aIndicative ? (
        <Text style={styles.indicative}>
          Prévisions indicatives : moins de 8 semaines de données.
        </Text>
      ) : null}

      {groupes.length === 0 ? (
        calculees.length === 0 ? (
          <EtatVide message="Les prévisions sont calculées chaque nuit. Revenez demain." />
        ) : (
          <EtatVide message="Rien à fabriquer dans les 7 prochains jours." />
        )
      ) : (
        groupes.map((groupe) => (
          <View key={groupe.jour} style={styles.groupe}>
            <Text style={styles.section}>
              {groupe.libelle} · {groupe.lignes.length}{' '}
              {groupe.lignes.length > 1 ? 'produits' : 'produit'}
            </Text>
            {groupe.lignes.map((ligne) => (
              <LigneProduitPlanning
                key={ligne.produitId}
                ligne={ligne}
                aujourdhui={aujourdhui}
                prevision={previsionParId.get(ligne.produitId)}
                deplie={ouvert === ligne.produitId}
                onBasculer={() =>
                  setOuvert((actuel) => (actuel === ligne.produitId ? null : ligne.produitId))
                }
              />
            ))}
          </View>
        ))
      )}

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
  },
  groupe: {
    marginBottom: espacements.s,
  },
  section: {
    ...styleTitreSection,
    marginTop: espacements.m,
    marginBottom: espacements.xs,
  },
  ligneProduit: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
    gap: espacements.s,
  },
  ligneHaute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
  },
  pointSlot: {
    width: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  point: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: couleurs.alerte,
  },
  centre: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  nomLien: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.principal,
    textDecorationLine: 'underline',
  },
  stock: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  badge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    backgroundColor: couleurs.fondPuce,
    color: couleurs.texteSecondaire,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: espacements.s,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  droite: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 56,
  },
  quantite: {
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.texte,
  },
  aFaire: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  desQuePossible: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    textAlign: 'right',
    maxWidth: 88,
  },
  detail: {
    gap: 2,
    paddingLeft: 8 + espacements.s,
  },
  repere: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginTop: 2,
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
  },
  cellule: {
    fontSize: 12,
    color: couleurs.texte,
  },
  orange: {
    color: couleurs.alerte,
    fontWeight: '600',
  },
  legende: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginTop: espacements.m,
  },
  calcul: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginTop: espacements.s,
  },
});
