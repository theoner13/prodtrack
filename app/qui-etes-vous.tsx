import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useUrlsSignees } from '@/api/photos';
import { useAuth } from '@/auth/AuthProvider';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { PaveNumerique } from '@/components/pave-numerique';
import type { CompteAppareil } from '@/lib/comptes-appareil';
import { couleurs, espacements, tailles } from '@/theme';
import type { RoleEmploye } from '@/types/database';

const ROLES: Record<RoleEmploye, string> = {
  admin: 'Admin',
  patissier: 'Pâtissier',
  vendeuse: 'Vente',
};

const LARGEUR_TABLETTE = 700;
const LARGEUR_GRANDE = 1000;

export default function EcranQuiEtesVous() {
  const {
    comptesAppareil,
    annonce,
    definirAnnonce,
    basculerVersCompte,
    preparerAjoutCompte,
  } = useAuth();
  const { width } = useWindowDimensions();
  const [compteChoisi, setCompteChoisi] = useState<CompteAppareil | null>(null);
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const comptes = useMemo(
    () => [...comptesAppareil].sort((a, b) => a.prenom.localeCompare(b.prenom, 'fr')),
    [comptesAppareil],
  );

  const colonnes = width >= LARGEUR_GRANDE ? 4 : width >= LARGEUR_TABLETTE ? 3 : 2;

  const chemins = comptes
    .map((compte) => compte.photo_url)
    .filter((chemin): chemin is string => Boolean(chemin));
  const photos = useUrlsSignees(chemins);

  async function onSaisie(valeur: string) {
    setSaisie(valeur);
    if (valeur.length < 4 || !compteChoisi || chargement) return;
    setChargement(true);
    setErreur(null);
    const resultat = await basculerVersCompte(compteChoisi.id, valeur);
    if (resultat.ok) return;
    if (resultat.bloque) {
      definirAnnonce(resultat.message);
      setCompteChoisi(null);
      setSaisie('');
      setErreur(null);
      setChargement(false);
      return;
    }
    setErreur(resultat.message);
    setSaisie('');
    setChargement(false);
  }

  if (compteChoisi) {
    return (
      <Ecran titre={`Code de ${compteChoisi.prenom}`} defilement>
        <Banniere
          message={annonce}
          type="erreur"
          onFermer={() => definirAnnonce(null)}
        />
        <PaveNumerique valeur={saisie} onChange={(valeur) => void onSaisie(valeur)} />
        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        <Bouton
          titre="Retour"
          variante="secondaire"
          onPress={() => {
            setCompteChoisi(null);
            setSaisie('');
            setErreur(null);
          }}
        />
      </Ecran>
    );
  }

  return (
    <Ecran titre="Qui êtes-vous ?" defilement>
      <Banniere message={annonce} type="erreur" onFermer={() => definirAnnonce(null)} />
      <View style={styles.grille}>
        {comptes.map((compte) => {
          const photoUrl = compte.photo_url ? photos.data?.[compte.photo_url] : null;
          return (
            <Pressable
              key={compte.id}
              accessibilityRole="button"
              accessibilityLabel={`${compte.prenom}, ${ROLES[compte.role]}`}
              onPress={() => {
                setErreur(null);
                setSaisie('');
                setCompteChoisi(compte);
              }}
              style={({ pressed }) => [
                styles.tuile,
                { width: `${(100 / colonnes).toFixed(2)}%` as `${number}%` },
                pressed && styles.tuileAppuyee,
              ]}
            >
              <View style={styles.tuileInterieur}>
                {photoUrl ? (
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.photo}
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <View style={[styles.photo, styles.initiale]}>
                    <Text style={styles.lettre}>
                      {compte.prenom.trim().charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <Text style={styles.prenom} numberOfLines={1}>
                  {compte.prenom}
                </Text>
                <Text style={styles.role}>{ROLES[compte.role]}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Bouton
        titre="Ajouter un compte sur cet appareil"
        variante="secondaire"
        onPress={() => void preparerAjoutCompte()}
      />
    </Ecran>
  );
}

const TAILLE_PHOTO = 88;

const styles = StyleSheet.create({
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -espacements.s,
  },
  tuile: {
    padding: espacements.s,
  },
  tuileInterieur: {
    alignItems: 'center',
    gap: espacements.s,
    paddingVertical: espacements.m,
    paddingHorizontal: espacements.s,
    borderRadius: 10,
    backgroundColor: couleurs.fondGroupe,
    minHeight: 160,
  },
  tuileAppuyee: {
    opacity: 0.8,
  },
  photo: {
    width: TAILLE_PHOTO,
    height: TAILLE_PHOTO,
    borderRadius: TAILLE_PHOTO / 2,
  },
  initiale: {
    backgroundColor: couleurs.principalClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lettre: {
    fontSize: tailles.titre,
    fontWeight: '700',
    color: couleurs.principalFonce,
  },
  prenom: {
    fontSize: tailles.normal,
    fontWeight: '700',
    color: couleurs.texte,
    textAlign: 'center',
  },
  role: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    textAlign: 'center',
  },
});
