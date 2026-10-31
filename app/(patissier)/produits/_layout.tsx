import { Stack } from 'expo-router';

import { ActionsEntete } from '@/components/actions-entete';
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
      <Stack.Screen name="autres-boutiques" options={{ title: 'Autres boutiques' }} />
      <Stack.Screen name="catalogue/[id]" options={{ title: 'Produit' }} />
      <Stack.Screen name="[id]" options={{ title: 'Produit' }} />
    </Stack>
  );
}
