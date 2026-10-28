import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  libelleMotifCourt,
  useAnnulerPerte,
  useDeclarerPerte,
  useMesPertesDuJour,
  type MotifPerte,
} from '@/api/pertes';
import { useUrlsSignees } from '@/api/photos';
import { useProduits, type ProduitListe } from '@/api/produits';
import {
  useAnnulerMouvement,
  useEnregistrerMouvements,
  useMesMouvementsDuJour,
  useStock,
} from '@/api/stock';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { CarteProduit } from '@/components/carte-produit';
import { Champ } from '@/components/champ';
import { Compteur } from '@/components/compteur';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { couleurs, espacements, rayon, tailles } from '@/theme';

type Props = {
  type: 'production' | 'sortie';
};

type CibleAnnulation =
  | { kind: 'mouvement'; id: string; quantite: number }
  | { kind: 'perte'; id: string; quantite: number; dansLeStock: boolean };

const MOTIFS: { id: MotifPerte; libelle: string }[] = [
  { id: 'brule', libelle: 'Brûlé' },
  { id: 'tombe', libelle: 'Tombé ou abîmé' },
  { id: 'rate', libelle: 'Raté' },
  { id: 'autre', libelle: 'Autre' },
];

function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatHeure(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
}

export function SaisieStock({ type }: Props) {
  const { profil, verrouillerApresSaisie } = useAuth();
  const boutiqueId = profil?.boutique_id ?? null;
  const userId = profil?.id ?? null;

  const produits = useProduits(boutiqueId);
  const stock = useStock(boutiqueId);
  const mouvements = useMesMouvementsDuJour(userId, type);
  const pertes = useMesPertesDuJour(type === 'sortie' ? userId : null);
  const enregistrer = useEnregistrerMouvements();
  const declarerPerte = useDeclarerPerte();
  const annuler = useAnnulerMouvement();
  const annulerPerte = useAnnulerPerte();

  const [quantites, setQuantites] = useState<Record<string, number>>({});
  const [recherche, setRecherche] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [typeMessage, setTypeMessage] = useState<'succes' | 'erreur'>('succes');
  const [aAnnuler, setAAnnuler] = useState<CibleAnnulation | null>(null);

  const [formulairePerteOuvert, setFormulairePerteOuvert] = useState(false);
  const [perteProduitId, setPerteProduitId] = useState<string | null>(null);
  const [perteQuantite, setPerteQuantite] = useState(0);
  const [perteMotif, setPerteMotif] = useState<MotifPerte | null>(null);
  const [perteDansLeStock, setPerteDansLeStock] = useState(false);

  const listeBase = useMemo(() => {
    const tous = produits.data ?? [];
    if (type === 'production') {
      return tous.filter(
        (produit) => produit.fabricant_id === userId || produit.intermediaire,
      );
    }
    return tous;
  }, [produits.data, type, userId]);

  const stockParProduit = useMemo(() => {
    const map = new Map<string, number>();
    for (const ligne of stock.data ?? []) {
      if (ligne.produit_id) map.set(ligne.produit_id, ligne.stock ?? 0);
    }
    return map;
  }, [stock.data]);

  const listeFiltre = useMemo(() => {
    const terme = sansAccents(recherche.trim());
    if (!terme) return listeBase;
    return listeBase.filter((produit) => sansAccents(produit.nom).includes(terme));
  }, [listeBase, recherche]);

  const saisiesDuJour = useMemo(() => {
    type Ligne =
      | {
          kind: 'mouvement';
          id: string;
          quantite: number;
          created_at: string;
          produitNom: string;
        }
      | {
          kind: 'perte';
          id: string;
          quantite: number;
          created_at: string;
          produitNom: string;
          motif: MotifPerte;
          dans_le_stock: boolean;
        };

    const lignes: Ligne[] = (mouvements.data ?? []).map((saisie) => ({
      kind: 'mouvement' as const,
      id: saisie.id,
      quantite: saisie.quantite,
      created_at: saisie.created_at,
      produitNom: saisie.produitNom,
    }));

    if (type === 'sortie') {
      for (const perte of pertes.data ?? []) {
        lignes.push({
          kind: 'perte',
          id: perte.id,
          quantite: perte.quantite,
          created_at: perte.created_at,
          produitNom: perte.produitNom,
          motif: perte.motif,
          dans_le_stock: perte.dans_le_stock,
        });
      }
    }

    return lignes.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [mouvements.data, pertes.data, type]);

  const chemins = listeBase
    .map((produit) => produit.photo_url)
    .filter((chemin): chemin is string => Boolean(chemin));
  const photos = useUrlsSignees(chemins);

  const fermerMessage = useCallback(() => setMessage(null), []);

  function reinitialiserFormulairePerte() {
    setPerteProduitId(null);
    setPerteQuantite(0);
    setPerteMotif(null);
    setPerteDansLeStock(false);
  }

  async function rafraichir() {
    const taches = [produits.refetch(), stock.refetch(), mouvements.refetch()];
    if (type === 'sortie') taches.push(pertes.refetch());
    await Promise.all(taches);
  }

  function definirQuantite(id: string, valeur: number) {
    setQuantites((actuel) => ({ ...actuel, [id]: valeur }));
  }

  async function soumettre() {
    const lignes = listeBase
      .map((produit) => ({
        produitId: produit.id,
        quantite: quantites[produit.id] ?? 0,
        nom: produit.nom,
      }))
      .filter((ligne) => ligne.quantite > 0);

    if (lignes.length === 0) {
      setTypeMessage('erreur');
      setMessage('Indiquez au moins une quantité.');
      return;
    }

    try {
      const confirmation = await enregistrer.mutateAsync({ type, lignes });
      setQuantites({});
      setTypeMessage('succes');
      setMessage(confirmation);
      verrouillerApresSaisie();
    } catch (erreur) {
      setTypeMessage('erreur');
      setMessage(messageErreur(erreur));
    }
  }

  async function soumettrePerte() {
    if (!perteProduitId) {
      setTypeMessage('erreur');
      setMessage('Choisissez un produit.');
      return;
    }
    if (!perteMotif) {
      setTypeMessage('erreur');
      setMessage('Choisissez un motif.');
      return;
    }
    if (perteQuantite <= 0) {
      setTypeMessage('erreur');
      setMessage('Indiquez une quantité perdue.');
      return;
    }

    const produit = listeBase.find((p) => p.id === perteProduitId);
    if (!produit) {
      setTypeMessage('erreur');
      setMessage('Produit introuvable.');
      return;
    }

    try {
      const confirmation = await declarerPerte.mutateAsync({
        produitId: perteProduitId,
        nom: produit.nom,
        quantite: perteQuantite,
        motif: perteMotif,
        dansLeStock: perteDansLeStock,
      });
      reinitialiserFormulairePerte();
      setFormulairePerteOuvert(false);
      setTypeMessage('succes');
      setMessage(confirmation);
      verrouillerApresSaisie();
    } catch (erreur) {
      setTypeMessage('erreur');
      setMessage(messageErreur(erreur));
    }
  }

  async function confirmerAnnulation(cible: CibleAnnulation) {
    try {
      if (cible.kind === 'mouvement') {
        await annuler.mutateAsync(cible.id);
        setMessage('Saisie annulée.');
      } else {
        await annulerPerte.mutateAsync(cible.id);
        setMessage('Perte annulée.');
      }
      setAAnnuler(null);
      setTypeMessage('succes');
    } catch (erreur) {
      setAAnnuler(null);
      setTypeMessage('erreur');
      setMessage(messageErreur(erreur));
    }
  }

  const chargement =
    produits.isLoading ||
    stock.isLoading ||
    mouvements.isLoading ||
    (type === 'sortie' && pertes.isLoading);
  const erreur =
    produits.error ?? stock.error ?? mouvements.error ?? (type === 'sortie' ? pertes.error : null);

  if (chargement) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (erreur) {
    return (
      <Ecran>
        <EtatErreur message={messageErreur(erreur)} onReessayer={() => void rafraichir()} />
      </Ecran>
    );
  }

  const titre = type === 'production' ? 'Production' : 'Sorties';
  const titreBouton =
    type === 'production' ? 'Enregistrer la production' : 'Enregistrer les sorties';
  const messageVide =
    type === 'production'
      ? 'Aucun produit à produire. Ajoutez-en dans l’onglet Mes produits.'
      : 'Aucun produit dans cette boutique.';

  const annulationEnCours = annuler.isPending || annulerPerte.isPending;

  return (
    <Ecran
      titre={titre}
      defilement
      enRafraichissement={
        produits.isRefetching ||
        stock.isRefetching ||
        mouvements.isRefetching ||
        (type === 'sortie' && pertes.isRefetching)
      }
      onRafraichir={() => void rafraichir()}
    >
      {type === 'sortie' ? (
        <Text style={styles.rappel}>
          Le chiffre d'affaires reste attribué au fabricant du produit.
        </Text>
      ) : null}

      {listeBase.length > 10 ? (
        <Champ
          libelle="Rechercher un produit"
          value={recherche}
          onChangeText={setRecherche}
          autoCorrect={false}
          autoCapitalize="none"
        />
      ) : null}

      {listeBase.length === 0 ? <EtatVide message={messageVide} /> : null}

      {listeFiltre.map((produit) => (
        <LigneSaisie
          key={produit.id}
          produit={produit}
          stock={stockParProduit.get(produit.id) ?? 0}
          photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
          quantite={quantites[produit.id] ?? 0}
          onChange={(valeur) => definirQuantite(produit.id, valeur)}
          type={type}
        />
      ))}

      {listeBase.length > 0 ? (
        <>
          {!formulairePerteOuvert ? (
            <Banniere message={message} type={typeMessage} onFermer={fermerMessage} duree={5000} />
          ) : null}
          <Bouton
            titre={titreBouton}
            onPress={() => void soumettre()}
            chargement={enregistrer.isPending}
          />
          {type === 'sortie' ? (
            <>
              <Bouton
                titre="Déclarer une perte"
                variante="secondaire"
                onPress={() => {
                  setFormulairePerteOuvert((ouvert) => {
                    if (ouvert) reinitialiserFormulairePerte();
                    return !ouvert;
                  });
                }}
              />
              {formulairePerteOuvert ? (
                <View style={styles.formulairePerte}>
                  <Text style={styles.label}>Produit</Text>
                  <View style={styles.puces}>
                    {listeBase.map((produit) => (
                      <Pressable
                        key={produit.id}
                        onPress={() => setPerteProduitId(produit.id)}
                        style={[
                          styles.puce,
                          perteProduitId === produit.id && styles.puceActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: perteProduitId === produit.id }}
                      >
                        <Text
                          style={[
                            styles.puceTexte,
                            perteProduitId === produit.id && styles.puceTexteActive,
                          ]}
                        >
                          {produit.nom}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.label}>Quantité perdue</Text>
                  <Compteur
                    valeur={perteQuantite}
                    onChange={setPerteQuantite}
                    libelle="Quantité perdue"
                  />

                  <Text style={styles.label}>Motif</Text>
                  <View style={styles.puces}>
                    {MOTIFS.map((motif) => (
                      <Pressable
                        key={motif.id}
                        onPress={() => setPerteMotif(motif.id)}
                        style={[styles.puce, perteMotif === motif.id && styles.puceActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: perteMotif === motif.id }}
                      >
                        <Text
                          style={[
                            styles.puceTexte,
                            perteMotif === motif.id && styles.puceTexteActive,
                          ]}
                        >
                          {motif.libelle}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => setPerteDansLeStock((v) => !v)}
                    style={styles.case}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: perteDansLeStock }}
                  >
                    <Text style={styles.caseSymbole}>{perteDansLeStock ? '☑' : '☐'}</Text>
                    <Text style={styles.caseTexte}>
                      Ces produits étaient encore dans le stock
                    </Text>
                  </Pressable>
                  <Text style={styles.aideCase}>
                    Laissez décoché si ces produits avaient déjà été sortis : le stock ne change
                    pas.
                  </Text>

                  <Banniere
                    message={message}
                    type={typeMessage}
                    onFermer={fermerMessage}
                    duree={5000}
                  />
                  <Bouton
                    titre="Enregistrer la perte"
                    onPress={() => void soumettrePerte()}
                    chargement={declarerPerte.isPending}
                  />
                </View>
              ) : null}
            </>
          ) : null}
        </>
      ) : message ? (
        <Banniere message={message} type={typeMessage} onFermer={fermerMessage} duree={5000} />
      ) : null}

      <Text style={styles.section}>Mes saisies d'aujourd'hui</Text>

      {saisiesDuJour.length === 0 ? (
        <Text style={styles.vide}>Aucune saisie aujourd'hui.</Text>
      ) : (
        saisiesDuJour.map((saisie) => {
          const cible: CibleAnnulation =
            saisie.kind === 'mouvement'
              ? { kind: 'mouvement', id: saisie.id, quantite: saisie.quantite }
              : {
                  kind: 'perte',
                  id: saisie.id,
                  quantite: saisie.quantite,
                  dansLeStock: saisie.dans_le_stock,
                };
          const ouverte =
            aAnnuler?.kind === cible.kind && aAnnuler.id === cible.id;

          return (
            <View key={`${saisie.kind}-${saisie.id}`} style={styles.saisie}>
              <View style={styles.saisieInfos}>
                <Text style={styles.saisieTexte}>
                  {saisie.kind === 'mouvement'
                    ? `${saisie.quantite} ${saisie.produitNom}`
                    : `${saisie.quantite} ${saisie.produitNom} — perte (${libelleMotifCourt(saisie.motif)})${
                        saisie.dans_le_stock ? ' · retirée du stock' : ''
                      }`}
                </Text>
                <Text style={styles.heure}>{formatHeure(saisie.created_at)}</Text>
              </View>
              {ouverte ? (
                <View style={styles.confirmation}>
                  <Text style={styles.confirmationTexte}>
                    {saisie.kind === 'mouvement'
                      ? `Annuler cette saisie ? Le stock sera corrigé de ${saisie.quantite}.`
                      : saisie.dans_le_stock
                        ? `Annuler cette perte ? Le stock sera corrigé de ${saisie.quantite}.`
                        : 'Annuler cette perte ?'}
                  </Text>
                  <Bouton
                    titre={
                      saisie.kind === 'mouvement'
                        ? 'Oui, annuler la saisie'
                        : 'Oui, annuler la perte'
                    }
                    variante="danger"
                    onPress={() => void confirmerAnnulation(cible)}
                    chargement={annulationEnCours}
                  />
                  <Bouton
                    titre={saisie.kind === 'mouvement' ? 'Non, la garder' : 'Non, la garder'}
                    variante="secondaire"
                    onPress={() => setAAnnuler(null)}
                    desactive={annulationEnCours}
                  />
                </View>
              ) : (
                <Bouton
                  titre="Annuler"
                  variante="secondaire"
                  onPress={() => setAAnnuler(cible)}
                />
              )}
            </View>
          );
        })
      )}
    </Ecran>
  );
}

function LigneSaisie({
  produit,
  stock,
  photoUrl,
  quantite,
  onChange,
  type,
}: {
  produit: ProduitListe;
  stock: number;
  photoUrl?: string | null;
  quantite: number;
  onChange: (valeur: number) => void;
  type: 'production' | 'sortie';
}) {
  const sousTitre =
    type === 'production'
      ? produit.intermediaire
        ? `${produit.fabricantNom} · Stock : ${stock}`
        : `Stock : ${stock}`
      : `${produit.fabricantNom} · Stock : ${stock}`;

  return (
    <CarteProduit
      nom={produit.nom}
      photoUrl={photoUrl}
      sousTitre={sousTitre}
      sousLigne={<Compteur valeur={quantite} onChange={onChange} libelle={produit.nom} />}
    >
      {produit.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
    </CarteProduit>
  );
}

const styles = StyleSheet.create({
  rappel: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  section: {
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.texte,
    marginTop: espacements.s,
  },
  vide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  saisie: {
    gap: espacements.s,
    padding: espacements.m,
    borderRadius: 12,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  saisieInfos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: espacements.m,
  },
  saisieTexte: {
    flex: 1,
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
  },
  heure: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  confirmation: {
    gap: espacements.s,
  },
  confirmationTexte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
  },
  formulairePerte: {
    gap: espacements.m,
    padding: espacements.m,
    borderRadius: 12,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  label: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  puce: {
    minHeight: 44,
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.s,
    borderRadius: rayon,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
    justifyContent: 'center',
  },
  puceActive: {
    borderColor: couleurs.principal,
    backgroundColor: couleurs.principalClair,
  },
  puceTexte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontWeight: '600',
  },
  puceTexteActive: {
    color: couleurs.principalFonce,
  },
  case: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    minHeight: 44,
  },
  caseSymbole: {
    fontSize: tailles.grand,
    color: couleurs.texte,
  },
  caseTexte: {
    flex: 1,
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontWeight: '600',
  },
  aideCase: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  badge: {
    overflow: 'hidden',
    backgroundColor: couleurs.principalClair,
    color: couleurs.principalFonce,
    fontSize: tailles.petit,
    fontWeight: '700',
    paddingHorizontal: espacements.s,
    paddingVertical: espacements.xs,
    borderRadius: rayon,
  },
});
