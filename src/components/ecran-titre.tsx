import { StyleSheet, Text, View } from 'react-native';

type Props = {
  titre: string;
};

export function EcranTitre({ titre }: Props) {
  return (
    <View style={styles.conteneur}>
      <Text style={styles.titre}>{titre}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titre: {
    fontSize: 24,
  },
});
