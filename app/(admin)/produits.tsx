import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { usePatissiers } from '@/api/employes';
import { useModifierProduit, useProduits } from '@/api/produits';
import { useAjusterStock, useStock } from '@/api/stock';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { CarteProduit } from '@/components/carte-produit';
import { Champ } from '@/components/champ';
import { Compteur } from '@/components/compteur';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { FormulaireImposer } from '@/components/formulaire-imposer';
import { eurosVersCentimes } from '@/lib/format';
import { couleurs, espacements, tailles } from '@/theme';

export default function EcranProduits() {
  const boutiques = useBoutiques();
  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [imposer, setImposer] = useState(false);
  const choisi = boutiqueId ?? boutiques.data?.[0]?.id ?? null;
  const produits = useProduits(choisi);
  const stock = useStock(choisi);
  const patissiers = usePatissiers(choisi);
  const modifier = useModifierProduit();
  const ajuster = useAjusterStock();
  const [prixOuvert, setPrixOuvert] = useState<string | null>(null);
  const [saisiePrix, setSaisiePrix] = useState('');
  const [fabricantOuvert, setFabricantOuvert] = useState<string | null>(null);
  const [correctionOuverte, setCorrectionOuverte] = useState<string | null>(null);
  const [stockReel, setStockReel] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const stockParProduit = new Map(
    (stock.data ?? []).map((ligne) => [ligne.produit_id, ligne.stock ?? 0]),
  );

  function reessayer() {
    void boutiques.refetch();
    void produits.refetch();
    void patissiers.refetch();
    void stock.refetch();
  }

  function fermerPanneaux() {
    setPrixOuvert(null);
    setFabricantOuvert(null);
    setCorrectionOuverte(null);
  }

  async function enregistrerPrix(produitId: string) {
    const centimes = eurosVersCentimes(saisiePrix);
    if (centimes === null) {
      setErreur('Indiquez un prix en euros, par exemple 3,50.');
      return;
    }
    setErreur(null);
    try {
      await modifier.mutateAsync({ id: produitId, prixCentimes: centimes });
      setPrixOuvert(null);
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    }
  }

  async function choisirFabricant(produitId: string, fabricantId: string) {
    setErreur(null);
    try {
      await modifier.mutateAsync({ id: produitId, fabricantId });
      setFabricantOuvert(null);
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    }
  }

  async function enregistrerCorrection(produitId: string, nom: string, actuel: number) {
    setErreur(null);
    setConfirmation(null);
    try {
      const message = await ajuster.mutateAsync({
        produitId,
        nom,
        stockActuel: actuel,
        stockReel,
      });
      setConfirmation(message);
      setCorrectionOuverte(null);
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    }
  }

  if (imposer && choisi) {
    return (
      <Ecran titre="Produits" defilement>
        <FormulaireImposer
          boutiqueInitialeId={choisi}
          onTermine={() => setImposer(false)}
          onAnnuler={() => setImposer(false)}
        />
      </Ecran>
    );
  }

  const chargement =
    boutiques.isLoading || (choisi !== null && (produits.isLoading || stock.isLoading));

  return (
    <Ecran titre="Produits" defilement>
      {boutiques.data && boutiques.data.length > 0 ? (
        <>
          <Text style={styles.libelle}>Boutique</Text>
          {boutiques.data.map((boutique) => (
            <Bouton
              key={boutique.id}
              titre={boutique.nom}
              variante={(choisi ?? boutiques.data[0]?.id) === boutique.id ? 'principal' : 'secondaire'}
              onPress={() => {
                setBoutiqueId(boutique.id);
                fermerPanneaux();
              }}
            />
          ))}
          <Bouton titre="Imposer un produit" onPress={() => setImposer(true)} />
        </>
      ) : null}
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      {confirmation ? <Text style={styles.ok}>{confirmation}</Text> : null}
      {chargement ? <EtatChargement /> : null}
      {boutiques.isError || produits.isError || stock.isError ? (
        <EtatErreur
          message={messageErreur(boutiques.error ?? produits.error ?? stock.error)}
          onReessayer={reessayer}
        />
      ) : null}
      {!chargement && boutiques.data?.length === 0 ? (
        <EtatVide message="Créez d’abord une boutique dans l’onglet Boutiques." />
      ) : null}
      {!chargement && choisi && produits.data?.length === 0 ? (
        <EtatVide message="Aucun produit dans cette boutique. Imposer un produit, ou demander au pâtissier d’ajouter les siens." />
      ) : null}
      {produits.data?.map((produit) => {
        const actuel = stockParProduit.get(produit.id) ?? 0;
        return (
          <View key={produit.id} style={styles.bloc}>
            <CarteProduit
              nom={produit.nom}
              prixCentimes={produit.intermediaire ? undefined : produit.prix_centimes}
              sousTitre={produit.fabricantNom}
            >
              {produit.intermediaire ? <Text style={styles.badge}>Intermédiaire</Text> : null}
              {produit.impose_par_admin ? <Text style={styles.badge}>Imposé</Text> : null}
            </CarteProduit>
            {!produit.intermediaire && prixOuvert === produit.id ? (
              <>
                <Champ
                  libelle="Nouveau prix (€)"
                  keyboardType="decimal-pad"
                  value={saisiePrix}
                  onChangeText={setSaisiePrix}
                />
                <Bouton
                  titre="Enregistrer le prix"
                  chargement={modifier.isPending}
                  onPress={() => void enregistrerPrix(produit.id)}
                />
                <Bouton titre="Annuler" variante="secondaire" onPress={() => setPrixOuvert(null)} />
              </>
            ) : !produit.intermediaire ? (
              <Bouton
                titre="Modifier le prix"
                variante="secondaire"
                onPress={() => {
                  setPrixOuvert(produit.id);
                  setFabricantOuvert(null);
                  setCorrectionOuverte(null);
                  setSaisiePrix((produit.prix_centimes / 100).toFixed(2).replace('.', ','));
                }}
              />
            ) : null}
            {fabricantOuvert === produit.id ? (
              <>
                <Text style={styles.libelle}>Nouveau fabricant</Text>
                {(patissiers.data ?? []).length === 0 ? (
                  <Text style={styles.erreur}>Aucun pâtissier actif dans cette boutique.</Text>
                ) : (
                  patissiers.data?.map((personne) => (
                    <Bouton
                      key={personne.id}
                      titre={`${personne.prenom} ${personne.nom}`}
                      variante={personne.id === produit.fabricant_id ? 'principal' : 'secondaire'}
                      chargement={modifier.isPending}
                      onPress={() => void choisirFabricant(produit.id, personne.id)}
                    />
                  ))
                )}
                <Bouton titre="Annuler" variante="secondaire" onPress={() => setFabricantOuvert(null)} />
              </>
            ) : (
              <Bouton
                titre="Réattribuer le fabricant"
                variante="secondaire"
                onPress={() => {
                  setFabricantOuvert(produit.id);
                  setPrixOuvert(null);
                  setCorrectionOuverte(null);
                }}
              />
            )}
            {correctionOuverte === produit.id ? (
              <>
                <Text style={styles.libelle}>Stock actuel : {actuel}</Text>
                <Text style={styles.libelle}>Stock réel compté</Text>
                <Compteur
                  valeur={stockReel}
                  onChange={setStockReel}
                  libelle={`Stock réel de ${produit.nom}`}
                />
                <Bouton
                  titre="Enregistrer la correction"
                  chargement={ajuster.isPending}
                  onPress={() => void enregistrerCorrection(produit.id, produit.nom, actuel)}
                />
                <Bouton
                  titre="Annuler"
                  variante="secondaire"
                  onPress={() => setCorrectionOuverte(null)}
                />
              </>
            ) : (
              <Bouton
                titre="Corriger le stock"
                variante="secondaire"
                onPress={() => {
                  setCorrectionOuverte(produit.id);
                  setPrixOuvert(null);
                  setFabricantOuvert(null);
                  setStockReel(actuel);
                  setConfirmation(null);
                }}
              />
            )}
          </View>
        );
      })}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  libelle: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
  },
  bloc: {
    gap: espacements.s,
  },
  badge: {
    overflow: 'hidden',
    backgroundColor: couleurs.principalClair,
    color: couleurs.principalFonce,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: espacements.s,
    paddingVertical: 2,
    borderRadius: 8,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
  ok: {
    fontSize: tailles.normal,
    color: couleurs.succes,
  },
});
