import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useCommandes } from '@/api/commandes';
import { messageErreur } from '@/auth/erreurs';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { FiltresCommandes, ListeCommandesGroupees } from '@/components/liste-commandes';
import type { FiltreStatutCommandes } from '@/lib/commandes';
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
        <ListeCommandesGroupees
          commandes={commandes}
          onOuvrir={(id) => router.push(`/(vendeuse)/commandes/${id}` as Href)}
          etiquetteBoutique="fabrication"
        />
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
});
