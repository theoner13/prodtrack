import { StyleSheet, Text, View } from 'react-native';

import { formatDateFr, type DetailCaFabricant } from '@/lib/ca';
import { formatEuros } from '@/lib/format';
import { couleurs, espacements, tailles } from '@/theme';

type Props = {
  detail: DetailCaFabricant;
};

/** Détail CA d'un employé : Par produit / Par jour / Par semaine / Par mois. */
export function DetailCaEmploye({ detail }: Props) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailTitre}>Par produit</Text>
      {detail.produits.length === 0 ? (
        <Text style={styles.detailLigne}>Aucune vente</Text>
      ) : (
        detail.produits.map((p) => (
          <Text key={p.cle} style={styles.detailLigne}>
            {p.nom} — {formatEuros(p.caCentimes)}
          </Text>
        ))
      )}
      <Text style={styles.detailTitre}>Par jour</Text>
      {detail.jours.length === 0 ? (
        <Text style={styles.detailLigne}>Aucune vente</Text>
      ) : (
        detail.jours.map((j) => (
          <Text key={j.cle} style={styles.detailLigne}>
            {formatDateFr(j.cle)} — {formatEuros(j.caCentimes)}
          </Text>
        ))
      )}
      <Text style={styles.detailTitre}>Par semaine</Text>
      {detail.semaines.length === 0 ? (
        <Text style={styles.detailLigne}>Aucune vente</Text>
      ) : (
        detail.semaines.map((s) => (
          <Text key={s.cle} style={styles.detailLigne}>
            {formatDateFr(s.cle)} — {formatEuros(s.caCentimes)}
          </Text>
        ))
      )}
      <Text style={styles.detailTitre}>Par mois</Text>
      {detail.mois.length === 0 ? (
        <Text style={styles.detailLigne}>Aucune vente</Text>
      ) : (
        detail.mois.map((m) => {
          const [annee, moisNum] = m.cle.split('-');
          const libelle = annee && moisNum ? `${moisNum}/${annee}` : m.cle;
          return (
            <Text key={m.cle} style={styles.detailLigne}>
              {libelle} — {formatEuros(m.caCentimes)}
            </Text>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  detail: {
    gap: espacements.xs,
    paddingTop: espacements.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: couleurs.bordure,
  },
  detailTitre: {
    fontSize: tailles.section,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    marginTop: espacements.s,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailLigne: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    paddingVertical: 4,
  },
});
