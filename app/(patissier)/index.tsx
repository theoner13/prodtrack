import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useNomsBoutiquesEntreprise } from '@/api/boutiques';
import { useCommandes } from '@/api/commandes';
import {
  useMesPrevisions,
  useProductionBoutiques,
  type PrevisionProduit,
} from '@/api/previsions';
import { useMesProduits } from '@/api/produits';
import { useStockFabricant } from '@/api/stock';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { CarteHeros } from '@/components/carte-heros';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { FriseJours } from '@/components/frise-jours';
import { LigneCommande } from '@/components/liste-commandes';
import { TableauProductionBoutiques } from '@/components/tableau-production-boutiques';
import { jourRetraitParis } from '@/lib/commandes';
import { aujourdhuiParis } from '@/lib/format';
import { etiquetteLaboratoire } from '@/lib/laboratoire';
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
  rayonCarte,
  seuilOrdinateur,
  styleChiffre,
  styleTitreSection,
  tailles,
} from '@/theme';

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

function CarteProduitPlanning({
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={libelleAccessibiliteLigne(ligne, aujourdhui)}
      accessibilityState={{ expanded: aDetail ? deplie : undefined }}
      onPress={aDetail ? onBasculer : undefined}
      style={({ pressed }) => [styles.carteProduit, ombres.douce, pressed && styles.appuye]}
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
            <Text style={styles.nomLien} numberOfLines={2}>
              {ligne.nom}
            </Text>
          </Pressable>
          <View style={styles.badges}>
            {ligne.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
            {ligne.laboratoire ? (
              <Text style={styles.badge}>{etiquetteLaboratoire()}</Text>
            ) : ligne.boutiqueDestinataire ? (
              <Text style={styles.badge}>{ligne.boutiqueDestinataire}</Text>
            ) : null}
          </View>
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
  const nomsEntreprise = useNomsBoutiquesEntreprise();
  const aujourdhui = aujourdhuiParis();
  const commandes = useCommandes({
    filtreStatut: 'a_venir',
    boutiqueFabricationId: profil?.boutique_id ?? null,
  });
  const production = useProductionBoutiques(profil?.id ?? null, aujourdhui);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const grille = width >= seuilOrdinateur;

  async function rafraichir() {
    await Promise.all([
      mes.refetch(),
      previsions.refetch(),
      stock.refetch(),
      nomsEntreprise.refetch(),
      commandes.refetch(),
      production.refetch(),
    ]);
  }

  const enRafraichissement =
    mes.isRefetching ||
    previsions.isRefetching ||
    stock.isRefetching ||
    commandes.isRefetching ||
    production.isRefetching;

  if (
    mes.isLoading ||
    previsions.isLoading ||
    stock.isLoading ||
    commandes.isLoading ||
    production.isLoading
  ) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (mes.isError || previsions.isError || stock.isError || commandes.isError || production.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(
            mes.error ?? previsions.error ?? stock.error ?? commandes.error ?? production.error,
          )}
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
        enRafraichissement={enRafraichissement}
        onRafraichir={() => void rafraichir()}
      >
        <EtatVide message="Vous n'avez aucun produit. Ajoutez-en dans Mes produits." />
        <Bouton titre="Mes produits" onPress={() => router.push('/(patissier)/produits' as Href)} />
      </Ecran>
    );
  }

  const surgeles = produits.filter((produit) => produit.conservation === 'surgele');

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
  const idsLaboratoires = new Set(
    (nomsEntreprise.data ?? []).filter((b) => b.est_laboratoire).map((b) => b.id),
  );

  const entrees = surgeles.map((produit) => {
    const prevision = previsionParId.get(produit.id);
    const info = stockParProduit.get(produit.id);
    const stockValeur = info?.stock ?? prevision?.stockActuel ?? 0;
    const seuil = info?.seuil ?? produit.seuil_min;
    const auLabo = idsLaboratoires.has(produit.boutique_id);
    return {
      produitId: produit.id,
      nom: produit.nom,
      intermediaire: produit.intermediaire,
      boutiqueDestinataire:
        !auLabo && produit.provenance_boutique_id
          ? etiquetteBoutique(produit.boutiqueNom)
          : null,
      laboratoire: auLabo,
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

  const listeCommandes = commandes.data ?? [];
  const listeProduction = production.data ?? [];
  const commandesDuJour = (jour: string) =>
    listeCommandes.filter((commande) => jourRetraitParis(commande.retrait_le) === jour);
  const productionDuJour = (jour: string) =>
    listeProduction.filter((ligne) => ligne.jour === jour);

  const commandesActives = commandesDuJour(groupeActif.jour);
  const productionActive = productionDuJour(groupeActif.jour);
  const estAujourdhui = groupeActif.jour === aujourdhui;

  // Pièces encore à produire : surgelés + produits frais (aujourd'hui : moins le déjà produit).
  const piecesSurgeles = groupeActif.lignes.reduce((sum, ligne) => sum + (ligne.quantite ?? 0), 0);
  const piecesFrais = productionActive.reduce(
    (sum, ligne) => sum + Math.max(0, ligne.quantite - (estAujourdhui ? ligne.dejaProduit : 0)),
    0,
  );
  const totalPieces = piecesSurgeles + piecesFrais;
  const nbProduitsFrais = new Set(productionActive.map((ligne) => ligne.nom)).size;
  const nbSurgeles = groupeActif.lignes.length;
  const resume = [
    commandesActives.length > 0
      ? `${commandesActives.length} commande${commandesActives.length > 1 ? 's' : ''} de gâteaux`
      : null,
    nbProduitsFrais > 0 ? `${nbProduitsFrais} produit${nbProduitsFrais > 1 ? 's' : ''} frais` : null,
    nbSurgeles > 0 ? `${nbSurgeles} surgelé${nbSurgeles > 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const sousTitreHeros = !resume
    ? 'Rien à fabriquer'
    : totalPieces > 0
      ? `${estAujourdhui ? 'pièces restant à produire' : 'pièces à produire'} · ${resume}`
      : resume;

  return (
    <Ecran
      defilement
      enRafraichissement={enRafraichissement}
      onRafraichir={() => void rafraichir()}
    >
      {aIndicative ? (
        <Text style={styles.indicative}>
          Prévisions indicatives : moins de 8 semaines de données.
        </Text>
      ) : null}

      <FriseJours
        jours={groupes.map((groupe) => ({
          id: groupe.jour,
          initiale: initialeJour(groupe.jour),
          numero: numeroJour(groupe.jour),
          libelle: groupe.libelle,
          estAujourdhui: groupe.jour === aujourdhui,
          points: Math.min(
            groupe.lignes.length +
              commandesDuJour(groupe.jour).length +
              (productionDuJour(groupe.jour).length > 0 ? 1 : 0),
            3,
          ),
          pointsAlerte: groupe.lignes.slice(0, 3).map((l) => l.sousSeuil),
        }))}
        selection={groupeActif.jour}
        onSelect={(id) => {
          setJourSelectionne(id);
          setOuvert(null);
        }}
      />

      <CarteHeros
        libelle={groupeActif.libelle}
        chiffre={totalPieces > 0 ? totalPieces : '—'}
        sousTitre={sousTitreHeros}
      />

      {commandesActives.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.titreSection}>Commandes de gâteaux</Text>
          <View style={styles.carteListe}>
            {commandesActives.map((commande) => (
              <LigneCommande
                key={commande.id}
                commande={commande}
                afficherRetraitBoutique
                onPress={() => router.push(`/(patissier)/commandes/${commande.id}` as Href)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {productionActive.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.titreSection}>Production pour les boutiques</Text>
          <TableauProductionBoutiques
            key={groupeActif.jour}
            lignes={productionActive}
            maBoutiqueId={profil?.boutique_id ?? null}
            estAujourdhui={estAujourdhui}
          />
        </View>
      ) : null}

      {groupeActif.lignes.length === 0 ? null : (
        <View style={styles.section}>
          <Text style={styles.titreSection}>Surgelés à refaire</Text>
          <View style={[styles.grille, grille && styles.grille2]}>
            {groupeActif.lignes.map((ligne) => (
              <View
                key={ligne.produitId}
                style={
                  grille
                    ? [styles.colonne, groupeActif.lignes.length === 1 && styles.colonneUnique]
                    : undefined
                }
              >
                <CarteProduitPlanning
                  ligne={ligne}
                  aujourdhui={aujourdhui}
                  prevision={previsionParId.get(ligne.produitId)}
                  deplie={ouvert === ligne.produitId}
                  onBasculer={() =>
                    setOuvert((actuel) => (actuel === ligne.produitId ? null : ligne.produitId))
                  }
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {aSousSeuil ? (
        <View style={styles.legendeLigne}>
          <View style={styles.legendePoint} />
          <Text style={styles.legende}>sous le seuil de stock</Text>
        </View>
      ) : null}
      {dernier ? <Text style={styles.calcul}>Dernier calcul : {formatMoment(dernier)}</Text> : null}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: espacements.s,
    marginTop: espacements.s,
  },
  titreSection: {
    ...styleTitreSection,
  },
  carteListe: {
    gap: espacements.s,
  },
  indicative: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.s,
    fontFamily: polices.sans,
  },
  grille: {
    gap: 10,
  },
  grille2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colonne: {
    width: '50%',
    maxWidth: '50%',
    paddingRight: 5,
    paddingLeft: 5,
  },
  colonneUnique: {
    width: '50%',
    maxWidth: '50%',
  },
  carteProduit: {
    backgroundColor: couleurs.surface,
    borderRadius: rayonCarte,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: espacements.s,
    marginBottom: 2,
  },
  ligneHaute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  centre: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  nomLien: {
    fontSize: 16,
    fontWeight: '500',
    color: couleurs.texte,
    letterSpacing: -0.1,
    fontFamily: polices.sans,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    overflow: 'hidden',
    backgroundColor: couleurs.fondGroupe,
    color: couleurs.texteSecondaire,
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontFamily: polices.sans,
  },
  droite: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  blocQuantite: {
    alignItems: 'flex-end',
    gap: 2,
  },
  quantite: {
    ...styleChiffre,
    fontSize: 40,
    color: couleurs.texte,
    letterSpacing: -1,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: couleurs.erreurClair,
    minHeight: 48,
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
    paddingTop: espacements.s,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordureDouce,
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
    ...styleTitreSection,
    fontSize: 11,
  },
  cellule: {
    fontSize: 12,
    color: couleurs.texte,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
  },
  orange: {
    color: couleurs.alerte,
    fontWeight: '600',
  },
  legendeLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: espacements.m,
  },
  legendePoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: couleurs.erreur,
  },
  legende: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  calcul: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginTop: espacements.s,
    fontFamily: polices.sans,
  },
  appuye: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
