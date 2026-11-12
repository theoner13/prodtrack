import { StyleSheet, Text, View } from 'react-native';

import { AdminPuce } from '@/components/admin-puce';
import { TableauCaProduits } from '@/components/detail-ca-employe';
import type { ProduitClasse, TriClassementProduit } from '@/lib/ca';
import { couleurs, espacements, polices, tailles } from '@/theme';

const TRIS: { id: TriClassementProduit; libelle: string }[] = [
  { id: 'ca', libelle: 'Rapportent le plus' },
  { id: 'vendu', libelle: 'Se vendent le plus' },
  { id: 'jete', libelle: 'Se perdent le plus' },
];

type Props = {
  produits: ProduitClasse[];
  tri: TriClassementProduit;
  onTriChange: (tri: TriClassementProduit) => void;
  /** Légende boutique sous le nom, indexée par cle produit. */
  legendes?: Record<string, string>;
};

/** Classement produits : puces de tri + tableau Produit | Vendus | Jetés | CA avec rang. */
export function ClassementProduits({ produits, tri, onTriChange, legendes }: Props) {
  return (
    <View style={styles.conteneur}>
      <Text style={styles.mention}>
        {produits.length} produit{produits.length === 1 ? '' : 's'} vendu
        {produits.length === 1 ? '' : 's'} sur la période
      </Text>
      <View style={styles.puces}>
        {TRIS.map((t) => (
          <AdminPuce
            key={t.id}
            libelle={t.libelle}
            active={tri === t.id}
            onPress={() => onTriChange(t.id)}
          />
        ))}
      </View>
      <TableauCaProduits
        produits={produits.map((p) => ({
          cle: p.cle,
          nom: p.nom,
          legende: legendes?.[p.cle],
          vendu: p.vendu,
          jete: p.jete,
          caCentimes: p.caCentimes,
        }))}
        avecRang
      />
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    gap: espacements.s,
    paddingTop: espacements.xs,
  },
  mention: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
});
