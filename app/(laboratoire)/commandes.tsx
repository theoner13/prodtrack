import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  useAnnulerCommandeLabo,
  useChangerStatutCommandeLabo,
  useCommandesLabo,
  useCreerCommandeLabo,
  type CommandeLaboEnrichie,
} from '@/api/commandes-labo';
import { useProduits } from '@/api/produits';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { ChoixSegmente } from '@/components/choix-segmente';
import { Compteur } from '@/components/compteur';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { pucesJoursRetrait } from '@/lib/commandes';
import { aujourdhuiParis } from '@/lib/format';
import {
  FILTRES_COMMANDES_LABO,
  libelleStatutCommandeLabo,
  regrouperCommandesLaboParJour,
  statutCommandeLabo,
  type FiltreCommandesLabo,
  type StatutCommandeLabo,
} from '@/lib/laboratoire';
import {
  couleurs,
  espacements,
  ombres,
  polices,
  rayonCarte,
  rayonPilule,
  styleTitreSection,
  tailleToucheMin,
  tailles,
} from '@/theme';

function stylePastilleStatut(statut: StatutCommandeLabo): {
  fond: string;
  texte: string;
} {
  if (statut === 'prete') {
    return { fond: couleurs.accentClair, texte: couleurs.accentFonce };
  }
  if (statut === 'effectuee') {
    return { fond: couleurs.succesClair, texte: couleurs.succes };
  }
  if (statut === 'annulee') {
    return { fond: couleurs.fondPuce, texte: couleurs.texteSecondaire };
  }
  return { fond: couleurs.fondPuce, texte: couleurs.texteSecondaire };
}

export default function EcranCommandesLabo() {
  const { profil } = useAuth();
  const laboratoireId = profil?.boutique_id ?? null;
  const [filtre, setFiltre] = useState<FiltreCommandesLabo>('a_venir');
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [annulerId, setAnnulerId] = useState<string | null>(null);
  const [statutEnCoursId, setStatutEnCoursId] = useState<string | null>(null);
  const [erreurAction, setErreurAction] = useState<string | null>(null);

  const commandes = useCommandesLabo(laboratoireId, filtre);
  const produits = useProduits(laboratoireId);
  const creer = useCreerCommandeLabo();
  const annuler = useAnnulerCommandeLabo();
  const changerStatut = useChangerStatutCommandeLabo();

  const aujourdhui = aujourdhuiParis();
  const [produitId, setProduitId] = useState<string | null>(null);
  const [quantite, setQuantite] = useState(1);
  const [pourLe, setPourLe] = useState(aujourdhui);
  const [client, setClient] = useState('');
  const [note, setNote] = useState('');
  const [erreurForm, setErreurForm] = useState<string | null>(null);

  const jours = useMemo(() => pucesJoursRetrait(aujourdhui, 14), [aujourdhui]);
  const listeProduits = useMemo(
    () => (produits.data ?? []).filter((p) => p.archive_le == null),
    [produits.data],
  );

  const groupes = useMemo(
    () => regrouperCommandesLaboParJour(commandes.data ?? [], aujourdhui),
    [commandes.data, aujourdhui],
  );

  function ouvrirFormulaire() {
    setErreurForm(null);
    setErreurAction(null);
    setProduitId(listeProduits[0]?.id ?? null);
    setQuantite(1);
    setPourLe(aujourdhui);
    setClient('');
    setNote('');
    setFormulaireOuvert(true);
  }

  async function enregistrer() {
    if (!laboratoireId) return;
    if (!produitId) {
      setErreurForm('Choisissez un produit.');
      return;
    }
    if (quantite < 1) {
      setErreurForm('La quantité doit être au moins 1.');
      return;
    }
    setErreurForm(null);
    try {
      await creer.mutateAsync({
        laboratoireId,
        produitId,
        quantite,
        pourLe,
        client,
        note,
      });
      setFormulaireOuvert(false);
    } catch (probleme: unknown) {
      setErreurForm(messageErreur(probleme));
    }
  }

  async function confirmerAnnulation() {
    if (!annulerId) return;
    setErreurAction(null);
    try {
      await annuler.mutateAsync(annulerId);
      setAnnulerId(null);
    } catch (probleme: unknown) {
      setErreurAction(messageErreur(probleme));
    }
  }

  async function appliquerStatut(
    commande: CommandeLaboEnrichie,
    action: 'prete' | 'effectuee' | 'retour',
  ) {
    setErreurAction(null);
    setAnnulerId(null);
    setStatutEnCoursId(commande.id);
    try {
      await changerStatut.mutateAsync({
        id: commande.id,
        action,
        prete_le: commande.prete_le,
        effectuee_le: commande.effectuee_le,
        annulee_le: commande.annulee_le,
      });
    } catch (probleme: unknown) {
      setErreurAction(messageErreur(probleme));
    } finally {
      setStatutEnCoursId(null);
    }
  }

  async function rafraichir() {
    await Promise.all([commandes.refetch(), produits.refetch()]);
  }

  if (commandes.isLoading || produits.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (commandes.isError || produits.isError) {
    return (
      <Ecran>
        <EtatErreur
          message={messageErreur(commandes.error ?? produits.error)}
          onReessayer={() => void rafraichir()}
        />
      </Ecran>
    );
  }

  if (formulaireOuvert) {
    return (
      <Ecran
        defilement
        pied={
          <Bouton
            titre="Enregistrer la commande"
            pleineLargeur
            onPress={() => void enregistrer()}
            chargement={creer.isPending}
            desactive={listeProduits.length === 0}
          />
        }
      >
        <Text style={styles.titreForm}>Nouvelle commande</Text>
        {erreurForm ? <Text style={styles.erreur}>{erreurForm}</Text> : null}

        <View style={styles.carteForm}>
          <Text style={styles.label}>Produit</Text>
          {listeProduits.length === 0 ? (
            <Text style={styles.aide}>Aucun produit au laboratoire pour l’instant.</Text>
          ) : (
            <View style={styles.pucesWrap}>
              {listeProduits.map((p) => {
                const actif = produitId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setProduitId(p.id)}
                    style={[styles.puce, actif && styles.puceActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: actif }}
                  >
                    <Text style={[styles.puceTexte, actif && styles.puceTexteActive]}>
                      {p.nom}
                      {p.fabricantNom ? ` · ${p.fabricantNom}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={styles.label}>Quantité</Text>
          <Compteur valeur={quantite} onChange={setQuantite} libelle="Quantité" />

          <Text style={styles.label}>Jour</Text>
          <View style={styles.bandePuces}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pucesContenu}
            >
              {jours.map((j) => {
                const actif = pourLe === j.jour;
                return (
                  <Pressable
                    key={j.jour}
                    onPress={() => setPourLe(j.jour)}
                    style={[styles.puce, actif && styles.puceActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: actif }}
                  >
                    <Text style={[styles.puceTexte, actif && styles.puceTexteActive]}>
                      {j.libelle}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.carteForm}>
          <Champ
            libelle="Client (facultatif)"
            value={client}
            onChangeText={setClient}
            placeholder="Ex. Hôtel du Port"
            autoCapitalize="words"
          />
          <Champ
            libelle="Note (facultatif)"
            value={note}
            onChangeText={setNote}
            placeholder="Précisions"
            multiline
          />
        </View>

        <Bouton
          titre="Annuler"
          variante="secondaire"
          onPress={() => setFormulaireOuvert(false)}
        />
      </Ecran>
    );
  }

  return (
    <Ecran
      defilement
      pied={<Bouton titre="+ Nouvelle commande" pleineLargeur onPress={ouvrirFormulaire} />}
      enRafraichissement={commandes.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      <ChoixSegmente
        options={FILTRES_COMMANDES_LABO.map((f) => ({
          valeur: f.id,
          libelle: f.libelle,
        }))}
        valeur={filtre}
        onChange={setFiltre}
      />

      {erreurAction ? <Text style={styles.erreur}>{erreurAction}</Text> : null}

      {groupes.length === 0 ? (
        <EtatVide
          message={
            filtre === 'a_venir'
              ? 'Aucune commande à venir.'
              : filtre === 'passees'
                ? 'Aucune commande passée.'
                : 'Aucune commande annulée.'
          }
        />
      ) : null}

      {groupes.map((groupe) => (
        <View key={groupe.cle} style={styles.groupe}>
          <Text style={styles.titreGroupe}>{groupe.libelle}</Text>
          {groupe.commandes.map((c) => {
            const commande = c as CommandeLaboEnrichie;
            const statut = statutCommandeLabo(commande);
            const pastille = stylePastilleStatut(statut);
            const enConfirmation = annulerId === commande.id;
            const enCours = statutEnCoursId === commande.id;
            const peutStatut = filtre !== 'annulees' && statut !== 'annulee';

            return (
              <View key={commande.id} style={styles.carte}>
                <View style={styles.enteteCarte}>
                  <Text style={styles.lignePrincipale}>
                    {commande.quantite} {commande.produit_nom}
                  </Text>
                  <View
                    style={[styles.pastilleStatut, { backgroundColor: pastille.fond }]}
                  >
                    <Text style={[styles.pastilleStatutTexte, { color: pastille.texte }]}>
                      {libelleStatutCommandeLabo(statut)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ligneSecondaire}>
                  {commande.fabricant_nom}
                  {commande.client ? ` · ${commande.client}` : ''}
                </Text>

                {peutStatut ? (
                  <View style={styles.actionsStatut}>
                    {statut === 'a_faire' ? (
                      <Bouton
                        titre="Marquer prête"
                        variante="secondaire"
                        pleineLargeur
                        desactive={enCours}
                        onPress={() => void appliquerStatut(commande, 'prete')}
                      />
                    ) : null}

                    {statut === 'a_faire' || statut === 'prete' ? (
                      <Bouton
                        titre="Marquer effectuée"
                        variante="principal"
                        pleineLargeur
                        desactive={enCours}
                        onPress={() => void appliquerStatut(commande, 'effectuee')}
                      />
                    ) : null}

                    {statut === 'prete' || statut === 'effectuee' ? (
                      <Pressable
                        onPress={() => void appliquerStatut(commande, 'retour')}
                        disabled={enCours}
                        accessibilityRole="button"
                        accessibilityLabel="Annuler ce statut"
                        style={styles.lienStatut}
                      >
                        <Text style={styles.lienStatutTexte}>Annuler ce statut</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {filtre !== 'annulees' && statut === 'a_faire' ? (
                  enConfirmation ? (
                    <View style={styles.confirmation}>
                      <Text style={styles.confirmationTexte}>
                        Annuler cette commande ?
                      </Text>
                      <Bouton
                        titre="Confirmer l’annulation"
                        variante="danger"
                        chargement={annuler.isPending}
                        onPress={() => void confirmerAnnulation()}
                      />
                      <Bouton
                        titre="Garder"
                        variante="secondaire"
                        onPress={() => setAnnulerId(null)}
                      />
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => {
                        setErreurAction(null);
                        setAnnulerId(commande.id);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Annuler la commande"
                      style={styles.lienAnnuler}
                    >
                      <Text style={styles.lienAnnulerTexte}>Annuler</Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carteForm: {
    gap: espacements.m,
    padding: espacements.m,
    borderRadius: rayonCarte,
    backgroundColor: couleurs.surface,
    ...ombres.douce,
    marginBottom: espacements.m,
  },
  titreForm: {
    ...styleTitreSection,
    marginBottom: espacements.s,
  },
  label: {
    fontSize: tailles.legend,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  aide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  pucesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
    padding: espacements.s,
    borderRadius: rayonCarte,
    backgroundColor: couleurs.fondSegment,
    overflow: 'hidden',
  },
  bandePuces: {
    borderRadius: rayonCarte,
    backgroundColor: couleurs.fondSegment,
    overflow: 'hidden',
  },
  pucesContenu: {
    flexDirection: 'row',
    gap: espacements.s,
    padding: espacements.s,
  },
  puce: {
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.s,
    borderRadius: rayonPilule,
    backgroundColor: couleurs.fondPuce,
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
    fontWeight: '600',
  },
  groupe: {
    gap: espacements.s,
    marginBottom: espacements.m,
  },
  titreGroupe: {
    ...styleTitreSection,
  },
  carte: {
    gap: espacements.xs,
    padding: espacements.m,
    borderRadius: rayonCarte,
    backgroundColor: couleurs.surface,
    ...ombres.douce,
  },
  enteteCarte: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacements.s,
  },
  lignePrincipale: {
    flex: 1,
    flexShrink: 1,
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  ligneSecondaire: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  pastilleStatut: {
    flexShrink: 0,
    paddingHorizontal: espacements.s,
    paddingVertical: 4,
    borderRadius: rayonPilule,
  },
  pastilleStatutTexte: {
    fontSize: tailles.petit,
    fontWeight: '600',
    fontFamily: polices.sans,
  },
  actionsStatut: {
    gap: espacements.s,
    marginTop: espacements.s,
  },
  lienStatut: {
    alignSelf: 'flex-start',
    minHeight: tailleToucheMin,
    justifyContent: 'center',
  },
  lienStatutTexte: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  lienAnnuler: {
    alignSelf: 'flex-end',
    minHeight: tailleToucheMin,
    justifyContent: 'center',
    paddingHorizontal: espacements.m,
    borderRadius: rayonPilule,
    backgroundColor: couleurs.erreurClair,
    marginTop: espacements.xs,
  },
  lienAnnulerTexte: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontWeight: '500',
    fontFamily: polices.sans,
  },
  confirmation: {
    gap: espacements.s,
    marginTop: espacements.s,
    padding: espacements.m,
    borderRadius: rayonCarte,
    backgroundColor: couleurs.fondGroupe,
  },
  confirmationTexte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  erreur: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    marginBottom: espacements.s,
    fontFamily: polices.sans,
  },
});
