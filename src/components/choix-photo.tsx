import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { cameraDisponible, choisirPhoto, envoyerPhoto, supprimerPhoto, useUrlSignee } from '@/api/photos';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { couleurs, rayon, tailles } from '@/theme';

type Props = {
  chemin: string | null;
  dossier: 'produits' | 'profils';
  proprietaireId: string;
  camera?: 'avant' | 'arriere';
  onChange: (chemin: string | null) => void | Promise<void>;
  // Création d'un produit : on garde l'aperçu local et on n'envoie qu'à l'enregistrement.
  envoiDiffere?: boolean;
  onPhotoLocale?: (uri: string | null) => void;
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

  return (
    <View style={styles.bloc}>
      {apercu ? (
        <Image source={{ uri: apercu }} style={styles.photo} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.photo, styles.vide]}>
          <Text style={styles.videTexte}>Pas de photo</Text>
        </View>
      )}
      {occupe ? (
        <View style={styles.envoi}>
          <ActivityIndicator color={couleurs.principal} />
          <Text style={styles.envoiTexte}>
            {action === 'retirer'
              ? 'Retrait de la photo…'
              : envoiDiffere
                ? 'Préparation de la photo…'
                : 'Envoi de la photo…'}
          </Text>
        </View>
      ) : null}
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      {cameraOk ? (
        <Bouton
          titre={chemin ? 'Changer la photo' : 'Prendre une photo'}
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
  photo: {
    width: 160,
    height: 160,
    borderRadius: rayon,
    alignSelf: 'center',
  },
  vide: {
    backgroundColor: couleurs.principalClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videTexte: {
    fontSize: tailles.petit,
    color: couleurs.principalFonce,
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
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
});
