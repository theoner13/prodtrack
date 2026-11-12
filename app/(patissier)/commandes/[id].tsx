import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  useAnnulerCommandePrete,
  useCommande,
  useMarquerCommandePrete,
} from '@/api/commandes';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { ContenuFicheCommande, LienSecondaire } from '@/components/fiche-commande';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur } from '@/components/etats';
import { couleurs, espacements, polices, tailles } from '@/theme';

export default function EcranDetailCommandePatissier() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commandeId = typeof id === 'string' ? id : id?.[0];
  const { profil } = useAuth();
  const detail = useCommande(commandeId);
  const marquerPrete = useMarquerCommandePrete();
  const annulerPrete = useAnnulerCommandePrete();
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (detail.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(detail.error ?? new Error('Commande introuvable.'))}
          onReessayer={() => void detail.refetch()}
        />
      </Ecran>
    );
  }

  const c = detail.data;
  const maBoutique = profil?.boutique_id ?? null;
  const fabriqueeChezMoi = maBoutique != null && c.boutique_fabrication_id === maBoutique;
  const jeSuisFabricant = profil?.id != null && c.fabricant_id === profil.id;

  async function action(fn: () => Promise<unknown>, messageOk: string) {
    setErreur(null);
    setOk(null);
    try {
      await fn();
      setOk(messageOk);
      void detail.refetch();
    } catch (e: unknown) {
      setErreur(messageErreur(e));
    }
  }

  const pied =
    fabriqueeChezMoi && c.statut === 'a_faire' ? (
      <Bouton
        titre="Marquer prête"
        onPress={() =>
          void action(() => marquerPrete.mutateAsync(c.id), 'Commande marquée prête.')
        }
        chargement={marquerPrete.isPending}
        pleineLargeur
      />
    ) : null;

  return (
    <Ecran
      defilement
      pied={pied}
      enRafraichissement={detail.isRefetching}
      onRafraichir={() => void detail.refetch()}
    >
      {ok ? <Banniere message={ok} onFermer={() => setOk(null)} /> : null}
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      <ContenuFicheCommande commande={c} afficherBoutiqueRetrait />

      <View style={styles.actions}>
        {jeSuisFabricant && c.statut === 'prete' ? (
          <LienSecondaire
            titre="Annuler « prête »"
            desactive={annulerPrete.isPending}
            onPress={() =>
              void action(() => annulerPrete.mutateAsync(c.id), 'Marquage « prête » annulé.')
            }
          />
        ) : null}
      </View>
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
  actions: {
    marginTop: espacements.l,
    gap: espacements.m,
    paddingBottom: espacements.xxl,
  },
});
