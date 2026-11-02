import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CommandeEnrichie } from '@/api/commandes';
import { libelleStatut } from '@/api/commandes';
import {
  formatHeureRetrait,
  formatRetraitComplet,
  libelleGroupeJour,
  libelleNonRecueSignalee,
  resteAPayerCentimes,
} from '@/lib/commandes';
import { formatEuros } from '@/lib/format';
import { couleurs, espacements, polices, rayonPilule, styleTitreSection, tailles } from '@/theme';

type Props = {
  commande: CommandeEnrichie;
  /** Pâtissier : affiche aussi la boutique de prise. */
  afficherBoutiqueRetrait?: boolean;
};

export function ContenuFicheCommande({
  commande,
  afficherBoutiqueRetrait = false,
}: Props) {
  const reste = resteAPayerCentimes(commande.prix_centimes, commande.acompte_centimes);
  const heure = formatHeureRetrait(commande.retrait_le);
  const jour = libelleGroupeJour(commande.retrait_le);

  return (
    <View style={styles.racine}>
      <View style={styles.entete}>
        <Text style={styles.gateau}>
          {commande.gateau} · {commande.nb_parts} parts
        </Text>
        <Pastille statut={commande.statut} />
        <Text style={styles.retrait}>
          {heure} · {jour}
        </Text>
        {commande.non_recue_signalee_le &&
        (commande.statut === 'a_faire' || commande.statut === 'prete') ? (
          <Text style={styles.nonRecue}>
            {libelleNonRecueSignalee(commande.non_recue_signalee_le)}
          </Text>
        ) : null}
      </View>

      <Bloc titre="Client">
        <Ligne libelle="Nom" valeur={commande.client_nom} />
        <LigneCliquable
          libelle="Téléphone"
          valeur={commande.client_telephone}
          onPress={() => void Linking.openURL(`tel:${commande.client_telephone}`)}
        />
        {commande.client_email ? (
          <LigneCliquable
            libelle="Email"
            valeur={commande.client_email}
            onPress={() => void Linking.openURL(`mailto:${commande.client_email}`)}
          />
        ) : null}
      </Bloc>

      <Bloc titre="Gâteau">
        <Ligne
          libelle="Demandes"
          valeur={commande.demandes?.trim() ? commande.demandes : '—'}
        />
        <Ligne
          libelle="Inscription"
          valeur={commande.inscription?.trim() ? commande.inscription : '—'}
        />
        {afficherBoutiqueRetrait ? (
          <Ligne libelle="Retrait à" valeur={commande.boutique_retrait_nom} />
        ) : (
          <Ligne libelle="Fabriquée à" valeur={commande.boutique_fabrication_nom} />
        )}
      </Bloc>

      {commande.prix_centimes != null ? (
        <Bloc titre="Paiement">
          <Ligne libelle="Prix" valeur={formatEuros(commande.prix_centimes)} />
          <Ligne
            libelle="Acompte"
            valeur={
              commande.acompte_centimes != null ? formatEuros(commande.acompte_centimes) : '—'
            }
          />
          {reste != null ? <Ligne libelle="Reste à payer" valeur={formatEuros(reste)} /> : null}
        </Bloc>
      ) : null}

      <Bloc titre="Suivi">
        <Text style={styles.suiviLigne}>
          Prise le {formatRetraitComplet(commande.cree_le)} par {commande.cree_par_prenom}
        </Text>
        {commande.prete_le ? (
          <Text style={styles.suiviLigne}>
            Prête à {formatHeureRetrait(commande.prete_le)}
            {commande.fabricant_prenom ? ` par ${commande.fabricant_prenom}` : ''}
          </Text>
        ) : null}
        {commande.recue_le ? (
          <Text style={styles.suiviLigne}>
            Reçue à {formatHeureRetrait(commande.recue_le)}
          </Text>
        ) : null}
        {commande.recuperee_le ? (
          <Text style={styles.suiviLigne}>
            Récupérée à {formatHeureRetrait(commande.recuperee_le)}
          </Text>
        ) : null}
      </Bloc>
    </View>
  );
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <View style={styles.bloc}>
      <Text style={styles.blocTitre}>{titre}</Text>
      <View style={styles.blocCorps}>{children}</View>
    </View>
  );
}

function Pastille({ statut }: { statut: CommandeEnrichie['statut'] }) {
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
  const fond =
    statut === 'prete'
      ? couleurs.succesClair
      : statut === 'recue'
        ? couleurs.alerteClair
        : statut === 'annulee'
          ? couleurs.erreurClair
          : statut === 'recuperee'
            ? couleurs.fondPuce
            : couleurs.principalClair;
  return (
    <View style={[styles.pastille, { backgroundColor: fond }]}>
      <Text style={[styles.pastilleTexte, { color: couleur }]}>{libelleStatut(statut)}</Text>
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

function LigneCliquable({
  libelle,
  valeur,
  onPress,
}: {
  libelle: string;
  valeur: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.ligne}>
      <Text style={styles.libelle}>{libelle}</Text>
      <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={valeur}>
        <Text style={styles.valeurLien}>{valeur}</Text>
      </Pressable>
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
  racine: {
    gap: espacements.l,
  },
  entete: {
    gap: 6,
  },
  gateau: {
    fontSize: tailles.grand,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  retrait: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  pastille: {
    alignSelf: 'flex-start',
    borderRadius: rayonPilule,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pastilleTexte: {
    fontSize: 12,
    fontFamily: polices.sans,
    fontWeight: '500',
  },
  nonRecue: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
  bloc: {
    gap: 6,
  },
  blocTitre: {
    ...styleTitreSection,
    marginBottom: 0,
  },
  blocCorps: {
    gap: espacements.s,
  },
  ligne: {
    gap: 1,
  },
  libelle: {
    fontSize: 12,
    color: couleurs.texteMuet,
    fontFamily: polices.sans,
  },
  valeur: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  valeurLien: {
    fontSize: tailles.normal,
    color: couleurs.principal,
    fontFamily: polices.sans,
    textDecorationLine: 'underline',
  },
  suiviLigne: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  lienDanger: {
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lienDangerTexte: {
    fontSize: 13,
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
