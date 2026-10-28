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

export default function LayoutVendeuse() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: couleurs.fond },
        headerTintColor: couleurs.texte,
        headerTitleStyle: { fontSize: tailles.normal },
        headerRight: () => <ActionsEntete />,
        tabBarActiveTintColor: couleurs.principal,
        tabBarInactiveTintColor: couleurs.texteSecondaire,
        tabBarStyle: { backgroundColor: couleurs.surface },
        tabBarLabelStyle: { fontSize: tailles.petit },
        sceneStyle: { backgroundColor: couleurs.fond },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Fin de journée',
          tabBarIcon: ({ color, size }) => <Ionicons name="sunny" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
      <Tabs.Screen
        name="historique"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
    </Tabs>
  );
}
