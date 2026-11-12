import { StyleSheet, Text, View } from 'react-native';

import { AdminCarte } from '@/components/admin-carte';
import { formatTauxPerte, type ProduitClasse } from '@/lib/ca';
import { couleurs, espacements, polices, styleTitreSection, tailles } from '@/theme';

type Props = {
  produits: ProduitClasse[];
  /** Légende boutique sous le nom, indexée par cle produit. */
  legendes?: Record<string, string>;
};

/** Tableau Produit | Jetés | Vendus | Taux, rang devant le nom, jetés et taux en orange si > 0. */
export function ClassementPertes({ produits, legendes }: Props) {
  if (produits.length === 0) {
    return <Text style={styles.vide}>Aucune perte sur la période.</Text>;
  }

  return (
    <AdminCarte style={styles.conteneur}>
      <Text style={styles.titre}>Produits qui se perdent le plus</Text>
      <View style={styles.tableau}>
        <View style={styles.ligne} accessibilityRole="header">
          <Text style={[styles.entete, styles.colLibelle]} numberOfLines={1}>
            Produit
          </Text>
          <Text style={[styles.entete, styles.colNombre]} numberOfLines={1}>
            Jetés
          </Text>
          <Text style={[styles.entete, styles.colNombre]} numberOfLines={1}>
            Vendus
          </Text>
          <Text style={[styles.entete, styles.colTaux]} numberOfLines={1}>
            Taux
          </Text>
        </View>
        {produits.map((p, i) => {
          const libelle = `${i + 1}. ${p.nom}`;
          const legende = legendes?.[p.cle];
          return (
            <View
              key={p.cle}
              style={styles.ligne}
              accessible
              accessibilityLabel={`${libelle}${legende ? ` · ${legende}` : ''} : ${p.jete} jetés, ${p.vendu} vendus, taux ${formatTauxPerte(p.tauxPerte)}`}
            >
              <View style={styles.colLibelle}>
                <Text style={styles.texte}>{libelle}</Text>
                {legende ? <Text style={styles.legende}>{legende}</Text> : null}
              </View>
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
    </AdminCarte>
  );
}

const LARGEUR_NOMBRE = 64;
const LARGEUR_TAUX = 64;

const styles = StyleSheet.create({
  conteneur: {
    gap: espacements.s,
    width: '100%',
    marginTop: espacements.s,
  },
  titre: {
    ...styleTitreSection,
  },
  tableau: {
    width: '100%',
    overflow: 'hidden',
    marginHorizontal: -4,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordureDouce,
    gap: 4,
  },
  entete: {
    fontSize: 13,
    color: couleurs.texteMuet,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: polices.sans,
  },
  texte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
  },
  legende: {
    fontSize: tailles.legend,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
    marginTop: 2,
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
    color: couleurs.accentFonce,
  },
  vide: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    paddingVertical: espacements.s,
    marginTop: espacements.s,
    fontFamily: polices.sans,
  },
});
