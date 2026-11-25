import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { EcranAuth } from '@/components/ecran-auth';
import { CODE_DEMO, COMPTES_DEMO, entrerDemo, type CompteDemo } from '@/lib/demo';
import { couleurs, espacements, polices, rayonCarte, tailles } from '@/theme';

export default function EcranDemo() {
  const queryClient = useQueryClient();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function choisir(compte: CompteDemo) {
    setErreur(null);
    setEnCours(compte.id);
    try {
      await entrerDemo(compte, queryClient);
      router.replace('/');
    } catch (probleme) {
      setErreur(messageErreur(probleme));
    } finally {
      setEnCours(null);
    }
  }

  return (
    <EcranAuth titre="Essayer ProdTrack" largeurMax={480}>
      <Text style={styles.intro}>
        Boulangerie Démo est une entreprise fictive : deux boutiques, une quarantaine de produits
        et deux mois d'activité. Changez de profil à tout moment avec la barre en bas de l'écran.
        Tout ce que vous modifiez est effacé chaque nuit.
      </Text>

      <View style={styles.liste}>
        {COMPTES_DEMO.map((compte) => (
          <Pressable
            key={compte.id}
            accessibilityRole="button"
            disabled={enCours !== null}
            onPress={() => void choisir(compte)}
            style={({ pressed }) => [styles.carte, pressed && styles.carteAppuyee]}
          >
            <View style={styles.carteTexte}>
              <Text style={styles.role}>{compte.libelle}</Text>
              <Text style={styles.personne}>{compte.personne}</Text>
              <Text style={styles.description}>{compte.description}</Text>
            </View>
            {enCours === compte.id ? (
              <ActivityIndicator color={couleurs.accentFonce} />
            ) : (
              <Text style={styles.fleche}>→</Text>
            )}
          </Pressable>
        ))}
      </View>

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      <Text style={styles.code}>Code demandé après une pause : {CODE_DEMO}</Text>

      <Bouton
        titre="J'ai déjà un compte"
        variante="secondaire"
        pleineLargeur
        onPress={() => router.replace('/connexion')}
      />
    </EcranAuth>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
    lineHeight: 22,
    fontFamily: polices.sans,
  },
  liste: {
    gap: espacements.s,
  },
  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    padding: espacements.m,
    borderRadius: rayonCarte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.surface,
  },
  carteAppuyee: {
    backgroundColor: couleurs.fondOngletActif,
  },
  carteTexte: {
    flex: 1,
    gap: 2,
  },
  role: {
    fontSize: tailles.grand,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  personne: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.accentFonce,
    fontFamily: polices.sans,
  },
  description: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  fleche: {
    fontSize: tailles.grand,
    color: couleurs.texteMuet,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
  code: {
    fontSize: tailles.petit,
    color: couleurs.texteMuet,
    textAlign: 'center',
    fontFamily: polices.sans,
  },
});
