import { Stack, type Href } from 'expo-router';

import { ActionsEntete } from '@/components/actions-entete';
import { LogoEntete } from '@/components/logo';
import { optionsEnteteRetourTitre } from '@/components/entete-retour-titre';
import { couleurs } from '@/theme';
import { optionsOngletsCommunes } from '@/lib/options-onglets';

export default function LayoutCommandesPatissier() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: couleurs.fond },
        headerStyle: optionsOngletsCommunes.headerStyle,
        headerShadowVisible: false,
        headerTintColor: couleurs.texte,
        headerTitleStyle: optionsOngletsCommunes.headerTitleStyle,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Commandes',
          headerLeft: () => <LogoEntete />,
          headerRight: () => <ActionsEntete />,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={optionsEnteteRetourTitre('Commande', '/(patissier)/commandes' as Href)}
      />
    </Stack>
  );
}
