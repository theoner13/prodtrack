import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { formatEuros } from '@/lib/format';
import { couleurs, espacements, tailles } from '@/theme';

type Props = {
  nom: string;
  prixCentimes?: number;
  photoUrl?: string | null;
  sousTitre?: string; // ex. nom du fabricant, stock
  children?: ReactNode; // contenu libre à droite (compteur, badge…)
  sousLigne?: ReactNode; // contenu sous la ligne photo + nom (ex. compteur)
  alerte?: boolean; // bordure orange (stock sous le seuil)
};

// Ligne produit : photo (ou initiale), nom, prix — style liste iOS sans carte.
export function CarteProduit({
  nom,
  prixCentimes,
  photoUrl,
  sousTitre,
  children,
  sousLigne,
  alerte = false,
}: Props) {
  return (
    <View style={[styles.ligneListe, alerte && styles.alerte]}>
      <View style={styles.ligne}>
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
      {sousLigne ? <View style={styles.sousLigne}>{sousLigne}</View> : null}
    </View>
  );
}

const TAILLE_PHOTO = 36;

const styles = StyleSheet.create({
  ligneListe: {
    gap: espacements.s,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
  },
  alerte: {
    backgroundColor: couleurs.alerteClair,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
  },
  photo: {
    width: TAILLE_PHOTO,
    height: TAILLE_PHOTO,
    borderRadius: 8,
  },
  initiale: {
    backgroundColor: couleurs.principalClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lettre: {
    fontSize: tailles.normal,
    fontWeight: '600',
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
  sousLigne: {
    alignItems: 'flex-end',
  },
});
