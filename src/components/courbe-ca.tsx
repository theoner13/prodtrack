import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  indicesLibellesVisibles,
  libelleBulleCourbe,
  libelleJourCourbe,
  maxRepereCourbe,
  pointsCourbeCa,
  reperesCourbe,
  segmentEntrePoints,
  styleLibellePourPlage,
  type LigneCaJour,
} from '@/lib/courbe-ca';
import { formatEuros } from '@/lib/format';
import { couleurs, polices, tailles } from '@/theme';

const HAUTEUR = 180;
const HAUTEUR_TRACE = 120;
const MARGE_GAUCHE = 58;
const MARGE_DROITE = 12;
const MARGE_HAUT = 12;
const TAILLE_POINT = 8;
const TAILLE_POINT_ACTIF = 12;
const EPAISSEUR_LIGNE = 2.5;

type Props = {
  lignes: LigneCaJour[];
  debut: string;
  fin: string;
  /** Jour mis en avant (dernier de la plage ou jour choisi). */
  jourMisEnAvant?: string;
};

export function CourbeCa({ lignes, debut, fin, jourMisEnAvant }: Props) {
  const [largeur, setLargeur] = useState(0);
  const [selection, setSelection] = useState<number | null>(null);

  const points = useMemo(() => pointsCourbeCa(lignes, debut, fin), [lignes, debut, fin]);
  const styleLibelle = useMemo(() => styleLibellePourPlage(debut, fin), [debut, fin]);
  const maxBrut = useMemo(
    () => Math.max(0, ...points.map((p) => p.caCentimes)),
    [points],
  );
  const maxAxe = maxRepereCourbe(maxBrut);
  const reperes = useMemo(() => reperesCourbe(maxBrut), [maxBrut]);
  const jourFocus = jourMisEnAvant ?? fin;

  const largeurTrace = Math.max(0, largeur - MARGE_GAUCHE - MARGE_DROITE);
  const indicesLibelles = useMemo(
    () => indicesLibellesVisibles(points.length, largeurTrace),
    [points.length, largeurTrace],
  );
  const libellesVisibles = useMemo(() => new Set(indicesLibelles), [indicesLibelles]);

  const coords = useMemo(() => {
    if (points.length === 0 || largeurTrace <= 0) return [];
    const n = points.length;
    return points.map((p, i) => {
      const x =
        n === 1
          ? MARGE_GAUCHE + largeurTrace / 2
          : MARGE_GAUCHE + (i / (n - 1)) * largeurTrace;
      const y = MARGE_HAUT + HAUTEUR_TRACE * (1 - p.caCentimes / maxAxe);
      return { ...p, x, y };
    });
  }, [points, largeurTrace, maxAxe]);

  const resume = useMemo(() => {
    if (points.length === 0) return "Courbe du chiffre d'affaires";
    const premier = points[0]!;
    const dernier = points[points.length - 1]!;
    return `Courbe du chiffre d'affaires du ${libelleJourCourbe(premier.jour, styleLibelle)} au ${libelleJourCourbe(dernier.jour, styleLibelle)}, maximum ${formatEuros(maxBrut)}`;
  }, [points, styleLibelle, maxBrut]);

  function onLayout(e: LayoutChangeEvent) {
    const w = Math.min(720, e.nativeEvent.layout.width);
    if (w > 0 && Math.abs(w - largeur) > 0.5) setLargeur(w);
  }

  const pointSelectionne = selection !== null ? coords[selection] : null;

  return (
    <View
      style={styles.conteneur}
      onLayout={onLayout}
      accessible
      accessibilityLabel={resume}
    >
      {largeur > 0 ? (
        <View style={styles.zone} accessibilityElementsHidden>
          {reperes.map((r) => {
            const y = MARGE_HAUT + HAUTEUR_TRACE * (1 - r.valeur / maxAxe);
            return (
              <View key={r.valeur} style={[styles.repere, { top: y }]} pointerEvents="none">
                <Text style={styles.repereLibelle} numberOfLines={1}>
                  {r.libelle}
                </Text>
                <View style={styles.repereLigne} />
              </View>
            );
          })}

          {coords.slice(0, -1).map((a, i) => {
            const b = coords[i + 1]!;
            const seg = segmentEntrePoints(a.x, a.y, b.x, b.y);
            if (seg.longueur < 0.5) return null;
            return (
              <View
                key={`s-${a.jour}`}
                pointerEvents="none"
                style={[
                  styles.segment,
                  {
                    left: seg.x,
                    top: seg.y - EPAISSEUR_LIGNE / 2,
                    width: seg.longueur,
                    transform: [{ rotate: `${seg.angleDeg}deg` }],
                  },
                ]}
              />
            );
          })}

          {coords.map((p) => {
            const actif = p.jour === jourFocus;
            const taille = actif ? TAILLE_POINT_ACTIF : TAILLE_POINT;
            const surligne = selection === p.index;
            return (
              <Pressable
                key={p.jour}
                onPress={() => setSelection((s) => (s === p.index ? null : p.index))}
                // Survol web (ignoré nativement si non supporté)
                onHoverIn={() => setSelection(p.index)}
                onHoverOut={() => setSelection((s) => (s === p.index ? null : s))}
                accessibilityRole="button"
                accessibilityLabel={`${libelleBulleCourbe(p.jour, p.caCentimes)}`}
                hitSlop={10}
                style={[
                  styles.point,
                  {
                    left: p.x - taille / 2,
                    top: p.y - taille / 2,
                    width: taille,
                    height: taille,
                    borderRadius: taille / 2,
                    backgroundColor: actif || surligne ? couleurs.croute : couleurs.principal,
                    borderColor: couleurs.fond,
                  },
                ]}
              />
            );
          })}

          <View style={styles.labels} pointerEvents="none">
            {coords.map((p) =>
              libellesVisibles.has(p.index) ? (
                <Text
                  key={`l-${p.jour}`}
                  style={[
                    styles.labelJour,
                    {
                      left: p.x - 28,
                      width: 56,
                    },
                  ]}
                >
                  {libelleJourCourbe(p.jour, styleLibelle)}
                </Text>
              ) : null,
            )}
          </View>

          {pointSelectionne ? (
            <View
              pointerEvents="none"
              style={[
                styles.bulle,
                {
                  left: Math.min(
                    Math.max(8, pointSelectionne.x - 70),
                    Math.max(8, largeur - 148),
                  ),
                  top: Math.max(0, pointSelectionne.y - 36),
                },
              ]}
            >
              <Text style={styles.bulleTexte}>
                {libelleBulleCourbe(pointSelectionne.jour, pointSelectionne.caCentimes)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.zone} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    marginTop: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'stretch',
  },
  zone: {
    height: HAUTEUR,
    position: 'relative',
  },
  repere: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  repereLibelle: {
    width: MARGE_GAUCHE - 8,
    fontSize: 10,
    color: couleurs.texteMuet,
    fontFamily: polices.sans,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  repereLigne: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: couleurs.bordure,
  },
  segment: {
    position: 'absolute',
    height: EPAISSEUR_LIGNE,
    backgroundColor: couleurs.principal,
    borderRadius: 2,
  },
  point: {
    position: 'absolute',
    borderWidth: 2,
  },
  labels: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: MARGE_HAUT + HAUTEUR_TRACE + 10,
    height: 28,
  },
  labelJour: {
    position: 'absolute',
    fontSize: 11,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
    textAlign: 'center',
  },
  bulle: {
    position: 'absolute',
    backgroundColor: couleurs.principal,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: 160,
    zIndex: 2,
  },
  bulleTexte: {
    fontSize: tailles.petit - 1,
    color: couleurs.texteSurPrincipal,
    fontFamily: polices.sans,
  },
});
