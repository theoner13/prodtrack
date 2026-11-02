import { router, type Href } from 'expo-router';
import { useState } from 'react';

import { useNomsBoutiquesEntreprise } from '@/api/boutiques';
import { useCommandes } from '@/api/commandes';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { FiltresCommandes, ListeCommandesGroupees } from '@/components/liste-commandes';
import type { FiltreStatutCommandes } from '@/lib/commandes';

export default function EcranCommandesPatissier() {
  const { profil } = useAuth();
  const boutiques = useNomsBoutiquesEntreprise();
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatutCommandes>('a_venir');
  const [boutiqueId, setBoutiqueId] = useState<string | null>(profil?.boutique_id ?? null);
  const liste = useCommandes({
    filtreStatut,
    boutiqueFabricationId: boutiqueId,
  });

  if (liste.isLoading || boutiques.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (liste.isError || boutiques.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(liste.error ?? boutiques.error)}
          onReessayer={() => {
            void liste.refetch();
            void boutiques.refetch();
          }}
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
      <FiltresCommandes
        filtreStatut={filtreStatut}
        onFiltreStatut={setFiltreStatut}
        boutiqueId={boutiqueId}
        onBoutique={setBoutiqueId}
        boutiques={boutiques.data ?? []}
        libelleToutes="Toutes"
      />

      {commandes.length === 0 ? (
        <EtatVide message="Aucune commande pour ce filtre." />
      ) : (
        <ListeCommandesGroupees
          commandes={commandes}
          onOuvrir={(id) => router.push(`/(patissier)/commandes/${id}` as Href)}
          etiquetteBoutique="retrait"
        />
      )}
    </Ecran>
  );
}
