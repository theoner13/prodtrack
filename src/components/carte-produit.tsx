import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { formatEuros } from '@/lib/format';
import { couleurs, espacements, rayon, tailles } from '@/theme';

type Props = {
  nom: string;
  prixCentimes?: number;
  photoUrl?: string | null;
  sousTitre?: string; // ex. nom du fabricant, stock
  children?: ReactNode; // contenu libre à droite (compteur, badge…)
};

// Ligne produit : photo (ou initiale), nom, prix, et un contenu libre à droite.
export function CarteProduit({ nom, prixCentimes, photoUrl, sousTitre, children }: Props) {
  return (
    <View style={styles.carte}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.photo, styles.initiale]}>
          <Text style={styles.lettre}>{nom.trim().charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.textes}>
        <Text style={styles.nom} numberOfLines={2}>
          {nom}
        </Text>
        {prixCentimes != null ? <Text style={styles.detail}>{formatEuros(prixCentimes)}</Text> : null}
        {sousTitre ? <Text style={styles.detail}>{sousTitre}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const TAILLE_PHOTO = 56;

const styles = StyleSheet.create({
  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    padding: espacements.m,
    borderRadius: rayon,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  photo: {
    width: TAILLE_PHOTO,
    height: TAILLE_PHOTO,
    borderRadius: rayon,
  },
  initiale: {
    backgroundColor: couleurs.principalClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lettre: {
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.principalFonce,
  },
  textes: {
    flex: 1,
    gap: 2,
  },
  nom: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
  },
  detail: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
});
