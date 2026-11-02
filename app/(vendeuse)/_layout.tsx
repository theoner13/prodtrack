import { Tabs } from 'expo-router';

import { ActionsEntete } from '@/components/actions-entete';
import { LogoEntete } from '@/components/logo';
import { OngletIcone } from '@/components/onglet-icone';
import { optionsOngletsCommunes } from '@/lib/options-onglets';

export default function LayoutVendeuse() {
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
          title: 'Fin de journée',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="sunny-outline" nomActif="sunny" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="historique"
        options={{
          title: 'Historique',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="time-outline" nomActif="time" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="commandes"
        options={{
          title: 'Commandes',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="receipt-outline" nomActif="receipt" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
