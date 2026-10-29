import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
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

export default function LayoutPatissier() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: couleurs.fond,
          borderBottomWidth: 1,
          borderBottomColor: couleurs.bordure,
        },
        headerShadowVisible: false,
        headerTintColor: couleurs.texte,
        headerTitleStyle: { fontSize: 16, fontWeight: '600' },
        headerRight: () => <ActionsEntete />,
        tabBarActiveTintColor: couleurs.principal,
        tabBarInactiveTintColor: couleurs.ongletInactif,
        tabBarStyle: {
          backgroundColor: couleurs.surface,
          borderTopWidth: 1,
          borderTopColor: couleurs.bordure,
        },
        tabBarLabelStyle: { fontSize: tailles.petit },
        sceneStyle: { backgroundColor: couleurs.fond },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
      <Tabs.Screen
        name="production"
        options={{
          title: 'Production',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sorties"
        options={{
          title: 'Sorties',
          tabBarIcon: ({ color, size }) => <Ionicons name="exit" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          tabBarIcon: ({ color, size }) => <Ionicons name="layers" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
      <Tabs.Screen
        name="produits"
        options={{
          title: 'Mes produits',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="list" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
    </Tabs>
  );
}
