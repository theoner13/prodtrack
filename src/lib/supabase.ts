import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore n'accepte qu'environ 2048 caractères : une session Supabase
// est parfois plus longue, donc on la découpe en plusieurs clés.
const TAILLE_MORCEAU = 1800;

async function oublierCle(cle: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(cle);
  } catch {
    // La clé n'était pas enregistrée.
  }
}

async function lire(cle: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(cle);
  }

  const nombre = await SecureStore.getItemAsync(`${cle}.n`);
  if (nombre == null) return SecureStore.getItemAsync(cle);

  const morceaux: string[] = [];
  for (let i = 0; i < Number(nombre); i += 1) {
    const morceau = await SecureStore.getItemAsync(`${cle}.${i}`);
    if (morceau == null) return null;
    morceaux.push(morceau);
  }
  return morceaux.join('');
}

async function effacerMorceaux(cle: string): Promise<void> {
  const nombre = await SecureStore.getItemAsync(`${cle}.n`);
  if (nombre == null) return;
  for (let i = 0; i < Number(nombre); i += 1) {
    await oublierCle(`${cle}.${i}`);
  }
  await oublierCle(`${cle}.n`);
}

async function ecrire(cle: string, valeur: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(cle, valeur);
    return;
  }

  await effacerMorceaux(cle);
  if (valeur.length <= TAILLE_MORCEAU) {
    await SecureStore.setItemAsync(cle, valeur);
    return;
  }

  await oublierCle(cle);
  const total = Math.ceil(valeur.length / TAILLE_MORCEAU);
  for (let i = 0; i < total; i += 1) {
    await SecureStore.setItemAsync(
      `${cle}.${i}`,
      valeur.slice(i * TAILLE_MORCEAU, (i + 1) * TAILLE_MORCEAU),
    );
  }
  await SecureStore.setItemAsync(`${cle}.n`, String(total));
}

async function supprimer(cle: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(cle);
    return;
  }
  await effacerMorceaux(cle);
  await oublierCle(cle);
}

function creerClient(): SupabaseClient | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const cleAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cleAnon) return null;

  return createClient(url, cleAnon, {
    auth: {
      storage: {
        getItem: lire,
        setItem: ecrire,
        removeItem: supprimer,
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
}

export const supabase = creerClient();
