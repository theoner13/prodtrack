import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useNomsBoutiquesEntreprise } from '@/api/boutiques';
import { useCreerCommande } from '@/api/commandes';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur } from '@/components/etats';
import { FormulaireCommande } from '@/components/formulaire-commande';
import { aujourdhuiParis } from '@/lib/format';
import { validerCommande, type SaisieCommande } from '@/lib/commandes';
import { couleurs, espacements, polices, tailles } from '@/theme';

export default function EcranNouvelleCommande() {
  const { profil } = useAuth();
  const boutiques = useNomsBoutiquesEntreprise();
  const creer = useCreerCommande();
  const [erreur, setErreur] = useState<string | null>(null);

  const initial = useMemo<SaisieCommande>(() => {
    const maBoutique = profil?.boutique_id ?? '';
    return {
      clientNom: '',
      clientTelephone: '',
      clientEmail: '',
      gateau: '',
      nbParts: 8,
      demandes: '',
      inscription: '',
      boutiqueFabricationId: maBoutique,
      boutiqueRetraitId: maBoutique,
      jourRetrait: aujourdhuiParis(),
      heureRetrait: '16:00',
      prixEuros: '',
      acompteEuros: '',
    };
  }, [profil?.boutique_id]);

  if (boutiques.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (boutiques.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(boutiques.error)}
          onReessayer={() => void boutiques.refetch()}
        />
      </Ecran>
    );
  }

  if (!profil?.boutique_id) {
    return (
      <Ecran>
        <EtatErreur message="Votre boutique est introuvable." />
      </Ecran>
    );
  }

  async function enregistrer(saisie: SaisieCommande) {
    setErreur(null);
    const resultat = validerCommande(saisie);
    if (!resultat.ok) {
      setErreur('Vérifiez le formulaire.');
      return;
    }
    try {
      const id = await creer.mutateAsync(resultat.data);
      router.replace(`/(vendeuse)/commandes/${id}` as Href);
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
        chargement={creer.isPending}
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
