import { Stack, type Href } from 'expo-router';

import { ActionsEntete } from '@/components/actions-entete';
import { LogoEntete } from '@/components/logo';
import { optionsEnteteRetourTitre } from '@/components/entete-retour-titre';
import { couleurs } from '@/theme';
import { optionsOngletsCommunes } from '@/lib/options-onglets';

const retourListe = '/(vendeuse)/commandes' as Href;

export default function LayoutCommandesVendeuse() {
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
        name="nouvelle"
        options={optionsEnteteRetourTitre('Nouvelle commande', retourListe)}
      />
      <Stack.Screen
        name="[id]"
        options={optionsEnteteRetourTitre('Commande', retourListe)}
      />
      <Stack.Screen
        name="modifier/[id]"
        options={optionsEnteteRetourTitre('Modifier', retourListe)}
      />
    </Stack>
  );
}
