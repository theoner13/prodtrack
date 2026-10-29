import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import type { QueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

let jetonActuel: string | null = null;
let ecouteursPrets = false;

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
}

function appareilEligible(): boolean {
  return Platform.OS !== 'web' && Device.isDevice;
}

function ecranDepuisDonnees(data: Record<string, unknown> | undefined): Href | null {
  const ecran = data?.ecran;
  if (typeof ecran === 'string' && ecran.length > 0) return ecran as Href;
  return null;
}

function ouvrirEcranNotification(data: Record<string, unknown> | undefined): void {
  const ecran = ecranDepuisDonnees(data);
  if (!ecran) return;
  router.push(ecran);
}

/** Bannière quand l'appli est ouverte ; à appeler une seule fois au démarrage natif. */
export function preparerAffichageNotifications(): void {
  if (!appareilEligible()) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Écouteurs : rafraîchir la cloche à la réception, naviguer au toucher.
 * Le Gardien mémorise déjà l'écran si l'appli est verrouillée.
 */
export function demarrerEcouteNotifications(queryClient: QueryClient): () => void {
  if (!appareilEligible() || ecouteursPrets) return () => undefined;
  ecouteursPrets = true;

  const recu = Notifications.addNotificationReceivedListener(() => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  });

  const reponse = Notifications.addNotificationResponseReceivedListener((reponseNotif) => {
    const data = reponseNotif.notification.request.content.data as
      | Record<string, unknown>
      | undefined;
    ouvrirEcranNotification(data);
  });

  void Notifications.getLastNotificationResponseAsync().then((derniere) => {
    if (!derniere) return;
    const data = derniere.notification.request.content.data as
      | Record<string, unknown>
      | undefined;
    ouvrirEcranNotification(data);
  });

  return () => {
    recu.remove();
    reponse.remove();
    ecouteursPrets = false;
  };
}

/** Enregistre (ou rattache) le jeton Expo push pour le profil connecté. */
export async function enregistrerPush(): Promise<void> {
  try {
    if (!appareilEligible() || !supabase) return;

    const idProjet = projectId();
    if (!idProjet) {
      if (__DEV__) {
        console.info('[push] projectId EAS absent : jeton non enregistré (eas init plus tard).');
      }
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifications ProdTrack',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const { status: actuel } = await Notifications.getPermissionsAsync();
    let final = actuel;
    if (actuel !== 'granted') {
      const demande = await Notifications.requestPermissionsAsync();
      final = demande.status;
    }
    if (final !== 'granted') return;

    const jeton = (
      await Notifications.getExpoPushTokenAsync({ projectId: idProjet })
    ).data;
    jetonActuel = jeton;

    const plateforme = Platform.OS === 'ios' ? 'ios' : 'android';
    const { error } = await supabase.rpc('enregistrer_jeton_push', {
      p_jeton: jeton,
      p_plateforme: plateforme,
    });
    if (error && __DEV__) {
      console.info('[push] enregistrement échoué :', error.message);
    }
  } catch (err) {
    if (__DEV__) {
      console.info('[push] enregistrerPush échoué :', err);
    }
  }
}

/** Supprime le jeton de cet appareil pour le profil connecté (retrait du compte). */
export async function supprimerPush(): Promise<void> {
  try {
    if (!appareilEligible() || !supabase || !jetonActuel) return;
    const { error } = await supabase.rpc('supprimer_jeton_push', {
      p_jeton: jetonActuel,
    });
    if (error && __DEV__) {
      console.info('[push] suppression échouée :', error.message);
    }
  } catch (err) {
    if (__DEV__) {
      console.info('[push] supprimerPush échoué :', err);
    }
  }
}
