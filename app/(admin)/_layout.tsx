import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Text } from 'react-native';

import { couleurs, tailles } from '@/theme';

function LienProfil() {
  return (
    <Link href="/profil" style={{ marginRight: 16 }}>
      <Text style={{ color: couleurs.principal, fontSize: tailles.petit, fontWeight: '700' }}>Profil</Text>
    </Link>
  );
}

export default function LayoutAdmin() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: couleurs.fond },
        headerTintColor: couleurs.texte,
        headerTitleStyle: { fontSize: tailles.normal },
        headerRight: () => <LienProfil />,
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
          title: 'Tableau de bord',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
      <Tabs.Screen
        name="boutiques"
        options={{
          title: 'Boutiques',
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
      <Tabs.Screen
        name="employes"
        options={{
          title: 'Employés',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
      <Tabs.Screen
        name="produits"
        options={{
          title: 'Produits',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Export',
          tabBarIcon: ({ color, size }) => <Ionicons name="download" color={typeof color === 'string' ? color : couleurs.texte} size={size} />,
        }}
      />
    </Tabs>
  );
}
