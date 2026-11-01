import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useUrlsSignees } from '@/api/photos';
import { useAuth } from '@/auth/AuthProvider';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { BoutonRetour } from '@/components/bouton-retour';
import { Ecran } from '@/components/ecran';
import { PaveNumerique } from '@/components/pave-numerique';
import type { CompteAppareil } from '@/lib/comptes-appareil';
import { couleurs, espacements, polices, rayon, tailles } from '@/theme';
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
    boutiqueNom,
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
    const initiale = compteChoisi.prenom.trim().charAt(0).toUpperCase() || '?';
    return (
      <Ecran>
        <BoutonRetour
          onPress={() => {
            setCompteChoisi(null);
            setSaisie('');
            setErreur(null);
          }}
        />
        <Banniere
          message={annonce}
          type="erreur"
          onFermer={() => definirAnnonce(null)}
        />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.centreScroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarCode}>
            <Text style={styles.avatarCodeLettre}>{initiale}</Text>
          </View>
          <Text style={styles.titreCode}>Code de {compteChoisi.prenom}</Text>
          <Text style={styles.consigne}>Saisissez votre code à 4 chiffres.</Text>
          <PaveNumerique valeur={saisie} onChange={(valeur) => void onSaisie(valeur)} />
          {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        </ScrollView>
      </Ecran>
    );
  }

  return (
    <Ecran titre="Qui êtes-vous ?" defilement>
      <Banniere message={annonce} type="erreur" onFermer={() => definirAnnonce(null)} />
      {boutiqueNom ? (
        <Text style={styles.sousTitre}>{boutiqueNom} · tablette partagée</Text>
      ) : null}
      <View style={styles.grille}>
        {comptes.map((compte) => {
          const photoUrl = compte.photo_url ? photos.data?.[compte.photo_url] : null;
          const initiale = compte.prenom.trim().charAt(0).toUpperCase() || '?';
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
                    <Text style={styles.lettre}>{initiale}</Text>
                  </View>
                )}
                <View style={styles.tuileTextes}>
                  <Text style={styles.prenom} numberOfLines={1}>
                    {compte.prenom}
                  </Text>
                  <Text style={styles.role}>{ROLES[compte.role]}</Text>
                </View>
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

const TAILLE_PHOTO = 40;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    width: '100%',
  },
  centreScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: espacements.m,
    paddingVertical: espacements.xl,
  },
  sousTitre: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginTop: -espacements.xs,
    marginBottom: espacements.s,
    fontFamily: polices.sans,
  },
  titreCode: {
    fontSize: tailles.titreMoyen,
    fontWeight: '500',
    color: couleurs.texte,
    textAlign: 'center',
    letterSpacing: -0.3,
    fontFamily: polices.sans,
  },
  consigne: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    fontFamily: polices.sans,
  },
  avatarCode: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: couleurs.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCodeLettre: {
    fontSize: 20,
    fontWeight: '500',
    color: couleurs.texteSurPrincipal,
    fontFamily: polices.sans,
  },
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  tuile: {
    padding: 5,
  },
  tuileInterieur: {
    alignItems: 'flex-start',
    gap: 20,
    padding: 16,
    borderRadius: rayon,
    backgroundColor: couleurs.fondGroupe,
    minHeight: 120,
  },
  tuileAppuyee: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  photo: {
    width: TAILLE_PHOTO,
    height: TAILLE_PHOTO,
    borderRadius: TAILLE_PHOTO / 2,
  },
  initiale: {
    backgroundColor: couleurs.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lettre: {
    fontSize: 15,
    fontWeight: '500',
    color: couleurs.texteSurPrincipal,
    fontFamily: polices.sans,
  },
  tuileTextes: {
    gap: 2,
  },
  prenom: {
    fontSize: 16,
    fontWeight: '500',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  role: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    textAlign: 'center',
    fontFamily: polices.sans,
  },
});
