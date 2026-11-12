import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { useHistoriqueVentes, type JourHistorique } from '@/api/ventes';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { VenteApparition } from '@/components/vente-apparition';
import {
  aujourdhuiParis,
  formatDate,
  jourPrecedent,
} from '@/lib/format';
import { etiquetteBoutique } from '@/lib/production-exterieure';
import {
  couleurs,
  espacements,
  ombres,
  polices,
  rayonCarte,
  seuilOrdinateur,
  styleChiffre,
  tailles,
} from '@/theme';

export default function EcranHistorique() {
  const { profil } = useAuth();
  const boutiqueId = profil?.boutique_id ?? null;
  const historique = useHistoriqueVentes(boutiqueId);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const grille = width >= seuilOrdinateur;

  const aujourdhui = aujourdhuiParis();
  const hier = jourPrecedent(aujourdhui);

  const rafraichir = useCallback(async () => {
    await historique.refetch();
  }, [historique]);

  if (historique.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (historique.error) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(historique.error)}
          onReessayer={() => void rafraichir()}
        />
      </Ecran>
    );
  }

  const jours = historique.data ?? [];
  const aucunJourSaisi =
    jours.length === 0 || jours.every((jour) => jour.detail.length === 0);

  return (
    <Ecran
      defilement
      enRafraichissement={historique.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      {aucunJourSaisi ? (
        <EtatVide message="Aucune saisie" />
      ) : (
        <View style={grille ? styles.grille2 : styles.grille}>
          {jours.map((jour, index) => (
            <View
              key={jour.jour}
              style={
                grille
                  ? [styles.colonne, index % 2 === 0 ? styles.colonneGauche : styles.colonneDroite]
                  : undefined
              }
            >
              <VenteApparition index={index}>
                <JourHistoriqueCarte
                  jour={jour}
                  deplie={ouvert === jour.jour}
                  modifiable={jour.jour === aujourdhui || jour.jour === hier}
                  onToggle={() =>
                    setOuvert((actuel) => (actuel === jour.jour ? null : jour.jour))
                  }
                  onModifier={() => router.push(`/?jour=${jour.jour}` as Href)}
                />
              </VenteApparition>
            </View>
          ))}
        </View>
      )}
    </Ecran>
  );
}

function JourHistoriqueCarte({
  jour,
  deplie,
  modifiable,
  onToggle,
  onModifier,
}: {
  jour: JourHistorique;
  deplie: boolean;
  modifiable: boolean;
  onToggle: () => void;
  onModifier: () => void;
}) {
  const vide = jour.detail.length === 0;
  const resume = vide
    ? 'Aucune saisie'
    : `Vendu : ${jour.totalVendu} · Jeté : ${jour.totalJete}`;

  return (
    <View style={[styles.carte, ombres.douce]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: deplie }}
        onPress={onToggle}
        style={({ pressed }) => [styles.entete, pressed && styles.appuye]}
      >
        <Text style={styles.date}>{formatDate(jour.jour)}</Text>
        <View style={styles.resumeLigne}>
          <Text style={styles.resume}>{resume}</Text>
          {!vide ? (
            <View style={styles.chiffres}>
              <Text style={styles.chiffre}>{jour.totalVendu}</Text>
              <Text style={styles.chiffreMuet}>/</Text>
              <Text style={styles.chiffre}>{jour.totalJete}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {deplie ? (
        <View style={styles.detail}>
          {vide ? (
            <Text style={styles.vide}>Aucune saisie ce jour-là.</Text>
          ) : (
            jour.detail.map((ligne) => (
              <View key={ligne.produitId} style={styles.produit}>
                <Text style={styles.nom}>
                  {ligne.nom}
                  {ligne.provenanceBoutiqueNom
                    ? ` · ${etiquetteBoutique(ligne.provenanceBoutiqueNom)}`
                    : ''}
                </Text>
                <Text style={styles.quantites}>
                  {ligne.misEnVente != null
                    ? `Mis en vente ${ligne.misEnVente} · Vendu ${ligne.vendu} · Jeté ${ligne.jete} · Reste ${ligne.reste}`
                    : `Vendu ${ligne.vendu} · Jeté ${ligne.jete} · Reste ${ligne.reste}`}
                </Text>
              </View>
            ))
          )}
          {modifiable ? (
            <Bouton titre="Modifier ce jour" variante="secondaire" onPress={onModifier} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grille: {
    gap: 10,
  },
  grille2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 0,
  },
  colonne: {
    width: '50%',
  },
  colonneGauche: {
    paddingRight: 5,
  },
  colonneDroite: {
    paddingLeft: 5,
  },
  carte: {
    backgroundColor: couleurs.surface,
    borderRadius: rayonCarte,
    paddingHorizontal: espacements.m,
    marginBottom: 2,
  },
  entete: {
    paddingVertical: 16,
    gap: espacements.xs,
    minHeight: 48,
  },
  appuye: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  date: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  resumeLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacements.s,
  },
  resume: {
    flex: 1,
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  chiffres: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chiffre: {
    ...styleChiffre,
    fontSize: tailles.grand,
  },
  chiffreMuet: {
    ...styleChiffre,
    fontSize: tailles.petit,
    color: couleurs.texteMuet,
  },
  detail: {
    paddingBottom: espacements.m,
    gap: espacements.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: couleurs.bordureDouce,
  },
  vide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    paddingTop: espacements.s,
    fontFamily: polices.sans,
  },
  produit: {
    gap: 2,
    paddingTop: espacements.s,
  },
  nom: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  quantites: {
    ...styleChiffre,
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
});
