import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { ClocheNotifications } from '@/components/cloche-notifications';
import { couleurs, tailles } from '@/theme';

function ActionsEntete() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 16 }}>
      <ClocheNotifications />
      <Link href="/profil">
        <Text style={{ color: couleurs.principal, fontSize: tailles.petit, fontWeight: '700' }}>Profil</Text>
      </Link>
    </View>
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
        options={{ title: 'Mes produits', headerRight: () => <ActionsEntete /> }}
      />
      <Stack.Screen name="autres-boutiques" options={{ title: 'Autres boutiques' }} />
      <Stack.Screen name="catalogue/[id]" options={{ title: 'Produit' }} />
      <Stack.Screen name="[id]" options={{ title: 'Produit' }} />
    </Stack>
  );
}
