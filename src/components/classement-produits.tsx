import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TableauCaProduits } from '@/components/detail-ca-employe';
import type { ProduitClasse, TriClassementProduit } from '@/lib/ca';
import { couleurs, espacements, tailles } from '@/theme';

const TRIS: { id: TriClassementProduit; libelle: string }[] = [
  { id: 'ca', libelle: 'Rapportent le plus' },
  { id: 'vendu', libelle: 'Se vendent le plus' },
  { id: 'jete', libelle: 'Se perdent le plus' },
];

type Props = {
  produits: ProduitClasse[];
  tri: TriClassementProduit;
  onTriChange: (tri: TriClassementProduit) => void;
};

/** Classement produits : puces de tri + tableau Produit | Vendus | Jetés | CA avec rang. */
export function ClassementProduits({ produits, tri, onTriChange }: Props) {
  return (
    <View style={styles.conteneur}>
      <Text style={styles.mention}>
        {produits.length} produit{produits.length === 1 ? '' : 's'} vendu
        {produits.length === 1 ? '' : 's'} sur la période
      </Text>
      <View style={styles.puces}>
        {TRIS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => onTriChange(t.id)}
            style={[styles.puce, tri === t.id && styles.puceActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: tri === t.id }}
          >
            <Text style={[styles.puceTexte, tri === t.id && styles.puceTexteActive]}>
              {t.libelle}
            </Text>
          </Pressable>
        ))}
      </View>
      <TableauCaProduits
        produits={produits.map((p) => ({
          cle: p.cle,
          nom: p.nom,
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
    paddingTop: espacements.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: couleurs.bordure,
  },
  mention: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  puce: {
    height: 32,
    paddingHorizontal: espacements.m,
    borderRadius: 16,
    backgroundColor: couleurs.fondPuce,
    justifyContent: 'center',
  },
  puceActive: {
    backgroundColor: couleurs.principal,
  },
  puceTexte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontWeight: '600',
  },
  puceTexteActive: {
    color: couleurs.texteSurPrincipal,
  },
});
