import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CommandeEnrichie } from '@/api/commandes';
import { libelleStatut } from '@/api/commandes';
import {
  formatRetraitComplet,
  libelleNonRecueSignalee,
  libelleRecueA,
  resteAPayerCentimes,
} from '@/lib/commandes';
import { formatEuros } from '@/lib/format';
import { couleurs, espacements, polices, styleTitreSection, tailles } from '@/theme';

type Props = {
  commande: CommandeEnrichie;
};

export function ContenuFicheCommande({ commande }: Props) {
  const reste = resteAPayerCentimes(commande.prix_centimes, commande.acompte_centimes);
  return (
    <View style={styles.bloc}>
      <Text style={styles.gateau}>
        {commande.gateau} · {commande.nb_parts} parts
      </Text>
      <Etiquette statut={commande.statut} />
      {commande.non_recue_signalee_le &&
      (commande.statut === 'a_faire' || commande.statut === 'prete') ? (
        <Text style={styles.nonRecue}>
          {libelleNonRecueSignalee(commande.non_recue_signalee_le)}
        </Text>
      ) : null}

      <Ligne libelle="Client" valeur={commande.client_nom} />
      <Ligne libelle="Téléphone" valeur={commande.client_telephone} />
      {commande.client_email ? <Ligne libelle="Email" valeur={commande.client_email} /> : null}
      <Ligne libelle="Demandes" valeur={commande.demandes?.trim() ? commande.demandes : '—'} />
      <Ligne
        libelle="Inscription"
        valeur={commande.inscription?.trim() ? commande.inscription : '—'}
      />
      <Ligne libelle="Fabriquée à" valeur={commande.boutique_fabrication_nom} />
      <Ligne libelle="Retrait" valeur={formatRetraitComplet(commande.retrait_le)} />
      <Ligne
        libelle="Prix"
        valeur={commande.prix_centimes != null ? formatEuros(commande.prix_centimes) : '—'}
      />
      <Ligne
        libelle="Acompte"
        valeur={commande.acompte_centimes != null ? formatEuros(commande.acompte_centimes) : '—'}
      />
      {reste != null ? <Ligne libelle="Reste à payer" valeur={formatEuros(reste)} /> : null}
      <Ligne libelle="Prise par" valeur={commande.cree_par_prenom} />
      {commande.fabricant_prenom ? (
        <Ligne libelle="Faite par" valeur={commande.fabricant_prenom} />
      ) : null}
      {commande.recue_le ? <Ligne libelle="Réception" valeur={libelleRecueA(commande.recue_le)} /> : null}
      {commande.recuperee_le ? (
        <Ligne libelle="Récupérée" valeur={libelleRecueA(commande.recuperee_le)} />
      ) : null}
    </View>
  );
}

function Etiquette({ statut }: { statut: CommandeEnrichie['statut'] }) {
  const couleur =
    statut === 'prete'
      ? couleurs.succes
      : statut === 'recue'
        ? couleurs.crouteFonce
        : statut === 'annulee'
          ? couleurs.erreur
          : statut === 'recuperee'
            ? couleurs.texteSecondaire
            : couleurs.principal;
  return (
    <View style={[styles.etiquette, { borderColor: couleur }]}>
      <Text style={[styles.etiquetteTexte, { color: couleur }]}>{libelleStatut(statut)}</Text>
    </View>
  );
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <View style={styles.ligne}>
      <Text style={styles.libelle}>{libelle}</Text>
      <Text style={styles.valeur}>{valeur}</Text>
    </View>
  );
}

export function LienDanger({
  titre,
  onPress,
  desactive,
}: {
  titre: string;
  onPress: () => void;
  desactive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="button"
      style={({ pressed }) => [styles.lienDanger, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.lienDangerTexte}>{titre}</Text>
    </Pressable>
  );
}

export function LienSecondaire({
  titre,
  onPress,
  desactive,
}: {
  titre: string;
  onPress: () => void;
  desactive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="button"
      style={({ pressed }) => [styles.lienSec, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.lienSecTexte}>{titre}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bloc: {
    gap: espacements.m,
  },
  gateau: {
    fontSize: tailles.grand,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  etiquette: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  etiquetteTexte: {
    fontSize: tailles.petit,
    fontFamily: polices.sans,
  },
  nonRecue: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
  ligne: {
    gap: 2,
  },
  libelle: {
    ...styleTitreSection,
    marginBottom: 0,
  },
  valeur: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  lienDanger: {
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lienDangerTexte: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
  lienSec: {
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lienSecTexte: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
});
