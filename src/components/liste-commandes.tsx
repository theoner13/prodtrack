import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CommandeEnrichie } from '@/api/commandes';
import { libelleStatut } from '@/api/commandes';
import {
  FILTRES_STATUT,
  formatHeureRetrait,
  libelleGroupeJour,
  libelleNonRecueSignalee,
  regrouperParJour,
  type FiltreStatutCommandes,
} from '@/lib/commandes';
import { aujourdhuiParis } from '@/lib/format';
import {
  couleurs,
  espacements,
  polices,
  rayonPilule,
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
  /** Pâtissier : mentions « Retrait à … » sur la ligne secondaire. */
  afficherRetraitBoutique?: boolean;
};

export function ListeCommandesGroupees({
  commandes,
  onOuvrir,
  afficherRetraitBoutique = false,
}: PropsListe) {
  const groupes = regrouperParJour(commandes, aujourdhuiParis());
  return (
    <View style={styles.liste}>
      {groupes.map((groupe) => (
        <View key={groupe.cle} style={styles.groupe}>
          <Text style={[styles.titreGroupe, stickyWeb]}>
            {groupe.libelle} · {groupe.commandes.length}
          </Text>
          {groupe.commandes.map((c) => (
            <LigneCommande
              key={c.id}
              commande={c}
              onPress={() => onOuvrir(c.id)}
              afficherRetraitBoutique={afficherRetraitBoutique}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function LigneCommande({
  commande,
  onPress,
  afficherRetraitBoutique = false,
}: {
  commande: CommandeEnrichie;
  onPress: () => void;
  afficherRetraitBoutique?: boolean;
}) {
  const heure = formatHeureRetrait(commande.retrait_le);
  const jour = libelleGroupeJour(commande.retrait_le);
  const statut = libelleStatut(commande.statut);
  const labelAccessibilite = `Commande ${commande.gateau}, ${commande.nb_parts} parts, retrait ${jour} à ${heure}, ${statut}`;
  const autreBoutique =
    !afficherRetraitBoutique &&
    commande.boutique_fabrication_id !== commande.boutique_retrait_id;
  const ligneSecondaire = afficherRetraitBoutique
    ? `${commande.client_nom} · Retrait ${commande.boutique_retrait_nom}`
    : commande.client_nom;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.ligne, pressed && styles.ligneAppuyee]}
      accessibilityRole="button"
      accessibilityLabel={labelAccessibilite}
    >
      <View style={styles.heureBloc} accessible={false}>
        <Text style={styles.heure}>{heure}</Text>
        {commande.non_recue_signalee_le ? (
          <View
            style={styles.pointNonRecue}
            accessibilityLabel={libelleNonRecueSignalee(commande.non_recue_signalee_le)}
          />
        ) : null}
      </View>

      <View style={styles.ligneCorps} accessible={false}>
        <View style={styles.ligneGateau}>
          {autreBoutique ? (
            <Ionicons
              name="storefront-outline"
              size={14}
              color={couleurs.texteSecondaire}
              accessibilityLabel={`Fabriquée à ${commande.boutique_fabrication_nom}`}
              style={styles.iconeBoutique}
            />
          ) : null}
          <Text style={styles.gateau} numberOfLines={1}>
            {commande.gateau} · {commande.nb_parts} parts
          </Text>
        </View>
        <Text style={styles.client} numberOfLines={1}>
          {ligneSecondaire}
        </Text>
      </View>

      <View style={styles.ligneDroite} accessible={false}>
        <PastilleStatut statut={commande.statut} />
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

export function PastilleStatut({ statut }: { statut: StatutCommande }) {
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

const stickyWeb =
  Platform.OS === 'web'
    ? ({ position: 'sticky' as const, top: 0, zIndex: 1 } as const)
    : undefined;

const styles = StyleSheet.create({
  filtres: {
    gap: espacements.s,
    marginBottom: espacements.m,
  },
  puces: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  puce: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: rayonPilule,
    backgroundColor: couleurs.fondPuce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puceActive: {
    backgroundColor: couleurs.principal,
  },
  puceTexte: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  puceTexteActive: {
    color: couleurs.texteSurPrincipal,
    fontWeight: '500',
  },
  liste: {
    gap: espacements.s,
  },
  groupe: {
    gap: 0,
  },
  titreGroupe: {
    ...styleTitreSection,
    backgroundColor: couleurs.fond,
    paddingVertical: 6,
    marginBottom: 0,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
    minHeight: 56,
  },
  ligneAppuyee: {
    opacity: 0.7,
  },
  heureBloc: {
    width: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heure: {
    fontSize: tailles.normal,
    fontWeight: '700',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  pointNonRecue: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: couleurs.erreur,
  },
  ligneCorps: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  ligneGateau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  iconeBoutique: {
    flexShrink: 0,
  },
  gateau: {
    flex: 1,
    fontSize: tailles.normal,
    fontWeight: '500',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  client: {
    fontSize: 12,
    color: couleurs.texteMuet,
    fontFamily: polices.sans,
  },
  ligneDroite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  pastille: {
    borderRadius: rayonPilule,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pastilleTexte: {
    fontSize: 11,
    fontFamily: polices.sans,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 18,
    color: couleurs.texteMuet,
    fontFamily: polices.sans,
    lineHeight: 20,
  },
});
