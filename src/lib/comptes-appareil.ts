import { lire, ecrire, supprimer } from '@/lib/supabase';
import { supprimerPin } from '@/lib/pin';
import type { RoleEmploye } from '@/types/database';

const CLE_LISTE = 'comptes.appareil.liste';
const CLE_TABLETTE = 'appareil.tablette_partagee';

export type CompteAppareil = {
  id: string;
  prenom: string;
  nom: string;
  photo_url: string | null;
  role: RoleEmploye;
  ajoute_le: string;
};

export type SessionCompte = {
  access_token: string;
  refresh_token: string;
};

function cleSession(userId: string): string {
  return `compte.${userId}.session`;
}

export async function lireComptesAppareil(): Promise<CompteAppareil[]> {
  const brut = await lire(CLE_LISTE);
  if (!brut) return [];
  try {
    const liste = JSON.parse(brut) as CompteAppareil[];
    if (!Array.isArray(liste)) return [];
    return liste.filter(
      (compte) =>
        compte &&
        typeof compte.id === 'string' &&
        typeof compte.prenom === 'string' &&
        typeof compte.nom === 'string' &&
        typeof compte.role === 'string',
    );
  } catch {
    return [];
  }
}

export async function ecrireComptesAppareil(comptes: CompteAppareil[]): Promise<void> {
  await ecrire(CLE_LISTE, JSON.stringify(comptes));
}

export async function enregistrerCompteAppareil(
  compte: Omit<CompteAppareil, 'ajoute_le'> & { ajoute_le?: string },
): Promise<CompteAppareil[]> {
  const liste = await lireComptesAppareil();
  const index = liste.findIndex((existant) => existant.id === compte.id);
  const ligne: CompteAppareil = {
    id: compte.id,
    prenom: compte.prenom,
    nom: compte.nom,
    photo_url: compte.photo_url,
    role: compte.role,
    ajoute_le: index >= 0 ? liste[index]!.ajoute_le : (compte.ajoute_le ?? new Date().toISOString()),
  };
  if (index >= 0) liste[index] = ligne;
  else liste.push(ligne);
  await ecrireComptesAppareil(liste);
  return liste;
}

export async function lireSessionCompte(userId: string): Promise<SessionCompte | null> {
  const brut = await lire(cleSession(userId));
  if (!brut) return null;
  try {
    const session = JSON.parse(brut) as SessionCompte;
    if (!session.access_token || !session.refresh_token) return null;
    return session;
  } catch {
    return null;
  }
}

export async function ecrireSessionCompte(userId: string, session: SessionCompte): Promise<void> {
  await ecrire(cleSession(userId), JSON.stringify(session));
}

export async function supprimerSessionCompte(userId: string): Promise<void> {
  await supprimer(cleSession(userId));
}

export async function lireTablettePartagee(): Promise<boolean> {
  const valeur = await lire(CLE_TABLETTE);
  return valeur === 'oui';
}

export async function ecrireTablettePartagee(actif: boolean): Promise<void> {
  await ecrire(CLE_TABLETTE, actif ? 'oui' : 'non');
}

/** Retire le compte de l'appareil : liste, session enregistrée et PIN. */
export async function retirerCompteAppareil(userId: string): Promise<CompteAppareil[]> {
  const liste = (await lireComptesAppareil()).filter((compte) => compte.id !== userId);
  await ecrireComptesAppareil(liste);
  await supprimerSessionCompte(userId);
  await supprimerPin(userId);
  return liste;
}
