import { Link, Stack } from 'expo-router';
import { Text } from 'react-native';

import { couleurs, tailles } from '@/theme';

function LienProfil() {
  return (
    <Link href="/profil" style={{ marginRight: 16 }}>
      <Text style={{ color: couleurs.principal, fontSize: tailles.petit, fontWeight: '700' }}>Profil</Text>
    </Link>
  );
}

export default function LayoutMesProduits() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: couleurs.fond },
        headerTintColor: couleurs.texte,
        headerTitleStyle: { fontSize: tailles.normal },
        contentStyle: { backgroundColor: couleurs.fond },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Mes produits', headerRight: () => <LienProfil /> }}
      />
      <Stack.Screen name="[id]" options={{ title: 'Produit' }} />
    </Stack>
  );
}
