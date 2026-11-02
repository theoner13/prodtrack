import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCommandes } from '@/api/commandes';
import { messageErreur } from '@/auth/erreurs';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import {
  FiltresCommandes,
  LigneCommande,
  ListeCommandesGroupees,
} from '@/components/liste-commandes';
import { jourRetraitParis, type FiltreStatutCommandes } from '@/lib/commandes';
import { aujourdhuiParis } from '@/lib/format';
import { couleurs, espacements, polices, tailles } from '@/theme';

export default function EcranCommandesVendeuse() {
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatutCommandes>('a_venir');
  const liste = useCommandes({ filtreStatut });

  if (liste.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (liste.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(liste.error)}
          onReessayer={() => void liste.refetch()}
        />
      </Ecran>
    );
  }

  const commandes = liste.data ?? [];
  const aujourdhui = aujourdhuiParis();
  const aRemettre =
    filtreStatut === 'a_venir'
      ? commandes.filter(
          (c) => c.statut === 'recue' && jourRetraitParis(c.retrait_le) === aujourdhui,
        )
      : [];
  const idsRemettre = new Set(aRemettre.map((c) => c.id));
  const commandesListe =
    aRemettre.length > 0 ? commandes.filter((c) => !idsRemettre.has(c.id)) : commandes;

  return (
    <Ecran
      defilement
      enRafraichissement={liste.isRefetching}
      onRafraichir={() => void liste.refetch()}
    >
      <Pressable
        onPress={() => router.push('/(vendeuse)/commandes/nouvelle' as Href)}
        style={styles.lienNouveau}
        accessibilityRole="button"
        accessibilityLabel="Nouvelle commande"
      >
        <Text style={styles.lienNouveauTexte}>+ Nouvelle commande</Text>
      </Pressable>

      <FiltresCommandes filtreStatut={filtreStatut} onFiltreStatut={setFiltreStatut} />

      {commandes.length === 0 ? (
        <EtatVide message="Aucune commande pour ce filtre." />
      ) : (
        <>
          {aRemettre.length > 0 ? (
            <View style={styles.encart}>
              <Text style={styles.encartTitre}>À remettre maintenant</Text>
              {aRemettre.map((c) => (
                <LigneCommande
                  key={c.id}
                  commande={c}
                  onPress={() => router.push(`/(vendeuse)/commandes/${c.id}` as Href)}
                />
              ))}
            </View>
          ) : null}
          {commandesListe.length > 0 ? (
            <ListeCommandesGroupees
              commandes={commandesListe}
              onOuvrir={(id) => router.push(`/(vendeuse)/commandes/${id}` as Href)}
            />
          ) : aRemettre.length === 0 ? (
            <EtatVide message="Aucune commande pour ce filtre." />
          ) : null}
        </>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  lienNouveau: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: espacements.s,
    minHeight: 40,
    justifyContent: 'center',
  },
  lienNouveauTexte: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  encart: {
    backgroundColor: couleurs.alerteClair,
    borderRadius: 10,
    paddingHorizontal: espacements.m,
    paddingTop: espacements.s,
    paddingBottom: espacements.xs,
    marginBottom: espacements.m,
  },
  encartTitre: {
    fontSize: 12,
    fontWeight: '600',
    color: couleurs.crouteFonce,
    fontFamily: polices.sans,
    marginBottom: 2,
  },
});
