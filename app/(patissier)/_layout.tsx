import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { useBadgeCommandesPatissier } from '@/api/commandes';
import { useAuth } from '@/auth/AuthProvider';
import { ActionsEntete } from '@/components/actions-entete';
import { BarreOnglets, type PropsBarreOnglets } from '@/components/barre-onglets';
import { LogoEntete } from '@/components/logo';
import { OngletIcone } from '@/components/onglet-icone';
import { optionsOngletsPourEcran } from '@/lib/options-onglets';
import { couleurs, largeurBarreLaterale, seuilOrdinateur } from '@/theme';

export default function LayoutPatissier() {
  const { profil } = useAuth();
  const badge = useBadgeCommandesPatissier(profil?.boutique_id ?? null);
  const nombre = badge.data ?? 0;
  const { width } = useWindowDimensions();
  const ordinateur = width >= seuilOrdinateur;

  return (
    <Tabs
      tabBar={(props) => <BarreOnglets {...(props as unknown as PropsBarreOnglets)} />}
      screenOptions={{
        ...optionsOngletsPourEcran(ordinateur),
        tabBarPosition: ordinateur ? 'left' : 'bottom',
        tabBarLabelPosition: ordinateur ? 'beside-icon' : 'below-icon',
        tabBarStyle: ordinateur
          ? {
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              borderRightWidth: 0,
              elevation: 0,
              width: largeurBarreLaterale,
            }
          : optionsOngletsPourEcran(ordinateur).tabBarStyle,
        headerLeft: ordinateur ? undefined : () => <LogoEntete />,
        headerRight: ordinateur ? undefined : () => <ActionsEntete />,
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
