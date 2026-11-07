import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  useAnnulerCommandeLabo,
  useCommandesLabo,
  useCreerCommandeLabo,
} from '@/api/commandes-labo';
import { useProduits } from '@/api/produits';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { Compteur } from '@/components/compteur';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { pucesJoursRetrait } from '@/lib/commandes';
import { aujourdhuiParis } from '@/lib/format';
import {
  FILTRES_COMMANDES_LABO,
  regrouperCommandesLaboParJour,
  type FiltreCommandesLabo,
} from '@/lib/laboratoire';
import {
  couleurs,
  espacements,
  polices,
  rayonPuce,
  styleTitreSection,
  tailles,
} from '@/theme';

export default function EcranCommandesLabo() {
  const { profil } = useAuth();
  const laboratoireId = profil?.boutique_id ?? null;
  const [filtre, setFiltre] = useState<FiltreCommandesLabo>('a_venir');
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [annulerId, setAnnulerId] = useState<string | null>(null);
  const [erreurAction, setErreurAction] = useState<string | null>(null);

  const commandes = useCommandesLabo(laboratoireId, filtre);
  const produits = useProduits(laboratoireId);
  const creer = useCreerCommandeLabo();
  const annuler = useAnnulerCommandeLabo();

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
      <Ecran defilement>
        <Text style={styles.titreForm}>Nouvelle commande</Text>
        {erreurForm ? <Text style={styles.erreur}>{erreurForm}</Text> : null}

        <Text style={styles.label}>Produit</Text>
        {listeProduits.length === 0 ? (
          <Text style={styles.aide}>Aucun produit au laboratoire pour l’instant.</Text>
        ) : (
          <View style={styles.puces}>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.puces}
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

        <Bouton
          titre="Enregistrer la commande"
          onPress={() => void enregistrer()}
          chargement={creer.isPending}
          desactive={listeProduits.length === 0}
        />
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
      enRafraichissement={commandes.isRefetching}
      onRafraichir={() => void rafraichir()}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.puces}
      >
        {FILTRES_COMMANDES_LABO.map((f) => {
          const actif = filtre === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFiltre(f.id)}
              style={[styles.puce, actif && styles.puceActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: actif }}
            >
              <Text style={[styles.puceTexte, actif && styles.puceTexteActive]}>
                {f.libelle}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Bouton titre="+ Nouvelle commande" onPress={ouvrirFormulaire} />

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
            const enConfirmation = annulerId === c.id;
            return (
              <View key={c.id} style={styles.carte}>
                <Text style={styles.lignePrincipale}>
                  {c.quantite} {c.produit_nom}
                </Text>
                <Text style={styles.ligneSecondaire}>
                  {c.fabricant_nom}
                  {c.client ? ` · ${c.client}` : ''}
                </Text>
                {filtre !== 'annulees' && c.annulee_le == null ? (
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
                        setAnnulerId(c.id);
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
  titreForm: {
    ...styleTitreSection,
    marginBottom: espacements.s,
  },
  label: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    marginTop: espacements.s,
    marginBottom: espacements.xs,
    fontFamily: polices.sans,
  },
  aide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
    marginBottom: espacements.s,
  },
  puce: {
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.s,
    borderRadius: rayonPuce,
    backgroundColor: couleurs.fondSegment,
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
    gap: 4,
    paddingVertical: espacements.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
  },
  lignePrincipale: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  ligneSecondaire: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  lienAnnuler: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  lienAnnulerTexte: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontWeight: '600',
  },
  confirmation: {
    gap: espacements.s,
    marginTop: espacements.s,
  },
  confirmationTexte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
  },
  erreur: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    marginBottom: espacements.s,
  },
});
