import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCommandesLabo } from '@/api/commandes-labo';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { aujourdhuiParis } from '@/lib/format';
import {
  libelleJourCommandeLabo,
  libelleStatutCommandeLabo,
  planningLaboParJour,
  type JourPlanningLabo,
} from '@/lib/laboratoire';
import {
  couleurs,
  espacements,
  ombres,
  polices,
  rayonPuce,
  tailles,
} from '@/theme';

const BORDURE_AUJOURDHUI = '#E6D8C6';
const NB_JOURS_FENETRE = 7;

function ajouterJours(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function initialeJour(jour: string): string {
  const date = new Date(`${jour}T12:00:00Z`);
  const nom = date.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const court = nom.replace(/\./g, '').trim();
  return court.charAt(0).toUpperCase() + court.slice(1);
}

function numeroJour(jour: string): string {
  return String(new Date(`${jour}T12:00:00Z`).getUTCDate());
}

export default function EcranPlanningLabo() {
  const { profil } = useAuth();
  const laboratoireId = profil?.boutique_id ?? null;
  const commandes = useCommandesLabo(laboratoireId, 'a_venir');
  const aujourdhui = aujourdhuiParis();

  const [decalage, setDecalage] = useState(0);
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);

  const planning = useMemo(
    () => planningLaboParJour(commandes.data ?? [], aujourdhui),
    [commandes.data, aujourdhui],
  );

  const parJour = useMemo(() => {
    const map = new Map<string, JourPlanningLabo>();
    for (const jour of planning) map.set(jour.jour, jour);
    return map;
  }, [planning]);

  const joursFenetre = useMemo(
    () =>
      Array.from({ length: NB_JOURS_FENETRE }, (_, i) =>
        ajouterJours(aujourdhui, decalage + i),
      ),
    [aujourdhui, decalage],
  );

  const finFenetre = joursFenetre[joursFenetre.length - 1]!;
  const aJoursSuivants = planning.some((j) => j.jour > finFenetre);

  const jourActif =
    jourSelectionne && joursFenetre.includes(jourSelectionne)
      ? jourSelectionne
      : (joursFenetre[0] ?? aujourdhui);

  const detail = parJour.get(jourActif);
  const totalPieces = detail?.totalPieces ?? 0;

  async function rafraichir() {
    await commandes.refetch();
  }

  if (commandes.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (commandes.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(commandes.error)}
          onReessayer={() => void rafraichir()}
        />
      </Ecran>
    );
  }

  return (
    <Ecran
      defilement
      enRafraichissement={commandes.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bandeJours}
        accessibilityRole="tablist"
      >
        {joursFenetre.map((jour) => {
          const selectionne = jour === jourActif;
          const estAujourdhui = jour === aujourdhui;
          const total = parJour.get(jour)?.totalPieces ?? 0;
          return (
            <Pressable
              key={jour}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectionne }}
              accessibilityLabel={libelleJourCommandeLabo(jour, aujourdhui)}
              onPress={() => setJourSelectionne(jour)}
              style={[
                styles.caseJour,
                selectionne && styles.caseJourActive,
                !selectionne && estAujourdhui && styles.caseJourAujourdhui,
              ]}
            >
              <Text
                style={[
                  styles.caseJourSemaine,
                  selectionne && styles.caseJourSemaineActive,
                ]}
              >
                {initialeJour(jour)}
              </Text>
              <Text
                style={[styles.caseJourNumero, selectionne && styles.caseJourNumeroActive]}
              >
                {numeroJour(jour)}
              </Text>
              {total > 0 ? (
                <View
                  style={[
                    styles.pastille,
                    selectionne && styles.pastilleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pastilleTexte,
                      selectionne && styles.pastilleTexteActive,
                    ]}
                  >
                    {total}
                  </Text>
                </View>
              ) : (
                <View style={styles.pastilleVide} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {(decalage > 0 || aJoursSuivants) && (
        <View style={styles.navSemaine}>
          {decalage > 0 ? (
            <Pressable
              onPress={() => {
                setDecalage((d) => Math.max(0, d - NB_JOURS_FENETRE));
                setJourSelectionne(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Jours précédents"
              style={styles.lienNav}
            >
              <Text style={styles.lienNavTexte}>← Jours précédents</Text>
            </Pressable>
          ) : (
            <View />
          )}
          {aJoursSuivants ? (
            <Pressable
              onPress={() => {
                setDecalage((d) => d + NB_JOURS_FENETRE);
                setJourSelectionne(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Jours suivants"
              style={styles.lienNav}
            >
              <Text style={styles.lienNavTexte}>Jours suivants →</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <Text style={styles.enteteJour}>
        {libelleJourCommandeLabo(jourActif, aujourdhui)}
      </Text>

      {totalPieces > 0 ? (
        <Text style={styles.totalJour}>
          {totalPieces} pièce{totalPieces > 1 ? 's' : ''} au total
        </Text>
      ) : null}

      {!detail || detail.produits.length === 0 ? (
        <EtatVide message="Aucune commande ce jour-là." />
      ) : (
        <View style={styles.liste}>
          {detail.produits.map((produit) => (
            <View key={produit.produitId} style={styles.carte}>
              <Text style={styles.lignePrincipale}>
                {produit.quantite} {produit.produitNom}
              </Text>
              <Text style={styles.fabricant}>{produit.fabricantNom}</Text>
              {produit.clients.map((client) => (
                <View key={client.clientLibelle} style={styles.blocClient}>
                  <View style={styles.ligneClientRang}>
                    <Text style={styles.ligneClient}>
                      {client.quantite} · {client.clientLibelle}
                    </Text>
                    {client.marqueStatut ? (
                      <View
                        style={[
                          styles.marqueStatut,
                          client.marqueStatut === 'effectuee'
                            ? styles.marqueEffectuee
                            : styles.marquePrete,
                        ]}
                      >
                        <Text
                          style={[
                            styles.marqueStatutTexte,
                            client.marqueStatut === 'effectuee'
                              ? styles.marqueEffectueeTexte
                              : styles.marquePreteTexte,
                          ]}
                        >
                          {libelleStatutCommandeLabo(client.marqueStatut)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {client.notes.map((note) => (
                    <Text key={note} style={styles.note}>
                      {note}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bandeJours: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    borderRadius: 22,
    backgroundColor: couleurs.fondSegment,
    marginBottom: espacements.s,
    minWidth: '100%',
  },
  caseJour: {
    width: 48,
    minHeight: 84,
    paddingTop: 9,
    paddingBottom: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  caseJourActive: {
    backgroundColor: couleurs.principal,
    ...ombres.jourActif,
  },
  caseJourAujourdhui: {
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: BORDURE_AUJOURDHUI,
  },
  caseJourSemaine: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  caseJourSemaineActive: {
    color: '#E8D9C6',
  },
  caseJourNumero: {
    fontSize: 19,
    fontWeight: '500',
    letterSpacing: -0.4,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  caseJourNumeroActive: {
    color: couleurs.texteSurPrincipal,
  },
  pastille: {
    minWidth: 22,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: couleurs.croutePoint,
    alignItems: 'center',
  },
  pastilleActive: {
    backgroundColor: '#E9B98C',
  },
  pastilleTexte: {
    fontSize: 10,
    fontWeight: '600',
    color: couleurs.texteSurPrincipal,
    fontFamily: polices.sans,
  },
  pastilleTexteActive: {
    color: couleurs.texte,
  },
  pastilleVide: {
    height: 16,
  },
  navSemaine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacements.s,
    gap: espacements.s,
  },
  lienNav: {
    paddingVertical: espacements.xs,
  },
  lienNavTexte: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.principal,
    fontFamily: polices.sans,
  },
  enteteJour: {
    fontSize: tailles.grand,
    fontWeight: '500',
    color: couleurs.texte,
    marginBottom: espacements.xs,
    letterSpacing: -0.4,
    fontFamily: polices.sans,
  },
  totalJour: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.s,
    fontFamily: polices.sans,
  },
  liste: {
    gap: espacements.m,
  },
  carte: {
    gap: 4,
    paddingVertical: espacements.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
  },
  lignePrincipale: {
    fontSize: tailles.grand,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  fabricant: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginBottom: 4,
    fontFamily: polices.sans,
  },
  blocClient: {
    marginLeft: espacements.m,
    gap: 2,
  },
  ligneClientRang: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  ligneClient: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  marqueStatut: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rayonPuce,
  },
  marquePrete: {
    backgroundColor: couleurs.succesClair,
  },
  marqueEffectuee: {
    backgroundColor: couleurs.principalClair,
  },
  marqueStatutTexte: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: polices.sans,
  },
  marquePreteTexte: {
    color: couleurs.succes,
  },
  marqueEffectueeTexte: {
    color: couleurs.principalFonce,
  },
  note: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginLeft: espacements.s,
    fontFamily: polices.sans,
  },
});
