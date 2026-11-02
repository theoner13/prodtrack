import { router, type Href } from 'expo-router';
import { useState } from 'react';

import { useCommandes } from '@/api/commandes';
import { messageErreur } from '@/auth/erreurs';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { FiltresCommandes, ListeCommandesGroupees } from '@/components/liste-commandes';
import type { FiltreStatutCommandes } from '@/lib/commandes';

export default function EcranCommandesPatissier() {
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
      <FiltresCommandes filtreStatut={filtreStatut} onFiltreStatut={setFiltreStatut} />

      {commandes.length === 0 ? (
        <EtatVide message="Aucune commande pour ce filtre." />
      ) : (
        <ListeCommandesGroupees
          commandes={commandes}
          onOuvrir={(id) => router.push(`/(patissier)/commandes/${id}` as Href)}
          afficherRetraitBoutique
        />
      )}
    </Ecran>
  );
}
