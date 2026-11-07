import { Tabs } from 'expo-router';

import { ActionsEntete } from '@/components/actions-entete';
import { LogoEntete } from '@/components/logo';
import { OngletIcone } from '@/components/onglet-icone';
import { optionsOngletsCommunes } from '@/lib/options-onglets';

export default function LayoutLaboratoire() {
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
          title: 'Stock',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="cube-outline" nomActif="cube" focused={focused} />
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
    </Tabs>
  );
}
