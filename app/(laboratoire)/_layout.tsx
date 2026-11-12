import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { ActionsEntete } from '@/components/actions-entete';
import { BarreOnglets, type PropsBarreOnglets } from '@/components/barre-onglets';
import { LogoEntete } from '@/components/logo';
import { OngletIcone } from '@/components/onglet-icone';
import { optionsOngletsPourEcran } from '@/lib/options-onglets';
import { largeurBarreLaterale, seuilOrdinateur } from '@/theme';

export default function LayoutLaboratoire() {
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
          title: 'Stock',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="cube-outline" nomActif="cube" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          tabBarIcon: ({ focused }) => (
            <OngletIcone
              nom="calendar-outline"
              nomActif="calendar"
              focused={focused}
            />
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
        name="commandes"
        options={{
          title: 'Commandes',
          tabBarIcon: ({ focused }) => (
            <OngletIcone nom="list-outline" nomActif="list" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
