import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useNomsBoutiquesEntreprise } from '@/api/boutiques';
import { useCommande, useModifierCommande } from '@/api/commandes';
import { messageErreur } from '@/auth/erreurs';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur } from '@/components/etats';
import { FormulaireCommande } from '@/components/formulaire-commande';
import {
  centimesVersSaisie,
  decomposerRetrait,
  validerCommande,
  type SaisieCommande,
} from '@/lib/commandes';
import { couleurs, espacements, polices, tailles } from '@/theme';

export default function EcranModifierCommande() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commandeId = typeof id === 'string' ? id : id?.[0];
  const detail = useCommande(commandeId);
  const boutiques = useNomsBoutiquesEntreprise();
  const modifier = useModifierCommande();
  const [erreur, setErreur] = useState<string | null>(null);

  const initial = useMemo<SaisieCommande | null>(() => {
    if (!detail.data) return null;
    const c = detail.data;
    const { jour, heure } = decomposerRetrait(c.retrait_le);
    return {
      clientNom: c.client_nom,
      clientTelephone: c.client_telephone,
      clientEmail: c.client_email ?? '',
      gateau: c.gateau,
      nbParts: c.nb_parts,
      demandes: c.demandes ?? '',
      inscription: c.inscription ?? '',
      boutiqueFabricationId: c.boutique_fabrication_id,
      boutiqueRetraitId: c.boutique_retrait_id,
      jourRetrait: jour,
      heureRetrait: heure,
      prixEuros: centimesVersSaisie(c.prix_centimes),
      acompteEuros: centimesVersSaisie(c.acompte_centimes),
    };
  }, [detail.data]);

  if (detail.isLoading || boutiques.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (detail.isError || !detail.data || !initial) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(detail.error ?? new Error('Commande introuvable.'))}
          onReessayer={() => void detail.refetch()}
        />
      </Ecran>
    );
  }

  if (detail.data.statut !== 'a_faire') {
    return (
      <Ecran>
        <EtatErreur message="Seule une commande « À faire » peut être modifiée." />
      </Ecran>
    );
  }

  async function enregistrer(saisie: SaisieCommande) {
    setErreur(null);
    const resultat = validerCommande(saisie, { autoriserPasse: true });
    if (!resultat.ok) {
      setErreur('Vérifiez le formulaire.');
      return;
    }
    try {
      await modifier.mutateAsync({ id: commandeId as string, ...resultat.data });
      router.replace(`/(vendeuse)/commandes/${commandeId}` as Href);
    } catch (e: unknown) {
      setErreur(messageErreur(e));
    }
  }

  return (
    <Ecran defilement>
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <FormulaireCommande
        initial={initial}
        boutiques={boutiques.data ?? []}
        onEnregistrer={enregistrer}
        titreBouton="Enregistrer les modifications"
        chargement={modifier.isPending}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  erreur: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
    marginBottom: espacements.m,
  },
});
