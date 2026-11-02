import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CommandeEnrichie } from '@/api/commandes';
import { PastilleStatut } from '@/components/liste-commandes';
import {
  formatHeureRetrait,
  formatRetraitComplet,
  libelleDansCombien,
  libelleJourFiche,
  libelleNonRecueSignalee,
  resteAPayerCentimes,
} from '@/lib/commandes';
import { formatEuros } from '@/lib/format';
import {
  couleurs,
  espacements,
  ombres,
  polices,
  rayon,
  styleTitreSection,
  tailles,
} from '@/theme';

type Props = {
  commande: CommandeEnrichie;
  /** Pâtissier : affiche aussi la boutique de prise. */
  afficherBoutiqueRetrait?: boolean;
  /** Bouton principal affiché sous l’en-tête (et l’inscription). */
  actionPrincipale?: ReactNode;
};

export function ContenuFicheCommande({
  commande,
  afficherBoutiqueRetrait = false,
  actionPrincipale,
}: Props) {
  const reste = resteAPayerCentimes(commande.prix_centimes, commande.acompte_centimes);
  const heure = formatHeureRetrait(commande.retrait_le);
  const jour = libelleJourFiche(commande.retrait_le);
  const dansCombien = libelleDansCombien(commande.retrait_le);
  const inscription = commande.inscription?.trim() ?? '';
  const demandes = commande.demandes?.trim() ? commande.demandes : '—';

  return (
    <View style={styles.racine}>
      <View style={styles.entete}>
        <View style={styles.enteteHaut}>
          <View style={styles.enteteGauche}>
            <Text style={styles.heure}>{heure}</Text>
            <Text style={styles.jour}>{jour}</Text>
            {dansCombien ? <Text style={styles.dansCombien}>{dansCombien}</Text> : null}
          </View>
          <PastilleStatut statut={commande.statut} />
        </View>

        <View style={styles.enteteTrait} />

        <View style={styles.enteteGateau}>
          <Text style={styles.gateauTitre}>{commande.gateau}</Text>
          <Text style={styles.gateauParts}>{commande.nb_parts} parts</Text>
        </View>

        {commande.non_recue_signalee_le &&
        (commande.statut === 'a_faire' || commande.statut === 'prete') ? (
          <View style={styles.bandeauNonRecue}>
            <Text style={styles.bandeauNonRecueTexte}>
              {libelleNonRecueSignalee(commande.non_recue_signalee_le)}
            </Text>
          </View>
        ) : null}
      </View>

      {inscription ? (
        <View style={styles.plaque}>
          <Text style={styles.plaqueLegende}>Inscription</Text>
          <Text style={styles.plaqueTexte}>« {inscription} »</Text>
        </View>
      ) : null}

      {actionPrincipale ? <View style={styles.actionPrincipale}>{actionPrincipale}</View> : null}

      <Bloc titre="Client" icone="person-outline">
        <View style={styles.ligne}>
          <Text style={styles.nomClient}>{commande.client_nom}</Text>
          <View style={styles.boutonsClient}>
            <BoutonRond
              icone="call-outline"
              accessibilityLabel={`Appeler ${commande.client_nom}`}
              onPress={() => void Linking.openURL(`tel:${commande.client_telephone}`)}
            />
            {commande.client_email ? (
              <BoutonRond
                icone="mail-outline"
                accessibilityLabel={`Écrire à ${commande.client_nom}`}
                onPress={() => void Linking.openURL(`mailto:${commande.client_email}`)}
              />
            ) : null}
          </View>
        </View>
        <LigneCliquable
          libelle="Téléphone"
          valeur={commande.client_telephone}
          onPress={() => void Linking.openURL(`tel:${commande.client_telephone}`)}
          derniere={!commande.client_email}
        />
        {commande.client_email ? (
          <LigneCliquable
            libelle="Email"
            valeur={commande.client_email}
            onPress={() => void Linking.openURL(`mailto:${commande.client_email}`)}
            derniere
          />
        ) : null}
      </Bloc>

      <Bloc titre="Gâteau" icone="gift-outline">
        <LigneLongue libelle="Demandes" valeur={demandes} />
        {!inscription ? <Ligne libelle="Inscription" valeur="—" /> : null}
        {afficherBoutiqueRetrait ? (
          <Ligne libelle="Retrait à" valeur={commande.boutique_retrait_nom} derniere />
        ) : (
          <Ligne libelle="Fabriquée à" valeur={commande.boutique_fabrication_nom} derniere />
        )}
      </Bloc>

      {commande.prix_centimes != null ? (
        <Bloc titre="Paiement" icone="card-outline">
          <Ligne libelle="Prix" valeur={formatEuros(commande.prix_centimes)} />
          <Ligne
            libelle="Acompte"
            valeur={
              commande.acompte_centimes != null ? formatEuros(commande.acompte_centimes) : '—'
            }
            derniere
          />
          {reste != null ? (
            <>
              <View style={styles.traitPaiement} />
              {reste === 0 ? (
                <Text style={styles.paye}>Payé</Text>
              ) : (
                <View style={[styles.ligne, styles.ligneSansBord]}>
                  <Text style={styles.libelleReste}>Reste à payer</Text>
                  <Text style={styles.valeurReste}>{formatEuros(reste)}</Text>
                </View>
              )}
            </>
          ) : null}
        </Bloc>
      ) : null}

      <Bloc titre="Suivi" icone="time-outline">
        <FriseSuivi commande={commande} />
      </Bloc>
    </View>
  );
}

function FriseSuivi({ commande }: { commande: CommandeEnrichie }) {
  const frise = construireFrise(commande);

  return (
    <View style={styles.frise}>
      {frise.map((etape, index) => (
        <View key={etape.cle} style={styles.friseEtape}>
          <View style={styles.friseColonne}>
            <View
              style={[
                styles.friseRond,
                etape.faite && !etape.annulee && styles.friseRondPlein,
                etape.annulee && styles.friseRondAnnule,
                !etape.faite && !etape.annulee && styles.friseRondVide,
              ]}
            />
            {index < frise.length - 1 ? (
              <View
                style={[
                  styles.friseTrait,
                  etape.faite && !etape.annulee ? styles.friseTraitFait : null,
                ]}
              />
            ) : null}
          </View>
          <Text
            style={[
              styles.friseTexte,
              !etape.faite && !etape.annulee && styles.friseTexteMuet,
              etape.annulee && styles.friseTexteAnnule,
            ]}
          >
            {etape.texte}
          </Text>
        </View>
      ))}
    </View>
  );
}

function construireFrise(commande: CommandeEnrichie): {
  cle: string;
  faite: boolean;
  texte: string;
  annulee?: boolean;
}[] {
  const etapes: {
    cle: string;
    faite: boolean;
    texte: string;
    annulee?: boolean;
  }[] = [
    {
      cle: 'prise',
      faite: true,
      texte: `Prise le ${formatRetraitComplet(commande.cree_le)} par ${commande.cree_par_prenom}`,
    },
  ];

  if (commande.statut === 'annulee') {
    if (commande.prete_le) {
      etapes.push({
        cle: 'prete',
        faite: true,
        texte: `Prête à ${formatHeureRetrait(commande.prete_le)}${
          commande.fabricant_prenom ? ` par ${commande.fabricant_prenom}` : ''
        }`,
      });
    }
    if (commande.recue_le) {
      etapes.push({
        cle: 'recue',
        faite: true,
        texte: `Reçue à ${formatHeureRetrait(commande.recue_le)}`,
      });
    }
    if (commande.recuperee_le) {
      etapes.push({
        cle: 'recuperee',
        faite: true,
        texte: `Récupérée à ${formatHeureRetrait(commande.recuperee_le)}`,
      });
    }
    etapes.push({ cle: 'annulee', faite: true, texte: 'Annulée', annulee: true });
    return etapes;
  }

  etapes.push(
    commande.prete_le
      ? {
          cle: 'prete',
          faite: true,
          texte: `Prête à ${formatHeureRetrait(commande.prete_le)}${
            commande.fabricant_prenom ? ` par ${commande.fabricant_prenom}` : ''
          }`,
        }
      : { cle: 'prete', faite: false, texte: 'Prête' },
  );

  etapes.push(
    commande.recue_le
      ? {
          cle: 'recue',
          faite: true,
          texte: `Reçue à ${formatHeureRetrait(commande.recue_le)}`,
        }
      : { cle: 'recue', faite: false, texte: 'Reçue' },
  );

  etapes.push(
    commande.recuperee_le
      ? {
          cle: 'recuperee',
          faite: true,
          texte: `Récupérée à ${formatHeureRetrait(commande.recuperee_le)}`,
        }
      : { cle: 'recuperee', faite: false, texte: 'Récupérée' },
  );

  return etapes;
}

function Bloc({
  titre,
  icone,
  children,
}: {
  titre: string;
  icone: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}) {
  return (
    <View style={styles.bloc}>
      <View style={styles.blocTitreLigne}>
        <Ionicons name={icone} size={16} color={couleurs.texteSecondaire} />
        <Text style={styles.blocTitre}>{titre}</Text>
      </View>
      <View style={styles.blocCorps}>{children}</View>
    </View>
  );
}

function BoutonRond({
  icone,
  onPress,
  accessibilityLabel,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.boutonRond, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icone} size={16} color={couleurs.principal} />
    </Pressable>
  );
}

function Ligne({
  libelle,
  valeur,
  derniere,
}: {
  libelle: string;
  valeur: string;
  derniere?: boolean;
}) {
  return (
    <View style={[styles.ligne, derniere && styles.ligneSansBord]}>
      <Text style={styles.libelle}>{libelle}</Text>
      <Text style={styles.valeur}>{valeur}</Text>
    </View>
  );
}

function LigneLongue({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <View style={styles.ligneLongue}>
      <Text style={styles.libelle}>{libelle}</Text>
      <Text style={styles.valeurLongue}>{valeur}</Text>
    </View>
  );
}

function LigneCliquable({
  libelle,
  valeur,
  onPress,
  derniere,
}: {
  libelle: string;
  valeur: string;
  onPress: () => void;
  derniere?: boolean;
}) {
  return (
    <View style={[styles.ligne, derniere && styles.ligneSansBord]}>
      <Text style={styles.libelle}>{libelle}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={valeur}
        style={styles.valeurFlex}
      >
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
    gap: espacements.m,
  },
  entete: {
    backgroundColor: couleurs.fondGroupe,
    borderRadius: rayon,
    padding: espacements.m,
    gap: espacements.s,
    ...ombres.douce,
  },
  enteteHaut: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: espacements.s,
  },
  enteteGauche: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  heure: {
    fontSize: tailles.titre,
    fontWeight: '700',
    color: couleurs.texte,
    fontFamily: polices.sans,
    letterSpacing: -0.4,
  },
  jour: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  dansCombien: {
    fontSize: 12,
    color: couleurs.texteMuet,
    fontFamily: polices.sans,
    marginTop: 2,
  },
  enteteTrait: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: couleurs.bordure,
  },
  enteteGateau: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  gateauTitre: {
    fontSize: tailles.grand,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  gateauParts: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  bandeauNonRecue: {
    backgroundColor: couleurs.erreurClair,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bandeauNonRecueTexte: {
    fontSize: 12,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
  plaque: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingVertical: espacements.m,
    paddingHorizontal: espacements.m,
    alignItems: 'center',
    gap: 4,
    backgroundColor: couleurs.surface,
  },
  plaqueLegende: {
    fontSize: 11,
    color: couleurs.texteMuet,
    fontFamily: polices.sans,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  plaqueTexte: {
    fontSize: tailles.normal,
    fontStyle: 'italic',
    color: couleurs.texte,
    fontFamily: polices.sans,
    textAlign: 'center',
  },
  actionPrincipale: {
    marginTop: 0,
  },
  bloc: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    backgroundColor: couleurs.surface,
    padding: espacements.m,
    gap: espacements.s,
  },
  blocTitreLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blocTitre: {
    ...styleTitreSection,
    marginBottom: 0,
  },
  blocCorps: {
    gap: 0,
  },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: espacements.s,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
  },
  ligneSansBord: {
    borderBottomWidth: 0,
  },
  ligneLongue: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
    gap: 4,
  },
  libelle: {
    fontSize: tailles.petit,
    color: couleurs.texteMuet,
    fontFamily: polices.sans,
    flexShrink: 0,
  },
  valeur: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontFamily: polices.sans,
    textAlign: 'right',
    flex: 1,
    flexWrap: 'wrap',
  },
  valeurFlex: {
    flex: 1,
    alignItems: 'flex-end',
  },
  valeurLongue: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  valeurLien: {
    fontSize: tailles.normal,
    color: couleurs.principal,
    fontFamily: polices.sans,
    textDecorationLine: 'underline',
    textAlign: 'right',
  },
  nomClient: {
    fontSize: tailles.normal,
    fontWeight: '700',
    color: couleurs.texte,
    fontFamily: polices.sans,
    flex: 1,
  },
  boutonsClient: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  boutonRond: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fondGroupe,
    alignItems: 'center',
    justifyContent: 'center',
  },
  traitPaiement: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: couleurs.bordure,
    marginVertical: 4,
  },
  libelleReste: {
    fontSize: tailles.normal,
    fontWeight: '700',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  valeurReste: {
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  paye: {
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.succes,
    fontFamily: polices.sans,
    textAlign: 'right',
    paddingVertical: 6,
  },
  frise: {
    gap: 0,
    paddingTop: 4,
  },
  friseEtape: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 36,
  },
  friseColonne: {
    width: 14,
    alignItems: 'center',
  },
  friseRond: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  friseRondPlein: {
    backgroundColor: couleurs.principal,
  },
  friseRondVide: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: couleurs.texteMuet,
  },
  friseRondAnnule: {
    backgroundColor: couleurs.erreur,
  },
  friseTrait: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: couleurs.bordure,
    marginVertical: 2,
  },
  friseTraitFait: {
    backgroundColor: couleurs.principal,
  },
  friseTexte: {
    flex: 1,
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontFamily: polices.sans,
    paddingBottom: 14,
  },
  friseTexteMuet: {
    color: couleurs.texteMuet,
  },
  friseTexteAnnule: {
    color: couleurs.erreur,
    fontWeight: '600',
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
