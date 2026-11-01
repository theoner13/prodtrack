import { Stack } from 'expo-router';

import { ActionsEntete } from '@/components/actions-entete';
import { optionsEnteteRetourTitre } from '@/components/entete-retour-titre';
import { LogoEntete } from '@/components/logo';
import { couleurs, polices } from '@/theme';

export default function LayoutMesProduits() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: couleurs.fond,
        },
        headerShadowVisible: false,
        headerTintColor: couleurs.texte,
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '500',
          fontFamily: polices.sans,
          color: couleurs.texte,
        },
        contentStyle: { backgroundColor: couleurs.fond },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Mes produits',
          headerLeft: () => <LogoEntete />,
          headerRight: () => <ActionsEntete />,
        }}
      />
      <Stack.Screen name="autres-boutiques" options={optionsEnteteRetourTitre('Autres boutiques')} />
      <Stack.Screen name="catalogue/[id]" options={optionsEnteteRetourTitre('Produit')} />
      <Stack.Screen name="[id]" options={optionsEnteteRetourTitre('Produit')} />
    </Stack>
  );
}
