import { Tabs } from 'expo-router';

import { useBadgeCommandesPatissier } from '@/api/commandes';
import { useAuth } from '@/auth/AuthProvider';
import { ActionsEntete } from '@/components/actions-entete';
import { LogoEntete } from '@/components/logo';
import { OngletIcone } from '@/components/onglet-icone';
import { optionsOngletsCommunes } from '@/lib/options-onglets';
import { couleurs } from '@/theme';

export default function LayoutPatissier() {
  const { profil } = useAuth();
  const badge = useBadgeCommandesPatissier(profil?.boutique_id ?? null);
  const nombre = badge.data ?? 0;

  return (
    <Tabs
      screenOptions={{
        ...optionsOngletsCommunes,
        headerLeft: () => <LogoEntete />,
        headerRight: () => <ActionsEntete />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Planning',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="calendar-outline" nomActif="calendar" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="production"
        options={{
          title: 'Production',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="add-circle-outline" nomActif="add-circle" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="sorties"
        options={{
          title: 'Sorties',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="arrow-redo-outline" nomActif="arrow-redo" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="cube-outline" nomActif="cube" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="produits"
        options={{
          title: 'Produits',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="pricetag-outline" nomActif="pricetag" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="commandes"
        options={{
          title: 'Commandes',
          headerShown: false,
          tabBarBadge: nombre > 0 ? nombre : undefined,
          tabBarBadgeStyle: {
            backgroundColor: couleurs.croutePoint,
            color: couleurs.texteSurPrincipal,
            fontSize: 10,
          },
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="receipt-outline" nomActif="receipt" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
