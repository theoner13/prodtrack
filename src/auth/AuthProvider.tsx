import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Text } from 'react-native';

import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur } from '@/components/etats';
import { pinExiste } from '@/lib/pin';
import { supabase } from '@/lib/supabase';
import { couleurs, tailles } from '@/theme';
import type { Profil } from '@/types/database';

const CINQ_MINUTES = 5 * 60 * 1000;

type AuthContexte = {
  session: Session | null;
  profil: Profil | null;
  boutiqueNom: string | null;
  chargement: boolean;
  verrouille: boolean;
  pinPresent: boolean | null;
  annonce: string | null;
  deconnexion: () => Promise<void>;
  rechargerProfil: () => Promise<void>;
  rechargerPin: () => Promise<void>;
  deverrouiller: () => void;
  definirAnnonce: (message: string | null) => void;
};

const Contexte = createContext<AuthContexte | null>(null);

export function useAuth(): AuthContexte {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return valeur;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionConnue, setSessionConnue] = useState(false);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [boutiqueNom, setBoutiqueNom] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [verrouille, setVerrouille] = useState(true);
  const [pinPresent, setPinPresent] = useState<boolean | null>(null);
  const [compteDesactive, setCompteDesactive] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState<string | null>(null);
  const [reessai, setReessai] = useState(0);
  const sessionRef = useRef<Session | null>(null);
  const passageArrierePlan = useRef<number | null>(null);
  sessionRef.current = session;

  const appliquerProfil = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profils').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;

    if (data?.archive_le) {
      setCompteDesactive(true);
      setProfil(null);
      setBoutiqueNom(null);
      await supabase.auth.signOut();
      return;
    }

    setProfil(data);
    if (data?.boutique_id) {
      const boutique = await supabase
        .from('boutiques')
        .select('nom')
        .eq('id', data.boutique_id)
        .maybeSingle();
      setBoutiqueNom(boutique.data?.nom ?? null);
    } else {
      setBoutiqueNom(null);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setChargement(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionConnue(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_evenement, nouvelle) => {
      setSession(nouvelle);
      setSessionConnue(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionConnue || !supabase) return;
    const userId = session?.user.id;
    if (!userId) {
      setProfil(null);
      setBoutiqueNom(null);
      setPinPresent(null);
      setVerrouille(false);
      setChargement(false);
      return;
    }

    let annule = false;
    setChargement(true);
    setVerrouille(true);
    setErreur(null);
    Promise.all([appliquerProfil(userId), pinExiste(userId)])
      .then(([, present]) => {
        if (!annule) setPinPresent(present);
      })
      .catch((probleme: unknown) => {
        if (!annule) {
          setErreur(probleme instanceof Error ? probleme.message : 'Impossible de charger le profil.');
        }
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, [sessionConnue, session?.user.id, reessai, appliquerProfil]);

  useEffect(() => {
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (!sessionRef.current) return;
      if (etat === 'background') {
        passageArrierePlan.current = Date.now();
      } else if (etat === 'active' && passageArrierePlan.current) {
        if (Date.now() - passageArrierePlan.current > CINQ_MINUTES) {
          setVerrouille(true);
        }
        passageArrierePlan.current = null;
      }
    });
    return () => abonnement.remove();
  }, []);

  const deconnexion = useCallback(async () => {
    await supabase?.auth.signOut();
    setProfil(null);
    setBoutiqueNom(null);
    setVerrouille(false);
  }, []);

  const rechargerProfil = useCallback(async () => {
    const userId = sessionRef.current?.user.id;
    if (!userId) return;
    await appliquerProfil(userId);
  }, [appliquerProfil]);

  const rechargerPin = useCallback(async () => {
    const userId = sessionRef.current?.user.id;
    if (!userId) {
      setPinPresent(null);
      return;
    }
    setPinPresent(await pinExiste(userId));
  }, []);

  const deverrouiller = useCallback(() => setVerrouille(false), []);

  const valeur = useMemo<AuthContexte>(
    () => ({
      session,
      profil,
      boutiqueNom,
      chargement,
      verrouille,
      pinPresent,
      annonce,
      deconnexion,
      rechargerProfil,
      rechargerPin,
      deverrouiller,
      definirAnnonce: setAnnonce,
    }),
    [
      session,
      profil,
      boutiqueNom,
      chargement,
      verrouille,
      pinPresent,
      annonce,
      deconnexion,
      rechargerProfil,
      rechargerPin,
      deverrouiller,
    ],
  );

  if (!supabase) {
    return (
      <Ecran>
        <EtatErreur message="La connexion à Supabase n'est pas configurée. Vérifiez le fichier .env." />
      </Ecran>
    );
  }

  if (compteDesactive) {
    return (
      <Ecran titre="Compte désactivé">
        <Text style={{ fontSize: tailles.normal, color: couleurs.texte }}>
          Votre compte a été désactivé. Contactez votre responsable.
        </Text>
        <Bouton titre="Retour à la connexion" onPress={() => setCompteDesactive(false)} />
      </Ecran>
    );
  }

  if (erreur) {
    return (
      <Ecran>
        <EtatErreur message={erreur} onReessayer={() => setReessai((n) => n + 1)} />
      </Ecran>
    );
  }

  return (
    <Contexte.Provider value={valeur}>
      {chargement ? (
        <Ecran>
          <EtatChargement />
        </Ecran>
      ) : (
        children
      )}
    </Contexte.Provider>
  );
}
