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

export default function LayoutAdmin() {
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
          title: 'Tableau de bord',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              color={typeof color === 'string' ? color : couleurs.texte}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="boutiques"
        options={{
          title: 'Boutiques',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'storefront' : 'storefront-outline'}
              color={typeof color === 'string' ? color : couleurs.texte}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="employes"
        options={{
          title: 'Employés',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              color={typeof color === 'string' ? color : couleurs.texte}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="produits"
        options={{
          title: 'Produits',
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
        name="export"
        options={{
          title: 'Export',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'download' : 'download-outline'}
              color={typeof color === 'string' ? color : couleurs.texte}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
