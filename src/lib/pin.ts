import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ESSAIS_MAX = 5;

type Enregistrement = {
  sel: string;
  hash: string;
  essais: number;
  biometrie: boolean;
};

export type ResultatPin =
  | { ok: true }
  | { ok: false; bloque: boolean; restants: number };

function clePin(userId: string): string {
  return `pin.${userId}`;
}

async function lire(cle: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(cle);
  }
  return SecureStore.getItemAsync(cle);
}

async function ecrire(cle: string, valeur: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(cle, valeur);
    return;
  }
  await SecureStore.setItemAsync(cle, valeur);
}

async function effacer(cle: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(cle);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(cle);
  } catch {
    // La clé n'était pas enregistrée.
  }
}

async function lireEnregistrement(userId: string): Promise<Enregistrement | null> {
  const brut = await lire(clePin(userId));
  if (!brut) return null;
  try {
    const valeur = JSON.parse(brut) as Enregistrement;
    if (!valeur.sel || !valeur.hash) return null;
    return valeur;
  } catch {
    return null;
  }
}

async function sauver(userId: string, enregistrement: Enregistrement): Promise<void> {
  await ecrire(clePin(userId), JSON.stringify(enregistrement));
}

async function hacher(sel: string, code: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sel}:${code}`, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

async function nouveauSel(): Promise<string> {
  const octets = await Crypto.getRandomBytesAsync(16);
  return Array.from(octets)
    .map((octet) => octet.toString(16).padStart(2, '0'))
    .join('');
}

export async function pinExiste(userId: string): Promise<boolean> {
  const enregistrement = await lireEnregistrement(userId);
  return enregistrement !== null;
}

export async function biometrieActive(userId: string): Promise<boolean> {
  const enregistrement = await lireEnregistrement(userId);
  return enregistrement?.biometrie === true;
}

export async function creerPin(userId: string, code: string, biometrie: boolean): Promise<void> {
  const sel = await nouveauSel();
  const hash = await hacher(sel, code);
  await sauver(userId, { sel, hash, essais: 0, biometrie });
}

export async function supprimerPin(userId: string): Promise<void> {
  await effacer(clePin(userId));
}

export async function verifierPin(userId: string, code: string): Promise<ResultatPin> {
  const enregistrement = await lireEnregistrement(userId);
  if (!enregistrement) return { ok: false, bloque: false, restants: 0 };

  const hash = await hacher(enregistrement.sel, code);
  if (hash === enregistrement.hash) {
    await sauver(userId, { ...enregistrement, essais: 0 });
    return { ok: true };
  }

  const essais = enregistrement.essais + 1;
  if (essais >= ESSAIS_MAX) {
    await supprimerPin(userId);
    return { ok: false, bloque: true, restants: 0 };
  }

  await sauver(userId, { ...enregistrement, essais });
  return { ok: false, bloque: false, restants: ESSAIS_MAX - essais };
}
