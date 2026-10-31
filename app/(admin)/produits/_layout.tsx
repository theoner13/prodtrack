import { Stack } from 'expo-router';

import { couleurs } from '@/theme';

export default function LayoutProduitsAdmin() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: couleurs.fond },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
