import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const COTE_MAX = 1024;
const POIDS_MAX = 5 * 1024 * 1024;
const DUREE_SIGNATURE = 60 * 60;

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
};

function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

// Téléphone : toujours. Ordinateur : seulement s'il a un appareil photo.
export async function cameraDisponible(): Promise<boolean> {
  if (Platform.OS !== 'web') return true;
  if (typeof navigator === 'undefined') return false;
  const agent = navigator.userAgent ?? '';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(agent)) return true;
  if (navigator.maxTouchPoints > 1 && /Macintosh/i.test(agent)) return true;
  try {
    const appareils = await navigator.mediaDevices?.enumerateDevices();
    return appareils?.some((appareil) => appareil.kind === 'videoinput') ?? false;
  } catch {
    return false;
  }
}

async function reduire(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const actions: Action[] = [];
  if (asset.width > COTE_MAX || asset.height > COTE_MAX) {
    if (asset.width >= asset.height) actions.push({ resize: { width: COTE_MAX } });
    else actions.push({ resize: { height: COTE_MAX } });
  }
  const image = await manipulateAsync(asset.uri, actions, {
    compress: 0.7,
    format: SaveFormat.JPEG,
  });
  return image.uri;
}

// Ouvre l'appareil photo ou la galerie, propose le recadrage carré, puis réduit l'image.
// null = la personne a annulé.
export async function choisirPhoto(
  source: 'camera' | 'galerie',
  camera: 'avant' | 'arriere' = 'arriere',
): Promise<string | null> {
  try {
    if (source === 'camera') {
      const droit = await ImagePicker.requestCameraPermissionsAsync();
      if (!droit.granted) {
        throw new Error("Autorisez l'accès à l'appareil photo dans les réglages du téléphone");
      }
      const resultat = await ImagePicker.launchCameraAsync({
        ...OPTIONS,
        cameraType: camera === 'avant' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      });
      if (resultat.canceled || !resultat.assets?.[0]) return null;
      return reduire(resultat.assets[0]);
    }

    const droit = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!droit.granted) {
      throw new Error("Autorisez l'accès à la galerie dans les réglages du téléphone");
    }
    const resultat = await ImagePicker.launchImageLibraryAsync(OPTIONS);
    if (resultat.canceled || !resultat.assets?.[0]) return null;
    return reduire(resultat.assets[0]);
  } catch (erreur) {
    const texte = erreur instanceof Error ? erreur.message.toLowerCase() : '';
    if (texte.includes('permission') || texte.includes('denied') || texte.includes('not authorized')) {
      throw new Error(
        source === 'camera'
          ? "Autorisez l'accès à l'appareil photo dans les réglages du téléphone"
          : "Autorisez l'accès à la galerie dans les réglages du téléphone",
      );
    }
    throw erreur;
  }
}

async function lireOctets(uri: string): Promise<ArrayBuffer> {
  try {
    const reponse = await fetch(uri);
    if (!reponse.ok) throw new Error('lecture impossible');
    return await reponse.arrayBuffer();
  } catch (erreur) {
    if (uri.startsWith('blob:') || uri.startsWith('data:')) throw erreur;
    return new File(uri).arrayBuffer();
  }
}

// Envoie une image déjà réduite. Retourne le chemin dans le bucket.
export async function envoyerPhoto(
  uri: string,
  dossier: 'produits' | 'profils',
  proprietaireId: string,
): Promise<string> {
  const contenu = await lireOctets(uri);
  if (contenu.byteLength > POIDS_MAX) throw new Error('photo trop lourde');
  const fichier = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const chemin = `${dossier}/${proprietaireId}/${fichier}`;
  const { error } = await db().storage.from('photos').upload(chemin, contenu, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return chemin;
}

export async function supprimerPhoto(chemin: string): Promise<void> {
  const { error } = await db().storage.from('photos').remove([chemin]);
  if (error) throw error;
}

export function useUrlSignee(chemin: string | null) {
  return useQuery({
    queryKey: ['photo', chemin],
    enabled: Boolean(chemin),
    staleTime: DUREE_SIGNATURE * 1000,
    gcTime: DUREE_SIGNATURE * 1000,
    queryFn: async () => {
      const { data, error } = await db()
        .storage.from('photos')
        .createSignedUrl(chemin as string, DUREE_SIGNATURE);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function useUrlsSignees(chemins: string[]) {
  const cle = [...chemins].sort().join('|');
  return useQuery({
    queryKey: ['photos', cle],
    enabled: chemins.length > 0,
    staleTime: DUREE_SIGNATURE * 1000,
    gcTime: DUREE_SIGNATURE * 1000,
    queryFn: async () => {
      const { data, error } = await db().storage.from('photos').createSignedUrls(chemins, DUREE_SIGNATURE);
      if (error) throw error;
      const urls: Record<string, string> = {};
      for (const item of data) {
        if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
      }
      return urls;
    },
  });
}
