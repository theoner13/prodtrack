import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
import { couleurs, espacements, tailles } from '@/theme';

type Props = {
  type: 'production' | 'sortie';
};

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
  const { profil } = useAuth();
  const boutiqueId = profil?.boutique_id ?? null;
  const userId = profil?.id ?? null;

  const produits = useProduits(boutiqueId);
  const stock = useStock(boutiqueId);
  const mouvements = useMesMouvementsDuJour(userId, type);
  const enregistrer = useEnregistrerMouvements();
  const annuler = useAnnulerMouvement();

  const [quantites, setQuantites] = useState<Record<string, number>>({});
  const [recherche, setRecherche] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [typeMessage, setTypeMessage] = useState<'succes' | 'erreur'>('succes');
  const [aAnnuler, setAAnnuler] = useState<string | null>(null);

  const listeBase = useMemo(() => {
    const tous = produits.data ?? [];
    if (type === 'production') {
      return tous.filter((produit) => produit.fabricant_id === userId);
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

  const chemins = listeBase
    .map((produit) => produit.photo_url)
    .filter((chemin): chemin is string => Boolean(chemin));
  const photos = useUrlsSignees(chemins);

  const fermerMessage = useCallback(() => setMessage(null), []);

  async function rafraichir() {
    await Promise.all([produits.refetch(), stock.refetch(), mouvements.refetch()]);
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
    } catch (erreur) {
      setTypeMessage('erreur');
      setMessage(messageErreur(erreur));
    }
  }

  async function confirmerAnnulation(id: string) {
    try {
      await annuler.mutateAsync(id);
      setAAnnuler(null);
      setTypeMessage('succes');
      setMessage('Saisie annulée.');
    } catch (erreur) {
      setAAnnuler(null);
      setTypeMessage('erreur');
      setMessage(messageErreur(erreur));
    }
  }

  const chargement = produits.isLoading || stock.isLoading || mouvements.isLoading;
  const erreur = produits.error ?? stock.error ?? mouvements.error;

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

  return (
    <Ecran
      titre={titre}
      defilement
      enRafraichissement={produits.isRefetching || stock.isRefetching || mouvements.isRefetching}
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
          <Banniere message={message} type={typeMessage} onFermer={fermerMessage} duree={5000} />
          <Bouton
            titre={titreBouton}
            onPress={() => void soumettre()}
            chargement={enregistrer.isPending}
          />
        </>
      ) : message ? (
        <Banniere message={message} type={typeMessage} onFermer={fermerMessage} duree={5000} />
      ) : null}

      <Text style={styles.section}>Mes saisies d'aujourd'hui</Text>

      {(mouvements.data ?? []).length === 0 ? (
        <Text style={styles.vide}>Aucune saisie aujourd'hui.</Text>
      ) : (
        (mouvements.data ?? []).map((saisie) => (
          <View key={saisie.id} style={styles.saisie}>
            <View style={styles.saisieInfos}>
              <Text style={styles.saisieTexte}>
                {saisie.quantite} {saisie.produitNom}
              </Text>
              <Text style={styles.heure}>{formatHeure(saisie.created_at)}</Text>
            </View>
            {aAnnuler === saisie.id ? (
              <View style={styles.confirmation}>
                <Text style={styles.confirmationTexte}>
                  Annuler cette saisie ? Le stock sera corrigé de {saisie.quantite}.
                </Text>
                <Bouton
                  titre="Oui, annuler la saisie"
                  variante="danger"
                  onPress={() => void confirmerAnnulation(saisie.id)}
                  chargement={annuler.isPending}
                />
                <Bouton
                  titre="Non, la garder"
                  variante="secondaire"
                  onPress={() => setAAnnuler(null)}
                  desactive={annuler.isPending}
                />
              </View>
            ) : (
              <Bouton
                titre="Annuler"
                variante="secondaire"
                onPress={() => setAAnnuler(saisie.id)}
              />
            )}
          </View>
        ))
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
      ? `Stock : ${stock}`
      : `${produit.fabricantNom} · Stock : ${stock}`;

  return (
    <CarteProduit nom={produit.nom} photoUrl={photoUrl} sousTitre={sousTitre} sousLigne={
      <Compteur valeur={quantite} onChange={onChange} libelle={produit.nom} />
    } />
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
});
