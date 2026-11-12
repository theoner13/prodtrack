import { Stack, type Href } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { ActionsEntete } from '@/components/actions-entete';
import { LogoEntete } from '@/components/logo';
import { optionsEnteteRetourTitre } from '@/components/entete-retour-titre';
import { optionsOngletsPourEcran, styleTitreEntete } from '@/lib/options-onglets';
import { couleurs, seuilOrdinateur } from '@/theme';

export default function LayoutCommandesPatissier() {
  const { width } = useWindowDimensions();
  const ordinateur = width >= seuilOrdinateur;
  const options = optionsOngletsPourEcran(ordinateur);

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: couleurs.fond },
        headerStyle: options.headerStyle,
        headerShadowVisible: false,
        headerTintColor: couleurs.texte,
        headerTitleStyle: styleTitreEntete(ordinateur),
        headerTitleAlign: 'left',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Commandes',
          headerLeft: ordinateur ? undefined : () => <LogoEntete />,
          headerRight: ordinateur ? undefined : () => <ActionsEntete />,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={optionsEnteteRetourTitre('Commande', '/(patissier)/commandes' as Href)}
      />
    </Stack>
  );
}
