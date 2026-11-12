import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  couleurs,
  espacements,
  ombres,
  polices,
  tailleToucheMin,
} from '@/theme';

export type JourFrise = {
  id: string;
  /** Initiale du jour (ex. « L »). */
  initiale: string;
  /** Numéro du jour (ex. « 12 »). */
  numero: string;
  /** accessibilityLabel complet. */
  libelle: string;
  /** Nombre de pastilles de quantité (0–3). */
  points?: number;
  /** Indices des pastilles en alerte (sous-seuil). */
  pointsAlerte?: boolean[];
  estAujourdhui?: boolean;
};

type Props = {
  jours: JourFrise[];
  selection: string;
  onSelect: (id: string) => void;
};

/** Frise de jours en pastilles (planning). */
export function FriseJours({ jours, selection, onSelect }: Props) {
  return (
    <View style={styles.bande} accessibilityRole="tablist">
      {jours.map((jour) => {
        const selectionne = jour.id === selection;
        return (
          <Pressable
            key={jour.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectionne }}
            accessibilityLabel={jour.libelle}
            onPress={() => onSelect(jour.id)}
            style={({ pressed }) => [
              styles.case,
              selectionne && styles.caseActive,
              !selectionne && jour.estAujourdhui && styles.caseAujourdhui,
              pressed && styles.appuye,
            ]}
          >
            <Text style={[styles.semaine, selectionne && styles.semaineActive]}>
              {jour.initiale}
            </Text>
            <Text style={[styles.numero, selectionne && styles.numeroActive]}>
              {jour.numero}
            </Text>
            <View style={styles.points}>
              {jour.estAujourdhui && !selectionne ? (
                <View style={styles.pointAujourdhui} />
              ) : null}
              {(jour.points ?? 0) > 0
                ? Array.from({ length: Math.min(jour.points ?? 0, 3) }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.point,
                        {
                          backgroundColor: selectionne
                            ? jour.pointsAlerte?.[i]
                              ? '#F2A49B'
                              : '#E9B98C'
                            : jour.pointsAlerte?.[i]
                              ? couleurs.erreur
                              : couleurs.croutePoint,
                        },
                      ]}
                    />
                  ))
                : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bande: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    borderRadius: 22,
    backgroundColor: couleurs.fondSegment,
    marginBottom: espacements.s,
  },
  case: {
    flex: 1,
    minHeight: Math.max(84, tailleToucheMin),
    paddingTop: 9,
    paddingBottom: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  caseActive: {
    backgroundColor: couleurs.principal,
    ...ombres.jourActif,
  },
  caseAujourdhui: {
    backgroundColor: couleurs.surface,
  },
  semaine: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  semaineActive: {
    color: couleurs.texteSurSombreDoux,
  },
  numero: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: couleurs.texte,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
  },
  numeroActive: {
    color: couleurs.texteSurPrincipal,
  },
  points: {
    height: 6,
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  point: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  pointAujourdhui: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: couleurs.accent,
  },
  appuye: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
});
