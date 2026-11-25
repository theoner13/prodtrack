// Version démo : 3 comptes de « Boulangerie Démo » (données de test).
// Le mot de passe est public : la base remet tout à zéro chaque nuit (migration 0024).
import type { QueryClient } from '@tanstack/react-query';

import { retirerCompteAppareil } from '@/lib/comptes-appareil';
import { creerPin, supprimerPin } from '@/lib/pin';
import { supabase } from '@/lib/supabase';

export const MOT_DE_PASSE_DEMO = 'demo-prodtrack';
export const CODE_DEMO = '1234';

export type CompteDemo = {
  id: string;
  email: string;
  libelle: string;
  personne: string;
  description: string;
};

export const COMPTES_DEMO: CompteDemo[] = [
  {
    id: 'a9b2a801-5f81-43bf-8a70-6a8925bfee42',
    email: 'demo.admin@prodtrack-demo.fr',
    libelle: 'Admin',
    personne: 'Claire Martin',
    description: "Chiffre d'affaires, boutiques, employés, produits et exports.",
  },
  {
    id: '31e34a42-fcdd-4d3a-9616-b9f518eae809',
    email: 'demo.gare.p1@prodtrack-demo.fr',
    libelle: 'Pâtissier',
    personne: 'Julien Girard · Boutique Gare',
    description: 'Production, sorties, stock, planning, recettes et commandes.',
  },
  {
    id: '146b2bfd-4fbd-4a3f-b81e-aada483992be',
    email: 'demo.gare.vente@prodtrack-demo.fr',
    libelle: 'Vente',
    personne: 'Nadia Benali · Boutique Gare',
    description: 'Saisie de fin de journée, historique et commandes de gâteaux.',
  },
];

export function compteDemo(userId: string | undefined): CompteDemo | undefined {
  return COMPTES_DEMO.find((compte) => compte.id === userId);
}

/**
 * Connecte un compte démo. Le code 1234 est créé d'avance ; AuthProvider ouvre
 * les comptes démo sans le demander.
 */
export async function entrerDemo(compte: CompteDemo, queryClient: QueryClient): Promise<void> {
  if (!supabase) throw new Error("La connexion à Supabase n'est pas configurée.");
  await creerPin(compte.id, CODE_DEMO, false);
  queryClient.clear();
  const { error } = await supabase.auth.signInWithPassword({
    email: compte.email,
    password: MOT_DE_PASSE_DEMO,
  });
  if (error) throw error;
}

/** Quitte la démo : retire les comptes démo de l'appareil et déconnecte. */
export async function quitterDemo(queryClient: QueryClient): Promise<void> {
  for (const compte of COMPTES_DEMO) {
    await retirerCompteAppareil(compte.id);
    await supprimerPin(compte.id);
  }
  queryClient.clear();
  await supabase?.auth.signOut({ scope: 'local' });
}
