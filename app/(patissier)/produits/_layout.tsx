import { Stack } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { ActionsEntete } from '@/components/actions-entete';
import { optionsEnteteRetourTitre } from '@/components/entete-retour-titre';
import { LogoEntete } from '@/components/logo';
import { optionsOngletsPourEcran, styleTitreEntete } from '@/lib/options-onglets';
import { couleurs, seuilOrdinateur } from '@/theme';

export default function LayoutMesProduits() {
  const { width } = useWindowDimensions();
  const ordinateur = width >= seuilOrdinateur;
  const options = optionsOngletsPourEcran(ordinateur);

  return (
    <Stack
      screenOptions={{
        headerStyle: options.headerStyle,
        headerShadowVisible: false,
        headerTintColor: couleurs.texte,
        headerTitleStyle: styleTitreEntete(ordinateur),
        headerTitleAlign: 'left',
        contentStyle: { backgroundColor: couleurs.fond },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Mes produits',
          headerLeft: ordinateur ? undefined : () => <LogoEntete />,
          headerRight: ordinateur ? undefined : () => <ActionsEntete />,
        }}
      />
      <Stack.Screen name="autres-boutiques" options={optionsEnteteRetourTitre('Autres boutiques')} />
      <Stack.Screen name="catalogue/[id]" options={optionsEnteteRetourTitre('Produit')} />
      <Stack.Screen name="[id]" options={optionsEnteteRetourTitre('Produit')} />
    </Stack>
  );
}
