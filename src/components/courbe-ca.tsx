import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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
import { couleurs, ombres, polices, rayonCarte, tailles } from '@/theme';

const HAUTEUR = 164;
const HAUTEUR_TRACE = 120;
/** Largeur pour les repères (€) sans tronquer. */
const MARGE_GAUCHE = 44;
const MARGE_DROITE = 30;
const MARGE_HAUT = 12;
const TAILLE_POINT = 8;
const TAILLE_POINT_ACTIF = 12;
const EPAISSEUR_LIGNE = 2.5;
const LARGEUR_LABEL = 56;
const BASE_Y = MARGE_HAUT + HAUTEUR_TRACE;

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

  function onLayoutZone(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - largeur) > 0.5) setLargeur(w);
  }

  const pointSelectionne = selection !== null ? coords[selection] : null;

  const aireWeb =
    Platform.OS === 'web' && coords.length >= 2
      ? (() => {
          const pts = coords
            .map((p) => `${p.x},${p.y}`)
            .join(' ');
          const premier = coords[0]!;
          const dernier = coords[coords.length - 1]!;
          const polygone = `${premier.x},${BASE_Y} ${pts} ${dernier.x},${BASE_Y}`;
          return (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
                    `<svg xmlns='http://www.w3.org/2000/svg' width='${largeur}' height='${HAUTEUR}'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='${couleurs.accent}' stop-opacity='0.28'/><stop offset='100%' stop-color='${couleurs.accent}' stop-opacity='0'/></linearGradient></defs><polygon points='${polygone}' fill='url(#g)'/></svg>`,
                  )}")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '100% 100%',
                } as object,
              ]}
            />
          );
        })()
      : null;

  return (
    <View style={styles.conteneur} accessible accessibilityLabel={resume}>
      <View style={styles.zone} onLayout={onLayoutZone} accessibilityElementsHidden>
        {largeur > 0 ? (
          <>
            {aireWeb}

            {Platform.OS !== 'web'
              ? coords.map((p, i) => {
                  const suivant = coords[i + 1] ?? p;
                  const xGauche = Math.min(p.x, suivant.x);
                  const largeurBarre =
                    i < coords.length - 1
                      ? Math.max(4, Math.abs(suivant.x - p.x))
                      : 8;
                  const yHaut = Math.min(p.y, suivant.y);
                  return (
                    <View
                      key={`a-${p.jour}`}
                      pointerEvents="none"
                      style={[
                        styles.aireBarre,
                        {
                          left: xGauche,
                          top: yHaut,
                          width: largeurBarre,
                          height: Math.max(0, BASE_Y - yHaut),
                        },
                      ]}
                    />
                  );
                })
              : null}

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
                      backgroundColor:
                        actif || surligne ? couleurs.accentFonce : couleurs.accent,
                      borderColor: couleurs.surface,
                    },
                  ]}
                />
              );
            })}

            <View style={styles.labels} pointerEvents="none">
              {coords.map((p) => {
                if (!libellesVisibles.has(p.index)) return null;
                const dernier = p.index === coords.length - 1;
                const left = dernier
                  ? Math.max(0, p.x - LARGEUR_LABEL)
                  : p.x - LARGEUR_LABEL / 2;
                return (
                  <Text
                    key={`l-${p.jour}`}
                    style={[
                      styles.labelJour,
                      {
                        left,
                        width: LARGEUR_LABEL,
                        textAlign: dernier ? 'right' : 'center',
                      },
                    ]}
                  >
                    {libelleJourCourbe(p.jour, styleLibelle)}
                  </Text>
                );
              })}
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
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    marginTop: 8,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'stretch',
    backgroundColor: couleurs.surface,
    borderRadius: rayonCarte,
    padding: 14,
    ...ombres.douce,
  },
  zone: {
    height: HAUTEUR,
    position: 'relative',
    width: '100%',
  },
  aireBarre: {
    position: 'absolute',
    backgroundColor: couleurs.accentClair,
    opacity: 0.55,
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
    width: MARGE_GAUCHE - 6,
    fontSize: 10,
    color: couleurs.texteMuet,
    fontFamily: polices.sans,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  repereLigne: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: couleurs.bordureDouce,
  },
  segment: {
    position: 'absolute',
    height: EPAISSEUR_LIGNE,
    backgroundColor: couleurs.accent,
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
    top: MARGE_HAUT + HAUTEUR_TRACE + 8,
    height: 22,
  },
  labelJour: {
    position: 'absolute',
    fontSize: 11,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  bulle: {
    position: 'absolute',
    backgroundColor: couleurs.fondSombre,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: 160,
    zIndex: 2,
  },
  bulleTexte: {
    fontSize: tailles.petit - 1,
    color: couleurs.texteSurSombre,
    fontFamily: polices.sans,
  },
});
