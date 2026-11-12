import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCommandesLabo } from '@/api/commandes-labo';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { CarteHeros } from '@/components/carte-heros';
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
  rayonCarte,
  rayonPilule,
  styleChiffre,
  tailleToucheMin,
  tailles,
} from '@/theme';

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
  const jourVide = !detail || detail.produits.length === 0;

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

  const libelleActif = libelleJourCommandeLabo(jourActif, aujourdhui);

  return (
    <Ecran
      defilement
      enRafraichissement={commandes.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      <View style={styles.bandeJours} accessibilityRole="tablist">
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
              style={({ pressed }) => [
                styles.caseJour,
                selectionne && styles.caseJourActive,
                !selectionne && estAujourdhui && styles.caseJourAujourdhui,
                pressed && styles.appuye,
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
              {estAujourdhui ? (
                <View
                  style={[
                    styles.pointAujourdhui,
                    selectionne && styles.pointAujourdhuiSurActif,
                  ]}
                />
              ) : null}
              {total > 0 ? (
                <View
                  style={[styles.pastille, selectionne && styles.pastilleActive]}
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
      </View>

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

      {jourVide ? (
        <EtatVide message="Aucune commande ce jour-là." />
      ) : (
        <>
          <CarteHeros
            libelle={libelleActif}
            chiffre={totalPieces}
            sousTitre={`${totalPieces} pièce${totalPieces > 1 ? 's' : ''} au total`}
          />
          <View style={styles.liste}>
            {detail!.produits.map((produit) => (
              <View key={produit.produitId} style={[styles.carte, ombres.douce]}>
                <View style={styles.infos}>
                  <Text style={styles.quantiteTitre}>{produit.quantite}</Text>
                  <Text style={styles.nomProduit}>{produit.produitNom}</Text>
                  <Text style={styles.fabricant}>{produit.fabricantNom}</Text>
                </View>
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
        </>
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
    overflow: 'hidden',
  },
  caseJour: {
    flex: 1,
    minHeight: Math.max(84, tailleToucheMin),
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
    backgroundColor: couleurs.surface,
  },
  caseJourSemaine: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  caseJourSemaineActive: {
    color: couleurs.texteSurSombreDoux,
  },
  caseJourNumero: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: couleurs.texte,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
  },
  caseJourNumeroActive: {
    color: couleurs.texteSurPrincipal,
  },
  pointAujourdhui: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: couleurs.accent,
  },
  pointAujourdhuiSurActif: {
    backgroundColor: couleurs.accentClair,
  },
  pastille: {
    minWidth: 22,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: rayonPilule,
    backgroundColor: couleurs.croutePoint,
    alignItems: 'center',
  },
  pastilleActive: {
    backgroundColor: couleurs.croute,
  },
  pastilleTexte: {
    fontSize: 10,
    fontWeight: '600',
    color: couleurs.texteSurPrincipal,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
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
    minHeight: 44,
    justifyContent: 'center',
  },
  lienNavTexte: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.principal,
    fontFamily: polices.sans,
  },
  liste: {
    gap: 10,
  },
  carte: {
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: rayonCarte,
    backgroundColor: couleurs.surface,
  },
  infos: {
    gap: 2,
    minWidth: 0,
  },
  quantiteTitre: {
    ...styleChiffre,
    fontSize: 40,
    letterSpacing: -1,
    color: couleurs.texte,
  },
  nomProduit: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  fabricant: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  blocClient: {
    marginLeft: espacements.s,
    gap: 2,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordureDouce,
  },
  ligneClientRang: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  ligneClient: {
    flexShrink: 1,
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  marqueStatut: {
    flexShrink: 0,
    paddingHorizontal: espacements.s,
    paddingVertical: 4,
    borderRadius: rayonPilule,
  },
  marquePrete: {
    backgroundColor: couleurs.accentClair,
  },
  marqueEffectuee: {
    backgroundColor: couleurs.succesClair,
  },
  marqueStatutTexte: {
    fontSize: tailles.petit,
    fontWeight: '600',
    fontFamily: polices.sans,
  },
  marquePreteTexte: {
    color: couleurs.accentFonce,
  },
  marqueEffectueeTexte: {
    color: couleurs.succes,
  },
  note: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginLeft: espacements.s,
    fontFamily: polices.sans,
  },
  appuye: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
});
