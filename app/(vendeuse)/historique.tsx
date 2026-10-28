import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { useHistoriqueVentes, type JourHistorique } from '@/api/ventes';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur } from '@/components/etats';
import {
  aujourdhuiParis,
  formatDate,
  jourPrecedent,
} from '@/lib/format';
import { couleurs, espacements, rayon, tailles } from '@/theme';

export default function EcranHistorique() {
  const { profil } = useAuth();
  const boutiqueId = profil?.boutique_id ?? null;
  const historique = useHistoriqueVentes(boutiqueId);
  const [ouvert, setOuvert] = useState<string | null>(null);

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

  return (
    <Ecran
      titre="Historique"
      defilement
      enRafraichissement={historique.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      {jours.map((jour) => (
        <JourHistoriqueCarte
          key={jour.jour}
          jour={jour}
          deplie={ouvert === jour.jour}
          modifiable={jour.jour === aujourdhui || jour.jour === hier}
          onToggle={() => setOuvert((actuel) => (actuel === jour.jour ? null : jour.jour))}
          onModifier={() => router.push(`/?jour=${jour.jour}` as Href)}
        />
      ))}
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
    <View style={styles.carte}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: deplie }}
        onPress={onToggle}
        style={({ pressed }) => [styles.entete, pressed && styles.appuye]}
      >
        <Text style={styles.date}>{formatDate(jour.jour)}</Text>
        <Text style={styles.resume}>{resume}</Text>
      </Pressable>

      {deplie ? (
        <View style={styles.detail}>
          {vide ? (
            <Text style={styles.vide}>Aucune saisie ce jour-là.</Text>
          ) : (
            jour.detail.map((ligne) => (
              <View key={ligne.produitId} style={styles.produit}>
                <Text style={styles.nom}>{ligne.nom}</Text>
                <Text style={styles.quantites}>
                  Vendu {ligne.vendu} · Jeté {ligne.jete} · Reste {ligne.reste}
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
  carte: {
    borderRadius: rayon,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  entete: {
    padding: espacements.m,
    gap: espacements.xs,
  },
  appuye: {
    opacity: 0.8,
  },
  date: {
    fontSize: tailles.normal,
    fontWeight: '700',
    color: couleurs.texte,
  },
  resume: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  detail: {
    paddingHorizontal: espacements.m,
    paddingBottom: espacements.m,
    gap: espacements.s,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  vide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    paddingTop: espacements.s,
  },
  produit: {
    gap: 2,
    paddingTop: espacements.s,
  },
  nom: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
  },
  quantites: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
});
