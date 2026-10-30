import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { cameraDisponible, choisirPhoto, envoyerPhoto, supprimerPhoto, useUrlSignee } from '@/api/photos';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { couleurs, espacements, rayon, tailles } from '@/theme';

type Props = {
  chemin: string | null;
  dossier: 'produits' | 'profils';
  proprietaireId: string;
  camera?: 'avant' | 'arriere';
  onChange: (chemin: string | null) => void | Promise<void>;
  // Création d'un produit : on garde l'aperçu local et on n'envoie qu'à l'enregistrement.
  envoiDiffere?: boolean;
  onPhotoLocale?: (uri: string | null) => void;
  /** Vignette + liens texte ; le contenu à droite (ex. champ Nom) se passe en children. */
  compact?: boolean;
  children?: ReactNode;
};

// Prise de photo, envoi, puis affichage. La bannière de succès est gérée par l'écran.
export function ChoixPhoto({
  chemin,
  dossier,
  proprietaireId,
  camera = 'arriere',
  onChange,
  envoiDiffere = false,
  onPhotoLocale,
  compact = false,
  children,
}: Props) {
  const [cameraOk, setCameraOk] = useState(true);
  const [action, setAction] = useState<'camera' | 'galerie' | 'retirer' | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const url = useUrlSignee(envoiDiffere ? null : chemin);
  const apercu = envoiDiffere ? chemin : url.data;

  useEffect(() => {
    void cameraDisponible().then(setCameraOk);
  }, []);

  async function prendre(source: 'camera' | 'galerie') {
    setErreur(null);
    setAction(source);
    try {
      const uri = await choisirPhoto(source, camera);
      if (!uri) return;
      if (envoiDiffere) {
        onPhotoLocale?.(uri);
        return;
      }
      const nouveau = await envoyerPhoto(uri, dossier, proprietaireId);
      const ancien = chemin;
      await onChange(nouveau);
      if (ancien) {
        try {
          await supprimerPhoto(ancien);
        } catch {
          // L'ancienne photo reste dans le stockage, le produit pointe vers la nouvelle.
        }
      }
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    } finally {
      setAction(null);
    }
  }

  async function retirer() {
    if (!chemin) return;
    setErreur(null);
    setAction('retirer');
    try {
      if (envoiDiffere) {
        onPhotoLocale?.(null);
        return;
      }
      await supprimerPhoto(chemin);
      await onChange(null);
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    } finally {
      setAction(null);
    }
  }

  const occupe = action !== null;
  const libelleCamera = chemin ? 'Changer la photo' : 'Prendre une photo';

  const vignette = apercu ? (
    <Image
      source={{ uri: apercu }}
      style={compact ? styles.photoCompact : styles.photo}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <View style={[compact ? styles.photoCompact : styles.photo, compact ? styles.videCompact : styles.vide]}>
      {compact ? (
        <Ionicons name="camera-outline" size={28} color={couleurs.texteSecondaire} />
      ) : (
        <Text style={styles.videTexte}>Pas de photo</Text>
      )}
    </View>
  );

  const messageOccupation =
    action === 'retirer'
      ? 'Retrait de la photo…'
      : envoiDiffere
        ? 'Préparation de la photo…'
        : 'Envoi de la photo…';

  if (compact) {
    return (
      <View style={styles.blocCompact}>
        <View style={styles.ligneCompact}>
          {vignette}
          <View style={styles.colonneDroit}>
            {children}
            {occupe ? (
              <View style={styles.envoi}>
                <ActivityIndicator color={couleurs.principal} />
                <Text style={styles.envoiTexteCompact}>{messageOccupation}</Text>
              </View>
            ) : (
              <View style={styles.liens}>
                {cameraOk ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: occupe }}
                    disabled={occupe}
                    onPress={() => void prendre('camera')}
                    hitSlop={8}
                  >
                    <Text style={styles.lien}>{libelleCamera}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: occupe }}
                  disabled={occupe}
                  onPress={() => void prendre('galerie')}
                  hitSlop={8}
                >
                  <Text style={styles.lien}>Choisir dans la galerie</Text>
                </Pressable>
                {chemin ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: occupe }}
                    disabled={occupe}
                    onPress={() => void retirer()}
                    hitSlop={8}
                  >
                    <Text style={styles.lien}>Retirer la photo</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
            {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bloc}>
      {vignette}
      {occupe ? (
        <View style={styles.envoi}>
          <ActivityIndicator color={couleurs.principal} />
          <Text style={styles.envoiTexte}>{messageOccupation}</Text>
        </View>
      ) : null}
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      {cameraOk ? (
        <Bouton
          titre={libelleCamera}
          chargement={action === 'camera'}
          desactive={occupe}
          onPress={() => void prendre('camera')}
        />
      ) : null}
      <Bouton
        titre="Choisir dans la galerie"
        variante="secondaire"
        chargement={action === 'galerie'}
        desactive={occupe}
        onPress={() => void prendre('galerie')}
      />
      {chemin ? (
        <Bouton
          titre="Retirer la photo"
          variante="danger"
          chargement={action === 'retirer'}
          desactive={occupe}
          onPress={() => void retirer()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: {
    gap: 12,
  },
  blocCompact: {
    gap: espacements.s,
  },
  ligneCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacements.m,
  },
  colonneDroit: {
    flex: 1,
    gap: espacements.s,
    minWidth: 0,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: rayon,
    alignSelf: 'center',
  },
  photoCompact: {
    width: 80,
    height: 80,
    borderRadius: rayon,
  },
  vide: {
    backgroundColor: couleurs.principalClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videCompact: {
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videTexte: {
    fontSize: tailles.petit,
    color: couleurs.principalFonce,
  },
  liens: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
    columnGap: espacements.m,
  },
  lien: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.principal,
  },
  envoi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  envoiTexte: {
    fontSize: tailles.normal,
    color: couleurs.texte,
  },
  envoiTexteCompact: {
    fontSize: tailles.petit,
    color: couleurs.texte,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
});
