// Couleurs, tailles et espacements — direction « Fournil 2 ».
// Tous les écrans et composants prennent leurs valeurs ici.

import { Platform, type ViewStyle } from 'react-native';

export const polices = {
  // Geist chargé sur le web via public/index.html ; repli système ailleurs.
  sans: 'Geist, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

export const couleurs = {
  fond: '#FAF7F2',
  surface: '#FFFFFF',
  fondGroupe: '#F3ECE2',
  fondPuce: '#F3ECE2',
  fondSegment: '#EFE7DB',
  fondOngletActif: '#F1E4D2',
  bordure: '#ECE4D8',
  bordureDouce: '#F1EADF',
  principal: '#2B1A10',
  principalFonce: '#1A0F08',
  principalClair: '#F3ECE2',
  accent: '#E8913F',
  accentFonce: '#9C5216',
  accentClair: '#FCEBD8',
  croute: '#E0A16A',
  crouteFonce: '#9C5216',
  croutePoint: '#E8913F',
  fondSombre: '#24160D',
  fondSombreHaut: '#3A2618',
  texte: '#2B1A10',
  texteSecondaire: '#7A6453',
  texteMuet: '#8A7361',
  texteSurPrincipal: '#FFFFFF',
  texteSurSombre: '#FFF8EF',
  texteSurSombreDoux: '#D9C4AE',
  ongletInactif: '#A6917E',
  ongletInactifTexte: '#7A6453',
  succes: '#1E7A4B',
  succesClair: '#E6F5EC',
  erreur: '#C0362C',
  erreurClair: '#FDEEEC',
  alerte: '#C97A1E',
  alerteClair: '#FFF4E3',
  desactive: '#E6DACB',
  soulignement: '#D9C4AE',
};

export const tailles = {
  legend: 13,
  section: 13,
  bouton: 16,
  petit: 14,
  normal: 16,
  grand: 20,
  titre: 30,
  titreMoyen: 22,
  ca: 44,
};

export const espacements = {
  xs: 4,
  s: 8,
  m: 16,
  l: 20,
  xl: 24,
  xxl: 32,
};

export const rayon = 22;
export const rayonPetit = 16;
export const rayonPuce = 999;
export const rayonPilule = 999;
export const rayonCarte = 22;

export const hauteurBouton = 54;
export const hauteurBoutonCompact = 44;
export const tailleToucheMin = 48;

/** Largeur à partir de laquelle la barre d'onglets devient latérale. */
export const seuilOrdinateur = 900;
/** Largeur max du contenu principal sur ordinateur. */
export const largeurMaxContenu = 1120;
/** Largeur de la barre latérale (ordinateur). */
export const largeurBarreLaterale = 232;
/** Hauteur approximative de la barre flottante (téléphone) pour padding bas. */
export const hauteurBarreOngletsFlottante = 72;

export const ombres = {
  douce: {
    shadowColor: '#2B1A10',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 30,
    elevation: 3,
  },
  feuille: {
    shadowColor: '#2B1A10',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 32,
    elevation: 4,
  },
  jourActif: {
    shadowColor: '#2B1A10',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 3,
  },
  barre: {
    shadowColor: '#2B1A10',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

/** Style commun des titres de section (MAJUSCULES espacées). */
export const styleTitreSection = {
  fontSize: tailles.section,
  fontWeight: '600' as const,
  color: couleurs.texteMuet,
  letterSpacing: 0.6,
  textTransform: 'uppercase' as const,
  fontFamily: polices.sans,
};

export const styleTitreEcran = {
  fontSize: tailles.titre,
  fontWeight: '600' as const,
  color: couleurs.texte,
  letterSpacing: -0.8,
  fontFamily: polices.sans,
};

export const styleChiffre = {
  fontWeight: '600' as const,
  fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  fontFamily: polices.sans,
  color: couleurs.texte,
};

/**
 * Dégradé CSS sur le web ; aplat `repli` ailleurs.
 * À utiliser dans un style View (cast local pour backgroundImage).
 */
export function degrade(
  de: string,
  vers: string,
  repli: string,
  angle = '180deg',
): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      backgroundColor: repli,
      backgroundImage: `linear-gradient(${angle}, ${de} 0%, ${vers} 100%)`,
    } as ViewStyle;
  }
  return { backgroundColor: repli };
}

export const degradeBoutonPrincipal = () =>
  degrade('#3A2618', '#24160D', couleurs.fondSombre, '180deg');

export const degradeCarteHeros = () =>
  degrade('#3A2618', '#1F130B', couleurs.fondSombre, '145deg');

export const degradeAccent = () =>
  degrade('#F2A85B', '#DD7B2A', couleurs.accent, '135deg');

/** Halo ambre discret (coin) — web seulement. */
export function haloAmbre(): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return {
    backgroundImage:
      'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(232,145,63,0.22) 0%, transparent 55%)',
  } as ViewStyle;
}
