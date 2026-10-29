import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useMarquerToutesLues, useNotifications } from '@/api/notifications';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { couleurs, espacements, tailles } from '@/theme';

function formatMoment(iso: string): string {
  const date = new Date(iso);
  const jour = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hh = (parts.find((part) => part.type === 'hour')?.value ?? '00').padStart(2, '0');
  const mm = (parts.find((part) => part.type === 'minute')?.value ?? '00').padStart(2, '0');
  return `${jour} à ${hh}:${mm}`;
}

export default function EcranNotifications() {
  const { profil } = useAuth();
  const liste = useNotifications(profil?.id ?? null);
  const marquerTout = useMarquerToutesLues();
  const dejaMarque = useRef(false);
  const [nonLues, setNonLues] = useState<ReadonlySet<string>>(new Set());
  const [erreurMarquage, setErreurMarquage] = useState<string | null>(null);

  useEffect(() => {
    if (!profil || !liste.isSuccess || dejaMarque.current) return;
    dejaMarque.current = true;
    setNonLues(new Set(liste.data.filter((notification) => !notification.lu).map((notification) => notification.id)));
    void marquerTout.mutateAsync(profil.id).catch((erreur: unknown) => {
      setErreurMarquage(messageErreur(erreur));
    });
  }, [profil, liste.isSuccess, liste.data, marquerTout]);

  function retour() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const accueil: Href =
      profil?.role === 'admin' ? '/(admin)' : profil?.role === 'vendeuse' ? '/(vendeuse)' : '/(patissier)';
    router.replace(accueil);
  }

  if (liste.isLoading) {
    return (
      <Ecran>
        <EtatChargement />
      </Ecran>
    );
  }

  if (liste.isError) {
    return (
      <Ecran>
        <Bouton titre="Retour" variante="secondaire" onPress={retour} />
        <EtatErreur message={messageErreur(liste.error)} onReessayer={() => void liste.refetch()} />
      </Ecran>
    );
  }

  const notifications = liste.data ?? [];

  return (
    <Ecran
      titre="Notifications"
      defilement
      enRafraichissement={liste.isRefetching}
      onRafraichir={() => void liste.refetch()}
    >
      <Bouton titre="Retour" variante="secondaire" onPress={retour} />
      {erreurMarquage ? <Text style={styles.erreur}>{erreurMarquage}</Text> : null}
      {notifications.length === 0 ? (
        <EtatVide message="Aucune notification pour l'instant." />
      ) : (
        notifications.map((notification) => {
          const nonLue = nonLues.has(notification.id) || !notification.lu;
          return (
            <View key={notification.id} style={styles.carte}>
              <Text style={[styles.titre, nonLue && styles.nonLue]}>{notification.titre}</Text>
              <Text style={styles.message}>{notification.message}</Text>
              <Text style={styles.date}>{formatMoment(notification.created_at)}</Text>
            </View>
          );
        })
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carte: {
    gap: espacements.xs,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
  },
  titre: {
    fontSize: tailles.normal,
    color: couleurs.texte,
  },
  nonLue: {
    fontWeight: '600',
  },
  message: {
    fontSize: tailles.petit,
    color: couleurs.texte,
  },
  date: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
});
