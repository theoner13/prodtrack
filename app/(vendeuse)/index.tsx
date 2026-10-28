import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useUrlsSignees } from '@/api/photos';
import { useProduits, type ProduitListe } from '@/api/produits';
import {
  useEnregistrerVentes,
  useSaisiesDuJour,
  type LigneSaisie,
} from '@/api/ventes';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { CarteProduit } from '@/components/carte-produit';
import { Compteur } from '@/components/compteur';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import {
  aujourdhuiParis,
  formatJourComplet,
  jourPrecedent,
} from '@/lib/format';
import { couleurs, espacements, tailles } from '@/theme';

type ValeursProduit = { vendu: number; jete: number; reste: number };

const LARGEUR_TABLETTE = 700;

function jourAutorise(valeur: string | undefined, aujourdhui: string, hier: string): string {
  if (valeur === aujourdhui || valeur === hier) return valeur;
  return aujourdhui;
}

function majusculeInitiale(texte: string): string {
  if (!texte) return texte;
  return texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);
}

export default function EcranFinDeJournee() {
  const { profil, verrouillerApresSaisie } = useAuth();
  const boutiqueId = profil?.boutique_id ?? null;
  const { width } = useWindowDimensions();
  const etroit = width < LARGEUR_TABLETTE;

  const params = useLocalSearchParams<{ jour?: string }>();
  const aujourdhui = aujourdhuiParis();
  const hier = jourPrecedent(aujourdhui);
  const jourUrl = typeof params.jour === 'string' ? params.jour : undefined;

  const [jour, setJour] = useState(() => jourAutorise(jourUrl, aujourdhui, hier));
  const [valeurs, setValeurs] = useState<Record<string, ValeursProduit>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [typeMessage, setTypeMessage] = useState<'succes' | 'erreur'>('succes');

  const produits = useProduits(boutiqueId);
  const saisies = useSaisiesDuJour(boutiqueId, jour);
  const enregistrer = useEnregistrerVentes();

  useEffect(() => {
    setJour(jourAutorise(jourUrl, aujourdhui, hier));
  }, [jourUrl, aujourdhui, hier]);

  const saisiesParProduit = useMemo(() => {
    const map = new Map<string, ValeursProduit & { id: string }>();
    for (const ligne of saisies.data ?? []) {
      map.set(ligne.produit_id, {
        id: ligne.id,
        vendu: ligne.vendu,
        jete: ligne.jete,
        reste: ligne.reste,
      });
    }
    return map;
  }, [saisies.data]);

  const listeVendables = useMemo(
    () => (produits.data ?? []).filter((produit) => !produit.intermediaire),
    [produits.data],
  );

  useEffect(() => {
    if (!produits.data || !saisies.data) return;
    const prochaines: Record<string, ValeursProduit> = {};
    for (const produit of listeVendables) {
      const existante = saisiesParProduit.get(produit.id);
      prochaines[produit.id] = {
        vendu: existante?.vendu ?? 0,
        jete: existante?.jete ?? 0,
        reste: existante?.reste ?? 0,
      };
    }
    setValeurs(prochaines);
  }, [jour, produits.data, saisies.data, saisiesParProduit, listeVendables]);

  const chemins = listeVendables
    .map((produit) => produit.photo_url)
    .filter((chemin): chemin is string => Boolean(chemin));
  const photos = useUrlsSignees(chemins);

  const fermerMessage = useCallback(() => setMessage(null), []);

  const lignesAEnvoyer = useMemo((): LigneSaisie[] => {
    return listeVendables
      .map((produit) => {
        const v = valeurs[produit.id] ?? { vendu: 0, jete: 0, reste: 0 };
        return {
          produit_id: produit.id,
          jour,
          vendu: v.vendu,
          jete: v.jete,
          reste: v.reste,
        };
      })
      .filter((ligne) => {
        const deja = saisiesParProduit.has(ligne.produit_id);
        return deja || ligne.vendu > 0 || ligne.jete > 0 || ligne.reste > 0;
      });
  }, [listeVendables, valeurs, jour, saisiesParProduit]);

  const nombreModifications = useMemo(() => {
    let count = 0;
    for (const produit of listeVendables) {
      const v = valeurs[produit.id] ?? { vendu: 0, jete: 0, reste: 0 };
      const existante = saisiesParProduit.get(produit.id);
      if (existante) {
        if (
          v.vendu !== existante.vendu ||
          v.jete !== existante.jete ||
          v.reste !== existante.reste
        ) {
          count += 1;
        }
      } else if (v.vendu > 0 || v.jete > 0 || v.reste > 0) {
        count += 1;
      }
    }
    return count;
  }, [listeVendables, valeurs, saisiesParProduit]);

  const texteModifications =
    nombreModifications === 0
      ? null
      : nombreModifications === 1
        ? 'Modifications non enregistrées : 1 produit'
        : `Modifications non enregistrées : ${nombreModifications} produits`;

  async function rafraichir() {
    await Promise.all([produits.refetch(), saisies.refetch()]);
  }

  function definirValeur(
    produitId: string,
    champ: keyof ValeursProduit,
    valeur: number,
  ) {
    setValeurs((actuel) => ({
      ...actuel,
      [produitId]: {
        vendu: actuel[produitId]?.vendu ?? 0,
        jete: actuel[produitId]?.jete ?? 0,
        reste: actuel[produitId]?.reste ?? 0,
        [champ]: valeur,
      },
    }));
  }

  async function soumettre() {
    if (lignesAEnvoyer.length === 0) {
      setTypeMessage('erreur');
      setMessage('Indiquez au moins une quantité.');
      return;
    }

    try {
      const nombre = await enregistrer.mutateAsync(lignesAEnvoyer);
      setTypeMessage('succes');
      setMessage(
        nombre === 1
          ? `1 produit enregistré pour le ${formatJourComplet(jour)}.`
          : `${nombre} produits enregistrés pour le ${formatJourComplet(jour)}.`,
      );
      verrouillerApresSaisie();
    } catch (erreur) {
      setTypeMessage('erreur');
      setMessage(messageErreur(erreur));
    }
  }

  const chargement = produits.isLoading || saisies.isLoading;
  const erreur = produits.error ?? saisies.error;

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

  const liste = listeVendables;

  return (
    <Ecran
      defilement
      enRafraichissement={produits.isRefetching || saisies.isRefetching}
      onRafraichir={() => void rafraichir()}
      pied={
        liste.length > 0 ? (
          <>
            {texteModifications ? (
              <Text style={styles.confirmation}>{texteModifications}</Text>
            ) : null}
            <Banniere message={message} type={typeMessage} onFermer={fermerMessage} duree={5000} />
            <Bouton
              titre="Enregistrer la journée"
              onPress={() => void soumettre()}
              chargement={enregistrer.isPending}
            />
          </>
        ) : undefined
      }
    >
      <Text style={styles.date}>{majusculeInitiale(formatJourComplet(jour))}</Text>
      <View style={styles.choixJour}>
        <View style={styles.choixBouton}>
          <Bouton
            titre="Aujourd'hui"
            variante={jour === aujourdhui ? 'principal' : 'secondaire'}
            onPress={() => {
              setJour(aujourdhui);
              router.setParams({ jour: aujourdhui });
            }}
          />
        </View>
        <View style={styles.choixBouton}>
          <Bouton
            titre="Hier"
            variante={jour === hier ? 'principal' : 'secondaire'}
            onPress={() => {
              setJour(hier);
              router.setParams({ jour: hier });
            }}
          />
        </View>
      </View>

      {liste.length === 0 ? (
        <EtatVide message="Aucun produit dans cette boutique pour l'instant." />
      ) : null}

      {liste.map((produit) => (
        <LigneVente
          key={produit.id}
          produit={produit}
          photoUrl={produit.photo_url ? photos.data?.[produit.photo_url] : null}
          valeurs={valeurs[produit.id] ?? { vendu: 0, jete: 0, reste: 0 }}
          dejaEnregistre={saisiesParProduit.has(produit.id)}
          etroit={etroit}
          onChange={(champ, valeur) => definirValeur(produit.id, champ, valeur)}
        />
      ))}
    </Ecran>
  );
}

function LigneVente({
  produit,
  photoUrl,
  valeurs,
  dejaEnregistre,
  etroit,
  onChange,
}: {
  produit: ProduitListe;
  photoUrl?: string | null;
  valeurs: ValeursProduit;
  dejaEnregistre: boolean;
  etroit: boolean;
  onChange: (champ: keyof ValeursProduit, valeur: number) => void;
}) {
  const compteurs = (
    <View style={etroit ? styles.compteursEtroit : styles.compteursLarge}>
      <ChampCompteur
        etiquette="Vendu"
        libelle={`Vendu ${produit.nom}`}
        valeur={valeurs.vendu}
        etroit={etroit}
        onChange={(valeur) => onChange('vendu', valeur)}
      />
      <ChampCompteur
        etiquette="Jeté"
        libelle={`Jeté ${produit.nom}`}
        valeur={valeurs.jete}
        etroit={etroit}
        onChange={(valeur) => onChange('jete', valeur)}
      />
      <ChampCompteur
        etiquette="Reste"
        libelle={`Reste ${produit.nom}`}
        valeur={valeurs.reste}
        etroit={etroit}
        onChange={(valeur) => onChange('reste', valeur)}
      />
    </View>
  );

  return (
    <CarteProduit
      nom={produit.nom}
      photoUrl={photoUrl}
      sousTitre={dejaEnregistre ? 'Déjà enregistré' : undefined}
      sousLigne={<View style={styles.sousLignePleine}>{compteurs}</View>}
    />
  );
}

function ChampCompteur({
  etiquette,
  libelle,
  valeur,
  etroit,
  onChange,
}: {
  etiquette: string;
  libelle: string;
  valeur: number;
  etroit: boolean;
  onChange: (valeur: number) => void;
}) {
  if (etroit) {
    return (
      <View style={styles.ligneEtroit}>
        <Text style={styles.etiquette}>{etiquette}</Text>
        <Compteur valeur={valeur} onChange={onChange} libelle={libelle} compact />
      </View>
    );
  }

  return (
    <View style={styles.colonneLarge}>
      <Text style={styles.etiquetteCentre}>{etiquette}</Text>
      <Compteur valeur={valeur} onChange={onChange} libelle={libelle} compact />
    </View>
  );
}

const styles = StyleSheet.create({
  date: {
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.texte,
  },
  choixJour: {
    flexDirection: 'row',
    gap: espacements.s,
  },
  choixBouton: {
    flex: 1,
  },
  sousLignePleine: {
    alignSelf: 'stretch',
    width: '100%',
  },
  compteursEtroit: {
    gap: espacements.s,
  },
  compteursLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espacements.s,
  },
  ligneEtroit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacements.m,
  },
  colonneLarge: {
    flex: 1,
    alignItems: 'center',
    gap: espacements.xs,
  },
  etiquette: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
    minWidth: 56,
  },
  etiquetteCentre: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texte,
    textAlign: 'center',
  },
  confirmation: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
  },
});
