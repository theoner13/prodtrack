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

export default function LayoutVendeuse() {
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
          title: 'Fin de journée',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'sunny' : 'sunny-outline'}
              color={typeof color === 'string' ? color : couleurs.texte}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="historique"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              color={typeof color === 'string' ? color : couleurs.texte}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
