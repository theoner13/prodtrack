import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import {
  couleurs,
  degradeCarteHeros,
  espacements,
  haloAmbre,
  ombres,
  polices,
  rayonCarte,
  styleChiffre,
  styleTitreSection,
  tailles,
} from '@/theme';

type Props = {
  /** Libellé au-dessus du chiffre (ex. « Total du jour »). */
  libelle?: string;
  /** Chiffre clé affiché en grand. */
  chiffre?: string | number;
  /** Libellé d'accessibilité sur le chiffre. */
  accessibiliteChiffre?: string;
  /** Texte secondaire sous le chiffre. */
  sousTitre?: string;
  /** Sous-texte discret sous le sous-titre. */
  sousTexte?: string;
  children?: ReactNode;
};

/** Carte sombre « héros » pour le chiffre clé d'un écran. */
export function CarteHeros({
  libelle,
  chiffre,
  accessibiliteChiffre,
  sousTitre,
  sousTexte,
  children,
}: Props) {
  return (
    <View
      style={[
        styles.carte,
        ombres.feuille,
        degradeCarteHeros(),
        Platform.OS === 'web' ? haloAmbre() : null,
      ]}
    >
      {libelle ? <Text style={styles.libelle}>{libelle}</Text> : null}
      {chiffre != null ? (
        <Text
          style={styles.chiffre}
          accessibilityLabel={accessibiliteChiffre}
          accessibilityRole={accessibiliteChiffre ? 'text' : undefined}
        >
          {chiffre}
        </Text>
      ) : null}
      {sousTitre ? <Text style={styles.sousTitre}>{sousTitre}</Text> : null}
      {sousTexte ? <Text style={styles.sousTexte}>{sousTexte}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    borderRadius: rayonCarte,
    paddingVertical: espacements.l,
    paddingHorizontal: espacements.l,
    gap: espacements.xs,
    overflow: 'hidden',
    marginBottom: espacements.s,
  },
  libelle: {
    ...styleTitreSection,
    color: couleurs.texteSurSombreDoux,
  },
  chiffre: {
    ...styleChiffre,
    fontSize: tailles.ca,
    color: couleurs.texteSurSombre,
    letterSpacing: -1,
  },
  sousTitre: {
    fontSize: tailles.petit,
    color: couleurs.texteSurSombreDoux,
    fontFamily: polices.sans,
    marginTop: 2,
  },
  sousTexte: {
    fontSize: tailles.legend,
    color: couleurs.texteSurSombreDoux,
    fontFamily: polices.sans,
    opacity: 0.85,
  },
});
