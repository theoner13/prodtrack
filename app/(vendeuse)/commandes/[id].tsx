import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  useAnnulerCommande,
  useAnnulerCommandeRecue,
  useCommande,
  useMarquerCommandeRecue,
  useMarquerCommandeRecuperee,
  useSignalerCommandeNonRecue,
} from '@/api/commandes';
import { messageErreur } from '@/auth/erreurs';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { ContenuFicheCommande, LienDanger, LienSecondaire } from '@/components/fiche-commande';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur } from '@/components/etats';
import { peutSignalerNonRecue } from '@/lib/commandes';
import { couleurs, espacements, polices, tailles } from '@/theme';

export default function EcranDetailCommandeVendeuse() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commandeId = typeof id === 'string' ? id : id?.[0];
  const detail = useCommande(commandeId);
  const marquerRecue = useMarquerCommandeRecue();
  const annulerRecue = useAnnulerCommandeRecue();
  const marquerRecuperee = useMarquerCommandeRecuperee();
  const signaler = useSignalerCommandeNonRecue();
  const annuler = useAnnulerCommande();

  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirmerAnnulation, setConfirmerAnnulation] = useState(false);

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
  const signal = peutSignalerNonRecue(c.retrait_le, c.statut);
  const enCours =
    marquerRecue.isPending ||
    annulerRecue.isPending ||
    marquerRecuperee.isPending ||
    signaler.isPending ||
    annuler.isPending;

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

  return (
    <Ecran
      defilement
      enRafraichissement={detail.isRefetching}
      onRafraichir={() => void detail.refetch()}
    >
      {ok ? <Banniere message={ok} onFermer={() => setOk(null)} /> : null}
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      <ContenuFicheCommande commande={c} />

      <View style={styles.actions}>
        {c.statut === 'prete' ? (
          <Bouton
            titre="Marquer reçue"
            onPress={() =>
              void action(() => marquerRecue.mutateAsync(c.id), 'Commande marquée reçue.')
            }
            chargement={marquerRecue.isPending}
            desactive={enCours}
            pleineLargeur
          />
        ) : null}

        {c.statut === 'recue' ? (
          <Bouton
            titre="Marquer récupérée"
            onPress={() =>
              void action(
                () => marquerRecuperee.mutateAsync(c.id),
                'Commande marquée récupérée.',
              )
            }
            chargement={marquerRecuperee.isPending}
            desactive={enCours}
            pleineLargeur
          />
        ) : null}

        {c.statut === 'a_faire' ? (
          <Bouton
            titre="Modifier"
            variante="secondaire"
            onPress={() =>
              router.push(`/(vendeuse)/commandes/modifier/${c.id}` as Href)
            }
            pleineLargeur
          />
        ) : null}

        {(c.statut === 'a_faire' || c.statut === 'prete') && !c.non_recue_signalee_le ? (
          signal.ok ? (
            <Bouton
              titre="Signaler : pas reçu"
              variante="secondaire"
              onPress={() =>
                void action(
                  () => signaler.mutateAsync(c.id),
                  'Non-réception signalée aux pâtissiers.',
                )
              }
              chargement={signaler.isPending}
              desactive={enCours}
              pleineLargeur
            />
          ) : (
            <Text style={styles.aide}>
              Vous pourrez signaler un gâteau non reçu à partir de {signal.aPartirDe}.
            </Text>
          )
        ) : null}

        {c.statut === 'recue' ? (
          <LienSecondaire
            titre="Annuler « reçue »"
            desactive={enCours}
            onPress={() =>
              void action(() => annulerRecue.mutateAsync(c.id), 'Réception annulée.')
            }
          />
        ) : null}

        {c.statut === 'a_faire' || c.statut === 'prete' || c.statut === 'recue' ? (
          confirmerAnnulation ? (
            <View style={styles.confirmation}>
              <Text style={styles.confirmationTexte}>Annuler cette commande ?</Text>
              <Bouton
                titre="Confirmer l'annulation"
                variante="danger"
                onPress={() =>
                  void action(async () => {
                    await annuler.mutateAsync(c.id);
                    setConfirmerAnnulation(false);
                  }, 'Commande annulée.')
                }
                chargement={annuler.isPending}
                pleineLargeur
              />
              <LienSecondaire titre="Ne pas annuler" onPress={() => setConfirmerAnnulation(false)} />
            </View>
          ) : (
            <LienDanger
              titre="Annuler la commande"
              desactive={enCours}
              onPress={() => setConfirmerAnnulation(true)}
            />
          )
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
    marginTop: espacements.xl,
    gap: espacements.m,
    paddingBottom: espacements.xxl,
  },
  aide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
    textAlign: 'center',
  },
  confirmation: {
    gap: espacements.s,
    padding: espacements.m,
    backgroundColor: couleurs.erreurClair,
  },
  confirmationTexte: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    fontFamily: polices.sans,
    textAlign: 'center',
  },
});
