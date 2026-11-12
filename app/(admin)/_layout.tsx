import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { ActionsEntete } from '@/components/actions-entete';
import { BarreOnglets, type PropsBarreOnglets } from '@/components/barre-onglets';
import { LogoEntete } from '@/components/logo';
import { OngletIcone } from '@/components/onglet-icone';
import { optionsOngletsPourEcran } from '@/lib/options-onglets';
import { largeurBarreLaterale, seuilOrdinateur } from '@/theme';

export default function LayoutAdmin() {
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
          title: 'Tableau de bord',
          tabBarLabel: 'Tableau',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="stats-chart-outline" nomActif="stats-chart" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="boutiques"
        options={{
          title: 'Boutiques',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="storefront-outline" nomActif="storefront" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="employes"
        options={{
          title: 'Employés',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="people-outline" nomActif="people" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="produits"
        options={{
          title: 'Produits',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="pricetag-outline" nomActif="pricetag" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Export',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="download-outline" nomActif="download" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
