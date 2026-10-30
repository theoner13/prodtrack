import { StyleSheet, Text, View } from 'react-native';

import { formatDateFr, type DetailCaFabricant, type GroupeCa } from '@/lib/ca';
import { formatEuros } from '@/lib/format';
import { couleurs, espacements, tailles } from '@/theme';

type Props = {
  detail: DetailCaFabricant;
};

type LigneTableau = {
  cle: string;
  libelle: string;
  vendu: number;
  jete: number;
  caCentimes: number;
};

function libelleSemaine(lundi: string): string {
  const [, mois, jour] = lundi.split('-');
  if (!mois || !jour) return lundi;
  return `Semaine du ${jour}/${mois}`;
}

function libelleMois(cle: string): string {
  const [annee, moisNum] = cle.split('-');
  return annee && moisNum ? `${moisNum}/${annee}` : cle;
}

function totalGroupes(groupes: { vendu: number; jete: number; caCentimes: number }[]) {
  let vendu = 0;
  let jete = 0;
  let caCentimes = 0;
  for (const g of groupes) {
    vendu += g.vendu;
    jete += g.jete;
    caCentimes += g.caCentimes;
  }
  return { vendu, jete, caCentimes };
}

function labelAccessibilite(libelle: string, vendu: number, jete: number, caCentimes: number): string {
  return `${libelle} : ${vendu} vendus, ${jete} jetés, ${formatEuros(caCentimes)}`;
}

function EnTete({ premiereColonne }: { premiereColonne: string }) {
  return (
    <View style={styles.ligne} accessibilityRole="header">
      <Text style={[styles.entete, styles.colLibelle]}>{premiereColonne}</Text>
      <Text style={[styles.entete, styles.colNombre]}>Vendus</Text>
      <Text style={[styles.entete, styles.colNombre]}>Jetés</Text>
      <Text style={[styles.entete, styles.colCa]}>CA</Text>
    </View>
  );
}

function LigneCa({
  libelle,
  vendu,
  jete,
  caCentimes,
  gras,
}: {
  libelle: string;
  vendu: number;
  jete: number;
  caCentimes: number;
  gras?: boolean;
}) {
  const styleTexte = gras ? styles.texteGras : styles.texte;
  return (
    <View
      style={styles.ligne}
      accessible
      accessibilityLabel={labelAccessibilite(libelle, vendu, jete, caCentimes)}
    >
      <Text style={[styleTexte, styles.colLibelle]}>{libelle}</Text>
      <Text style={[styleTexte, styles.colNombre]}>{vendu}</Text>
      <Text
        style={[
          styleTexte,
          styles.colNombre,
          jete > 0 ? styles.jeteAlerte : null,
        ]}
      >
        {jete}
      </Text>
      <Text style={[styleTexte, styles.colCa]}>{formatEuros(caCentimes)}</Text>
    </View>
  );
}

function TableauCa({
  premiereColonne,
  lignes,
  avecTotal,
}: {
  premiereColonne: string;
  lignes: LigneTableau[];
  avecTotal?: boolean;
}) {
  if (lignes.length === 0) {
    return <Text style={styles.vide}>Aucune vente</Text>;
  }
  const total = avecTotal ? totalGroupes(lignes) : null;
  return (
    <View style={styles.tableau}>
      <EnTete premiereColonne={premiereColonne} />
      {lignes.map((l) => (
        <LigneCa
          key={l.cle}
          libelle={l.libelle}
          vendu={l.vendu}
          jete={l.jete}
          caCentimes={l.caCentimes}
        />
      ))}
      {total ? (
        <LigneCa
          libelle="Total"
          vendu={total.vendu}
          jete={total.jete}
          caCentimes={total.caCentimes}
          gras
        />
      ) : null}
    </View>
  );
}

function periodesRecentes(groupes: GroupeCa[]): GroupeCa[] {
  // parJour / parSemaine / parMois sont chronologiques croissants → on inverse pour le plus récent en haut.
  return [...groupes].reverse();
}

/** Détail CA d'un employé : Par produit / Par jour / Par semaine / Par mois. */
export function DetailCaEmploye({ detail }: Props) {
  const produits: LigneTableau[] = detail.produits.map((p) => ({
    cle: p.cle,
    libelle: p.nom,
    vendu: p.vendu,
    jete: p.jete,
    caCentimes: p.caCentimes,
  }));

  const jours: LigneTableau[] = periodesRecentes(detail.jours).map((j) => ({
    cle: j.cle,
    libelle: formatDateFr(j.cle),
    vendu: j.vendu,
    jete: j.jete,
    caCentimes: j.caCentimes,
  }));

  const semaines: LigneTableau[] = periodesRecentes(detail.semaines).map((s) => ({
    cle: s.cle,
    libelle: libelleSemaine(s.cle),
    vendu: s.vendu,
    jete: s.jete,
    caCentimes: s.caCentimes,
  }));

  const mois: LigneTableau[] = periodesRecentes(detail.mois).map((m) => ({
    cle: m.cle,
    libelle: libelleMois(m.cle),
    vendu: m.vendu,
    jete: m.jete,
    caCentimes: m.caCentimes,
  }));

  return (
    <View style={styles.detail}>
      <Text style={styles.detailTitre}>Par produit</Text>
      <TableauCa premiereColonne="Produit" lignes={produits} avecTotal />

      <Text style={styles.detailTitre}>Par jour</Text>
      {/* Pas de Total : redondant avec le CA déjà affiché au-dessus. */}
      <TableauCa premiereColonne="Jour" lignes={jours} />

      <Text style={styles.detailTitre}>Par semaine</Text>
      <TableauCa premiereColonne="Semaine" lignes={semaines} />

      <Text style={styles.detailTitre}>Par mois</Text>
      <TableauCa premiereColonne="Mois" lignes={mois} />
    </View>
  );
}

const LARGEUR_NOMBRE = 48;
const LARGEUR_CA = 72;

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
  texteGras: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontWeight: '700',
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
  colCa: {
    width: LARGEUR_CA,
    textAlign: 'right',
  },
  jeteAlerte: {
    color: couleurs.alerte,
  },
  vide: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    paddingVertical: 4,
  },
});
