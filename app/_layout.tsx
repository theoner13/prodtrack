import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  router,
  Stack,
  useGlobalSearchParams,
  usePathname,
  useRootNavigationState,
  useSegments,
  type Href,
} from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import type { Profil } from '@/types/database';

export const unstable_settings = {
  anchor: 'index',
};

export default function LayoutRacine() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <Gardien />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Gardien() {
  const {
    session,
    profil,
    chargement,
    verrouille,
    pinPresent,
    comptesAppareil,
    tablettePartagee,
    modeAjoutCompte,
  } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ changer?: string }>();
  const navigation = useRootNavigationState();
  const retourApresPin = useRef<Href | null>(null);
  const userIdPrecedent = useRef<string | undefined>(session?.user.id);

  useEffect(() => {
    if (
      userIdPrecedent.current &&
      session?.user.id &&
      userIdPrecedent.current !== session.user.id
    ) {
      retourApresPin.current = null;
    }
    userIdPrecedent.current = session?.user.id;
  }, [session?.user.id]);

  useEffect(() => {
    if (!navigation?.key || chargement) return;

    const racine = segments[0] ? String(segments[0]) : '';
    const suite = segments[1] ? String(segments[1]) : '';
    const etat = {
      connecte: session !== null,
      profil,
      pinPresent,
      verrouille,
      racine,
      suite,
      changer: params.changer === '1',
      nombreComptes: comptesAppareil.length,
      tablettePartagee,
      modeAjoutCompte,
    };

    if (
      profil &&
      verrouille &&
      pinPresent &&
      racine !== 'deverrouiller' &&
      racine !== 'qui-etes-vous' &&
      racine !== '(auth)'
    ) {
      const memorise = adresseApresPin(pathname, racine, profil);
      if (memorise) retourApresPin.current = memorise;
    }

    if (!verrouille && retourApresPin.current) {
      const retour = retourApresPin.current;
      if (cheminAtteint(pathname, retour)) {
        retourApresPin.current = null;
      } else {
        router.replace(retour);
        return;
      }
    }

    const cible = destination(etat);
    if (cible) router.replace(cible);
  }, [
    navigation?.key,
    chargement,
    session,
    profil,
    pinPresent,
    verrouille,
    segments,
    pathname,
    params.changer,
    comptesAppareil.length,
    tablettePartagee,
    modeAjoutCompte,
  ]);

  return null;
}

// Adresse à rouvrir après le code PIN. Jamais un écran de connexion ou de PIN.
function adresseApresPin(pathname: string, racine: string, profil: Profil): Href | null {
  if (
    racine === '(auth)' ||
    racine === 'deverrouiller' ||
    racine === 'qui-etes-vous'
  ) {
    return null;
  }
  if (pathname === '/profil' || pathname === '/notifications') return pathname;
  const groupe =
    profil.role === 'admin' ? '(admin)' : profil.role === 'patissier' ? '(patissier)' : '(vendeuse)';
  if (racine !== groupe) return null;
  if (!pathname || pathname === '/') return `/${groupe}` as Href;
  return `/${groupe}${pathname}` as Href;
}

function cheminAtteint(pathname: string, href: Href): boolean {
  const cible = String(href);
  if (cible === '/profil' || cible === '/notifications') return pathname === cible;
  const sansGroupe = cible.replace(/^\/\((admin|patissier|vendeuse)\)/, '') || '/';
  return pathname === sansGroupe || (sansGroupe === '/' && pathname === '/');
}

function destination(etat: {
  connecte: boolean;
  profil: Profil | null;
  pinPresent: boolean | null;
  verrouille: boolean;
  racine: string;
  suite: string;
  changer: boolean;
  nombreComptes: number;
  tablettePartagee: boolean;
  modeAjoutCompte: boolean;
}): Href | null {
  if (etat.modeAjoutCompte) {
    if (etat.racine === '(auth)' && etat.suite === 'connexion') return null;
    return '/connexion';
  }

  if (!etat.connecte) {
    if (etat.nombreComptes > 0) {
      if (etat.racine === 'qui-etes-vous') return null;
      if (etat.racine === '(auth)' && etat.suite === 'connexion') return null;
      return '/qui-etes-vous';
    }
    if (etat.racine === '(auth)' && (etat.suite === 'connexion' || etat.suite === 'inscription')) {
      return null;
    }
    return '/connexion';
  }

  if (!etat.profil) {
    if (
      etat.racine === '(auth)' &&
      (etat.suite === 'choix' || etat.suite === 'creer-entreprise' || etat.suite === 'rejoindre')
    ) {
      return null;
    }
    return '/choix';
  }

  if (!etat.profil.information_rgpd_acceptee_le) {
    if (etat.racine === '(auth)' && etat.suite === 'information') return null;
    return '/information';
  }

  if (etat.pinPresent === null) return null;

  if (!etat.pinPresent) {
    if (etat.racine === '(auth)' && etat.suite === 'creer-pin') return null;
    return '/creer-pin';
  }

  if (etat.verrouille) {
    const multi =
      etat.nombreComptes >= 2 || etat.tablettePartagee;
    if (multi) {
      if (etat.racine === 'qui-etes-vous') return null;
      return '/qui-etes-vous';
    }
    if (etat.racine === 'deverrouiller') return null;
    return '/deverrouiller';
  }

  if (etat.changer && etat.racine === '(auth)' && etat.suite === 'creer-pin') return null;
  if (etat.racine === 'profil' || etat.racine === 'notifications') return null;

  const groupe =
    etat.profil.role === 'admin'
      ? '(admin)'
      : etat.profil.role === 'patissier'
        ? '(patissier)'
        : '(vendeuse)';
  if (etat.racine === groupe) return null;

  if (etat.profil.role === 'admin') return '/(admin)';
  if (etat.profil.role === 'patissier') return '/(patissier)';
  return '/(vendeuse)';
}
