import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatEuros } from '@/lib/format';
import { couleurs, espacements, polices, tailles } from '@/theme';

type Props = {
  nom: string;
  prixCentimes?: number;
  photoUrl?: string | null;
  sousTitre?: string;
  children?: ReactNode;
  sousLigne?: ReactNode;
  alerte?: boolean;
  onPressNom?: () => void;
};

// Ligne produit : photo (ou initiale), nom, prix.
export function CarteProduit({
  nom,
  prixCentimes,
  photoUrl,
  sousTitre,
  children,
  sousLigne,
  alerte = false,
  onPressNom,
}: Props) {
  const titre = (
    <Text style={[styles.nom, onPressNom ? styles.nomLien : null]} numberOfLines={2}>
      {nom}
    </Text>
  );

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
          {onPressNom ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Ouvrir la fiche de ${nom}`}
              onPress={(event) => {
                event.stopPropagation?.();
                onPressNom();
              }}
            >
              {titre}
            </Pressable>
          ) : (
            titre
          )}
          {prixCentimes != null ? <Text style={styles.detail}>{formatEuros(prixCentimes)}</Text> : null}
          {sousTitre ? <Text style={styles.detail}>{sousTitre}</Text> : null}
        </View>
        {children}
      </View>
      {sousLigne ? <View style={styles.sousLigne}>{sousLigne}</View> : null}
    </View>
  );
}

const TAILLE_PHOTO = 40;

const styles = StyleSheet.create({
  ligneListe: {
    gap: espacements.s,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
  },
  alerte: {
    backgroundColor: couleurs.erreurClair,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photo: {
    width: TAILLE_PHOTO,
    height: TAILLE_PHOTO,
    borderRadius: 12,
  },
  initiale: {
    backgroundColor: couleurs.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lettre: {
    fontSize: tailles.petit,
    fontWeight: '500',
    color: couleurs.texteSurPrincipal,
    fontFamily: polices.sans,
  },
  textes: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  nom: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.1,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  nomLien: {
    color: couleurs.principal,
    textDecorationLine: 'underline',
    textDecorationColor: couleurs.soulignement,
  },
  detail: {
    fontSize: tailles.legend,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  sousLigne: {
    alignItems: 'flex-end',
  },
});
