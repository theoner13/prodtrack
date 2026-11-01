import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { ActionsEntete } from '@/components/actions-entete';
import { BoutonRetour } from '@/components/bouton-retour';
import { LogoEntete } from '@/components/logo';
import { couleurs, polices } from '@/theme';

function EnteteRetour() {
  return (
    <View style={{ marginLeft: 4 }}>
      <BoutonRetour
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace('/(patissier)/produits');
        }}
      />
    </View>
  );
}

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
      <Stack.Screen
        name="autres-boutiques"
        options={{
          title: 'Autres boutiques',
          headerLeft: () => <EnteteRetour />,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="catalogue/[id]"
        options={{
          title: 'Produit',
          headerLeft: () => <EnteteRetour />,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Produit',
          headerLeft: () => <EnteteRetour />,
          headerBackVisible: false,
        }}
      />
    </Stack>
  );
}
