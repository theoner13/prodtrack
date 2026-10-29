import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform, Text, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur } from '@/components/etats';
import {
  ecrireSessionCompte,
  ecrireTablettePartagee,
  enregistrerCompteAppareil,
  lireComptesAppareil,
  lireSessionCompte,
  lireTablettePartagee,
  retirerCompteAppareil,
  type CompteAppareil,
} from '@/lib/comptes-appareil';
import { pinExiste, verifierPin } from '@/lib/pin';
import {
  demarrerEcouteNotifications,
  enregistrerPush,
  preparerAffichageNotifications,
  supprimerPush,
} from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { couleurs, tailles } from '@/theme';
import type { Profil } from '@/types/database';

const CINQ_MINUTES = 5 * 60 * 1000;
export const DEUX_MINUTES = 2 * 60 * 1000;
const TROIS_SECONDES = 3 * 1000;

export type ResultatBascule =
  | { ok: true }
  | { ok: false; bloque: boolean; restants: number; message: string };

type AuthContexte = {
  session: Session | null;
  profil: Profil | null;
  boutiqueNom: string | null;
  chargement: boolean;
  verrouille: boolean;
  pinPresent: boolean | null;
  annonce: string | null;
  comptesAppareil: CompteAppareil[];
  tablettePartagee: boolean;
  modeAjoutCompte: boolean;
  deconnexion: () => Promise<void>;
  rechargerProfil: () => Promise<void>;
  rechargerPin: () => Promise<void>;
  deverrouiller: () => void;
  definirAnnonce: (message: string | null) => void;
  definirTablettePartagee: (actif: boolean) => Promise<void>;
  rechargerComptesAppareil: () => Promise<void>;
  preparerAjoutCompte: () => Promise<void>;
  annulerAjoutCompte: () => void;
  basculerVersCompte: (userId: string, code: string) => Promise<ResultatBascule>;
  retirerMonCompte: () => Promise<void>;
  changerDePersonne: () => Promise<void>;
  verrouillerApresSaisie: () => void;
  retirerCompteApresEchecPin: (userId: string) => Promise<void>;
};

const Contexte = createContext<AuthContexte | null>(null);

/**
 * UserId déjà déverrouillé par son code (bascule).
 * Variable de module : survit au remontage d'AuthProvider (une useRef serait perdue).
 * Remise à null au rechargement de la page (verrouillage voulu) et aux verrouillages volontaires.
 */
let deverrouillePour: string | null = null;

export function useAuth(): AuthContexte {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return valeur;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
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
  const [comptesAppareil, setComptesAppareil] = useState<CompteAppareil[]>([]);
  const [tablettePartagee, setTablettePartagee] = useState(false);
  const [modeAjoutCompte, setModeAjoutCompte] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const profilRef = useRef<Profil | null>(null);
  const passageArrierePlan = useRef<number | null>(null);
  const ajoutDepuisUserId = useRef<string | null>(null);
  const modeAjoutCompteRef = useRef(false);
  const timerSaisieRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  sessionRef.current = session;
  profilRef.current = profil;
  modeAjoutCompteRef.current = modeAjoutCompte;

  const rechargerComptesAppareil = useCallback(async () => {
    const [comptes, tablette] = await Promise.all([lireComptesAppareil(), lireTablettePartagee()]);
    setComptesAppareil(comptes);
    setTablettePartagee(tablette);
  }, []);

  useEffect(() => {
    void rechargerComptesAppareil();
  }, [rechargerComptesAppareil]);

  useEffect(() => {
    preparerAffichageNotifications();
    return demarrerEcouteNotifications(queryClient);
  }, [queryClient]);

  // Une fois connecté, déverrouillé et profil chargé : enregistrer / rattacher le jeton.
  useEffect(() => {
    if (!session || !profil || verrouille || chargement) return;
    void enregistrerPush();
  }, [session, profil?.id, verrouille, chargement]);

  const sauverCompteActif = useCallback(async () => {
    const actuelle = sessionRef.current;
    const profilActuel = profilRef.current;
    if (!actuelle) return;
    await ecrireSessionCompte(actuelle.user.id, {
      access_token: actuelle.access_token,
      refresh_token: actuelle.refresh_token,
    });
    if (profilActuel) {
      const liste = await enregistrerCompteAppareil({
        id: profilActuel.id,
        prenom: profilActuel.prenom,
        nom: profilActuel.nom,
        photo_url: profilActuel.photo_url,
        role: profilActuel.role,
      });
      setComptesAppareil(liste);
    }
  }, []);

  const appliquerProfil = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profils').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;

    if (data?.archive_le) {
      const liste = await retirerCompteAppareil(userId);
      setComptesAppareil(liste);
      deverrouillePour = null;
      queryClient.clear();
      setCompteDesactive(true);
      setProfil(null);
      setBoutiqueNom(null);
      await supabase.auth.signOut({ scope: 'local' });
      return;
    }

    setProfil(data);
    if (data) {
      const liste = await enregistrerCompteAppareil({
        id: data.id,
        prenom: data.prenom,
        nom: data.nom,
        photo_url: data.photo_url,
        role: data.role,
      });
      setComptesAppareil(liste);
    }
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
  }, [queryClient]);

  useEffect(() => {
    if (!supabase) {
      setChargement(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionConnue(true);
    });
    const { data } = supabase.auth.onAuthStateChange((evenement, nouvelle) => {
      setSession(nouvelle);
      setSessionConnue(true);

      if (
        nouvelle &&
        (evenement === 'SIGNED_IN' ||
          evenement === 'TOKEN_REFRESHED' ||
          evenement === 'USER_UPDATED')
      ) {
        void ecrireSessionCompte(nouvelle.user.id, {
          access_token: nouvelle.access_token,
          refresh_token: nouvelle.refresh_token,
        });
      }

      if (
        modeAjoutCompteRef.current &&
        evenement === 'SIGNED_IN' &&
        nouvelle &&
        ajoutDepuisUserId.current &&
        nouvelle.user.id !== ajoutDepuisUserId.current
      ) {
        setModeAjoutCompte(false);
        ajoutDepuisUserId.current = null;
      }
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
    // Comparer à l'userId (pas un booléen à usage unique) : survit aussi au remontage.
    if (deverrouillePour === userId) {
      setVerrouille(false);
    } else if (!modeAjoutCompteRef.current) {
      setVerrouille(true);
    }
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
          deverrouillePour = null;
          setVerrouille(true);
        }
        passageArrierePlan.current = null;
      }
    });
    return () => abonnement.remove();
  }, []);

  // Verrouillage après 2 minutes d'inactivité (tablette partagée).
  useEffect(() => {
    if (!tablettePartagee || verrouille || !session || modeAjoutCompte) return;

    const verrouillerInactivite = () => {
      deverrouillePour = null;
      setVerrouille(true);
    };
    let timer = setTimeout(verrouillerInactivite, DEUX_MINUTES);

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(verrouillerInactivite, DEUX_MINUTES);
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const evenements: Array<keyof DocumentEventMap> = [
        'pointerdown',
        'keydown',
        'touchstart',
        'click',
      ];
      for (const nom of evenements) document.addEventListener(nom, reset);
      return () => {
        clearTimeout(timer);
        for (const nom of evenements) document.removeEventListener(nom, reset);
      };
    }

    // Mobile : l'écouteur tactile est sur le View enveloppe ci-dessous via onTouchStart.
    const abonnement = { reset };
    (globalThis as { __prodtrackResetActivite?: () => void }).__prodtrackResetActivite = reset;
    return () => {
      clearTimeout(timer);
      if ((globalThis as { __prodtrackResetActivite?: () => void }).__prodtrackResetActivite === abonnement.reset) {
        delete (globalThis as { __prodtrackResetActivite?: () => void }).__prodtrackResetActivite;
      }
    };
  }, [tablettePartagee, verrouille, session, modeAjoutCompte]);

  const deconnexion = useCallback(async () => {
    await supabase?.auth.signOut({ scope: 'local' });
    setProfil(null);
    setBoutiqueNom(null);
    setVerrouille(false);
    setModeAjoutCompte(false);
    ajoutDepuisUserId.current = null;
  }, []);

  const retirerMonCompte = useCallback(async () => {
    const userId = sessionRef.current?.user.id;
    await supprimerPush();
    if (userId) {
      const liste = await retirerCompteAppareil(userId);
      setComptesAppareil(liste);
    }
    deverrouillePour = null;
    queryClient.clear();
    await supabase?.auth.signOut({ scope: 'local' });
    setProfil(null);
    setBoutiqueNom(null);
    setVerrouille(false);
    setModeAjoutCompte(false);
    ajoutDepuisUserId.current = null;
  }, [queryClient]);

  const retirerCompteApresEchecPin = useCallback(
    async (userId: string) => {
      const prenom =
        comptesAppareil.find((compte) => compte.id === userId)?.prenom ??
        (profilRef.current?.id === userId ? profilRef.current.prenom : 'cet utilisateur');
      const liste = await retirerCompteAppareil(userId);
      setComptesAppareil(liste);
      if (sessionRef.current?.user.id === userId) {
        deverrouillePour = null;
        queryClient.clear();
        await supabase?.auth.signOut({ scope: 'local' });
        setProfil(null);
        setBoutiqueNom(null);
        setVerrouille(false);
      }
      setAnnonce(
        `Trop de codes incorrects pour ${prenom}. Reconnectez-vous avec votre email et votre mot de passe.`,
      );
    },
    [comptesAppareil, queryClient],
  );

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

  const definirTablettePartagee = useCallback(async (actif: boolean) => {
    await ecrireTablettePartagee(actif);
    setTablettePartagee(actif);
  }, []);

  const preparerAjoutCompte = useCallback(async () => {
    await sauverCompteActif();
    ajoutDepuisUserId.current = sessionRef.current?.user.id ?? null;
    setModeAjoutCompte(true);
    setVerrouille(false);
  }, [sauverCompteActif]);

  const annulerAjoutCompte = useCallback(() => {
    setModeAjoutCompte(false);
    ajoutDepuisUserId.current = null;
    if (sessionRef.current) setVerrouille(true);
  }, []);

  const basculerVersCompte = useCallback(
    async (userId: string, code: string): Promise<ResultatBascule> => {
      const resultat = await verifierPin(userId, code);
      if (!resultat.ok) {
        if (resultat.bloque) {
          await retirerCompteApresEchecPin(userId);
          return {
            ok: false,
            bloque: true,
            restants: 0,
            message:
              'Trop de codes incorrects. Reconnectez-vous avec votre email et votre mot de passe.',
          };
        }
        return {
          ok: false,
          bloque: false,
          restants: resultat.restants,
          message:
            resultat.restants > 1
              ? `Code incorrect. Encore ${resultat.restants} essais.`
              : 'Code incorrect. Encore 1 essai.',
        };
      }

      if (sessionRef.current?.user.id === userId) {
        deverrouillePour = userId;
        setVerrouille(false);
        return { ok: true };
      }

      const compte = (await lireComptesAppareil()).find((c) => c.id === userId);
      const prenom = compte?.prenom ?? 'cette personne';
      const tokens = await lireSessionCompte(userId);
      if (!tokens || !supabase) {
        const liste = await retirerCompteAppareil(userId);
        setComptesAppareil(liste);
        return {
          ok: false,
          bloque: true,
          restants: 0,
          message: `La session de ${prenom} a expiré. Reconnectez-vous avec votre email et votre mot de passe.`,
        };
      }

      await sauverCompteActif();
      // Vider l'ancien profil avant setSession : le Gardien ne doit jamais
      // router vers les écrans de l'ancienne personne, même un instant.
      setProfil(null);
      setBoutiqueNom(null);
      setPinPresent(null);
      setChargement(true);
      deverrouillePour = userId;
      queryClient.clear();
      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error) {
        deverrouillePour = null;
        const liste = await retirerCompteAppareil(userId);
        setComptesAppareil(liste);
        return {
          ok: false,
          bloque: true,
          restants: 0,
          message: `La session de ${prenom} a expiré. Reconnectez-vous avec votre email et votre mot de passe.`,
        };
      }
      // Ne pas déverrouiller ici : l'effet de session le fera une fois le nouveau profil chargé.
      return { ok: true };
    },
    [queryClient, retirerCompteApresEchecPin, sauverCompteActif],
  );

  const changerDePersonne = useCallback(async () => {
    await sauverCompteActif();
    deverrouillePour = null;
    setVerrouille(true);
  }, [sauverCompteActif]);

  const verrouillerApresSaisie = useCallback(() => {
    if (!tablettePartagee) return;
    if (timerSaisieRef.current) clearTimeout(timerSaisieRef.current);
    timerSaisieRef.current = setTimeout(() => {
      void sauverCompteActif().then(() => {
        deverrouillePour = null;
        setVerrouille(true);
      });
    }, TROIS_SECONDES);
  }, [tablettePartagee, sauverCompteActif]);

  useEffect(() => {
    return () => {
      if (timerSaisieRef.current) clearTimeout(timerSaisieRef.current);
    };
  }, []);

  const valeur = useMemo<AuthContexte>(
    () => ({
      session,
      profil,
      boutiqueNom,
      chargement,
      verrouille,
      pinPresent,
      annonce,
      comptesAppareil,
      tablettePartagee,
      modeAjoutCompte,
      deconnexion,
      rechargerProfil,
      rechargerPin,
      deverrouiller,
      definirAnnonce: setAnnonce,
      definirTablettePartagee,
      rechargerComptesAppareil,
      preparerAjoutCompte,
      annulerAjoutCompte,
      basculerVersCompte,
      retirerMonCompte,
      changerDePersonne,
      verrouillerApresSaisie,
      retirerCompteApresEchecPin,
    }),
    [
      session,
      profil,
      boutiqueNom,
      chargement,
      verrouille,
      pinPresent,
      annonce,
      comptesAppareil,
      tablettePartagee,
      modeAjoutCompte,
      deconnexion,
      rechargerProfil,
      rechargerPin,
      deverrouiller,
      definirTablettePartagee,
      rechargerComptesAppareil,
      preparerAjoutCompte,
      annulerAjoutCompte,
      basculerVersCompte,
      retirerMonCompte,
      changerDePersonne,
      verrouillerApresSaisie,
      retirerCompteApresEchecPin,
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

  // Toujours garder children (Stack) monté : le démonter pendant le chargement
  // (bascule de compte + router.replace) remontait LayoutRacine et AuthProvider.
  const overlayChargement = chargement ? (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: couleurs.fond,
        zIndex: 10,
      }}
    >
      <Ecran>
        <EtatChargement />
      </Ecran>
    </View>
  ) : null;

  return (
    <Contexte.Provider value={valeur}>
      {Platform.OS === 'web' ? (
        <View style={{ flex: 1 }}>
          {children}
          {overlayChargement}
        </View>
      ) : (
        <View
          style={{ flex: 1 }}
          onTouchStart={() => {
            (globalThis as { __prodtrackResetActivite?: () => void }).__prodtrackResetActivite?.();
          }}
        >
          {children}
          {overlayChargement}
        </View>
      )}
    </Contexte.Provider>
  );
}
