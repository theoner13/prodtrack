import { View } from 'react-native';

import { couleurs } from '@/theme';

// Fond des onglets encore vides. Le titre est celui de l'onglet.
export function EcranVide() {
  return <View style={{ flex: 1, backgroundColor: couleurs.fond }} />;
}
