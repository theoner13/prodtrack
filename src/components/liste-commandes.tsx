import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CommandeEnrichie } from '@/api/commandes';
import { libelleStatut } from '@/api/commandes';
import {
  FILTRES_STATUT,
  formatHeureRetrait,
  libelleNonRecueSignalee,
  regrouperParJour,
  type FiltreStatutCommandes,
} from '@/lib/commandes';
import { aujourdhuiParis } from '@/lib/format';
import {
  couleurs,
  espacements,
  polices,
  rayonPuce,
  styleTitreSection,
  tailles,
} from '@/theme';
import type { StatutCommande } from '@/types/database';

type BoutiqueOption = { id: string; nom: string };

type PropsFiltres = {
  filtreStatut: FiltreStatutCommandes;
  onFiltreStatut: (v: FiltreStatutCommandes) => void;
  /** Si fourni : filtre boutique de fabrication (pâtissier). */
  boutiqueId?: string | null;
  onBoutique?: (id: string | null) => void;
  boutiques?: BoutiqueOption[];
  libelleToutes?: string;
};

export function FiltresCommandes({
  filtreStatut,
  onFiltreStatut,
  boutiqueId,
  onBoutique,
  boutiques,
  libelleToutes = 'Toutes',
}: PropsFiltres) {
  const avecBoutiques = Boolean(onBoutique && boutiques);
  return (
    <View style={styles.filtres}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.puces}>
        {FILTRES_STATUT.map((f) => {
          const actif = filtreStatut === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => onFiltreStatut(f.id)}
              style={[styles.puce, actif && styles.puceActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: actif }}
            >
              <Text style={[styles.puceTexte, actif && styles.puceTexteActive]}>{f.libelle}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {avecBoutiques ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.puces}
        >
          <Pressable
            onPress={() => onBoutique!(null)}
            style={[styles.puce, boutiqueId === null && styles.puceActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: boutiqueId === null }}
          >
            <Text style={[styles.puceTexte, boutiqueId === null && styles.puceTexteActive]}>
              {libelleToutes}
            </Text>
          </Pressable>
          {(boutiques ?? []).map((b) => {
            const actif = boutiqueId === b.id;
            return (
              <Pressable
                key={b.id}
                onPress={() => onBoutique!(b.id)}
                style={[styles.puce, actif && styles.puceActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: actif }}
              >
                <Text style={[styles.puceTexte, actif && styles.puceTexteActive]}>{b.nom}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

type PropsListe = {
  commandes: CommandeEnrichie[];
  onOuvrir: (id: string) => void;
  /** Affiche la boutique de fabrication (vendeuse) ou de retrait (pâtissier hors sa boutique). */
  etiquetteBoutique: 'fabrication' | 'retrait';
};

export function ListeCommandesGroupees({ commandes, onOuvrir, etiquetteBoutique }: PropsListe) {
  const groupes = regrouperParJour(commandes, aujourdhuiParis());
  return (
    <View style={styles.liste}>
      {groupes.map((groupe) => (
        <View key={groupe.cle} style={styles.groupe}>
          <Text style={styles.titreGroupe}>{groupe.libelle}</Text>
          {groupe.commandes.map((c) => (
            <LigneCommande
              key={c.id}
              commande={c}
              onPress={() => onOuvrir(c.id)}
              etiquetteBoutique={etiquetteBoutique}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function LigneCommande({
  commande,
  onPress,
  etiquetteBoutique,
}: {
  commande: CommandeEnrichie;
  onPress: () => void;
  etiquetteBoutique: 'fabrication' | 'retrait';
}) {
  const boutique =
    etiquetteBoutique === 'fabrication'
      ? commande.boutique_fabrication_nom
      : commande.boutique_retrait_nom;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.ligne, pressed && styles.ligneAppuyee]}
      accessibilityRole="button"
      accessibilityLabel={`${commande.gateau}, ${commande.client_nom}`}
    >
      <Text style={styles.heure}>{formatHeureRetrait(commande.retrait_le)}</Text>
      <View style={styles.ligneCorps}>
        <Text style={styles.gateau}>
          {commande.gateau} · {commande.nb_parts} parts
        </Text>
        <Text style={styles.client}>{commande.client_nom}</Text>
        <View style={styles.etiquettes}>
          <EtiquetteStatut statut={commande.statut} />
          <View style={styles.etiquetteBoutique}>
            <Text style={styles.etiquetteBoutiqueTexte}>{boutique}</Text>
          </View>
        </View>
        {commande.non_recue_signalee_le ? (
          <Text style={styles.nonRecue}>
            {libelleNonRecueSignalee(commande.non_recue_signalee_le)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function EtiquetteStatut({ statut }: { statut: StatutCommande }) {
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
    <View style={[styles.etiquetteStatut, { borderColor: couleur }]}>
      <Text style={[styles.etiquetteStatutTexte, { color: couleur }]}>{libelleStatut(statut)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filtres: {
    gap: espacements.s,
    marginBottom: espacements.m,
  },
  puces: {
    flexDirection: 'row',
    gap: espacements.s,
    paddingVertical: 2,
  },
  puce: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: rayonPuce,
    backgroundColor: couleurs.fondPuce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puceActive: {
    backgroundColor: couleurs.principal,
  },
  puceTexte: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  puceTexteActive: {
    color: couleurs.texteSurPrincipal,
    fontWeight: '500',
  },
  liste: {
    gap: espacements.l,
  },
  groupe: {
    gap: 0,
  },
  titreGroupe: {
    ...styleTitreSection,
    marginBottom: espacements.s,
  },
  ligne: {
    flexDirection: 'row',
    gap: espacements.m,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
    minHeight: 56,
  },
  ligneAppuyee: {
    opacity: 0.7,
  },
  heure: {
    width: 52,
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
    paddingTop: 2,
  },
  ligneCorps: {
    flex: 1,
    gap: 4,
  },
  gateau: {
    fontSize: tailles.normal,
    fontWeight: '500',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  client: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  etiquettes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  etiquetteStatut: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  etiquetteStatutTexte: {
    fontSize: 12,
    fontFamily: polices.sans,
  },
  etiquetteBoutique: {
    backgroundColor: couleurs.fondPuce,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  etiquetteBoutiqueTexte: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  nonRecue: {
    fontSize: 12,
    color: couleurs.erreur,
    fontFamily: polices.sans,
    marginTop: 2,
  },
});
