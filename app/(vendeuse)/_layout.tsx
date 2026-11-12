import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { ActionsEntete } from '@/components/actions-entete';
import { BarreOnglets, type PropsBarreOnglets } from '@/components/barre-onglets';
import { LogoEntete } from '@/components/logo';
import { OngletIcone } from '@/components/onglet-icone';
import { optionsOngletsPourEcran } from '@/lib/options-onglets';
import { largeurBarreLaterale, seuilOrdinateur } from '@/theme';

export default function LayoutVendeuse() {
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
