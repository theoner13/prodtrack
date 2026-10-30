import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Text, View } from 'react-native';

import { ClocheNotifications } from '@/components/cloche-notifications';
import { LogoEntete } from '@/components/logo';
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
        headerLeft: () => <LogoEntete />,
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              color={typeof color === 'string' ? color : couleurs.texte}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="production"
        options={{
          title: 'Production',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              color={typeof color === 'string' ? color : couleurs.texte}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sorties"
        options={{
          title: 'Sorties',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'arrow-redo' : 'arrow-redo-outline'}
              color={typeof color === 'string' ? color : couleurs.texte}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'cube' : 'cube-outline'}
              color={typeof color === 'string' ? color : couleurs.texte}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="produits"
        options={{
          title: 'Mes produits',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'pricetags' : 'pricetags-outline'}
              color={typeof color === 'string' ? color : couleurs.texte}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
