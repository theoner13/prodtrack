import { Tabs } from 'expo-router';

import { ActionsEntete } from '@/components/actions-entete';
import { LogoEntete } from '@/components/logo';
import { OngletIcone } from '@/components/onglet-icone';
import { optionsOngletsCommunes } from '@/lib/options-onglets';

export default function LayoutAdmin() {
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
