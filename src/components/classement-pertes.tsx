import { StyleSheet, Text, View } from 'react-native';

import { formatTauxPerte, type ProduitClasse } from '@/lib/ca';
import { couleurs, espacements, tailles } from '@/theme';

type Props = {
  produits: ProduitClasse[];
};

/** Tableau Produit | Jetés | Vendus | Taux, rang devant le nom, jetés et taux en orange si > 0. */
export function ClassementPertes({ produits }: Props) {
  if (produits.length === 0) {
    return <Text style={styles.vide}>Aucune perte sur la période.</Text>;
  }

  return (
    <View style={styles.conteneur}>
      <Text style={styles.titre}>Produits qui se perdent le plus</Text>
      <View style={styles.tableau}>
        <View style={styles.ligne} accessibilityRole="header">
          <Text style={[styles.entete, styles.colLibelle]}>Produit</Text>
          <Text style={[styles.entete, styles.colNombre]}>Jetés</Text>
          <Text style={[styles.entete, styles.colNombre]}>Vendus</Text>
          <Text style={[styles.entete, styles.colTaux]}>Taux</Text>
        </View>
        {produits.map((p, i) => {
          const libelle = `${i + 1}. ${p.nom}`;
          return (
            <View
              key={p.cle}
              style={styles.ligne}
              accessible
              accessibilityLabel={`${libelle} : ${p.jete} jetés, ${p.vendu} vendus, taux ${formatTauxPerte(p.tauxPerte)}`}
            >
              <Text style={[styles.texte, styles.colLibelle]}>{libelle}</Text>
              <Text
                style={[
                  styles.texte,
                  styles.colNombre,
                  p.jete > 0 ? styles.alerte : null,
                ]}
              >
                {p.jete}
              </Text>
              <Text style={[styles.texte, styles.colNombre]}>{p.vendu}</Text>
              <Text
                style={[
                  styles.texte,
                  styles.colTaux,
                  p.tauxPerte > 0 ? styles.alerte : null,
                ]}
              >
                {formatTauxPerte(p.tauxPerte)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const LARGEUR_NOMBRE = 48;
const LARGEUR_TAUX = 64;

const styles = StyleSheet.create({
  conteneur: {
    gap: espacements.s,
    width: '100%',
    marginTop: espacements.s,
  },
  titre: {
    fontSize: tailles.section,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableau: {
    width: '100%',
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
    gap: 4,
  },
  entete: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    fontWeight: '500',
  },
  texte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
  },
  colLibelle: {
    flex: 1,
    flexShrink: 1,
    paddingRight: 4,
  },
  colNombre: {
    width: LARGEUR_NOMBRE,
    textAlign: 'right',
  },
  colTaux: {
    width: LARGEUR_TAUX,
    textAlign: 'right',
  },
  alerte: {
    color: couleurs.alerte,
  },
  vide: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    paddingVertical: espacements.s,
    marginTop: espacements.s,
  },
});
