// Couleurs, tailles et espacements — direction « Beige et marron » (maquettes Identite-beige).
// Tous les écrans et composants prennent leurs valeurs ici.

export const polices = {
  // Geist chargé sur le web via public/index.html ; repli système ailleurs.
  sans: 'Geist, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

export const couleurs = {
  fond: '#FFFFFF',
  surface: '#FFFFFF',
  fondGroupe: '#F5EEE5', // cartes, champs, tuiles beige
  fondPuce: '#F5EEE5',
  fondSegment: '#F2EADF',
  fondOngletActif: '#F3E7D8',
  bordure: '#EEE6DB',
  bordureDouce: '#EFE6DA',
  principal: '#5C3D27', // marron : texte fort, boutons
  principalFonce: '#3F2A1B',
  principalClair: '#F5EEE5',
  croute: '#D29969', // logo, graphiques, accents
  crouteFonce: '#A3652F', // icône onglet actif
  croutePoint: '#C2803F', // pastille cloche, points planning
  texte: '#5C3D27',
  texteSecondaire: '#86694F',
  texteMuet: '#A88B70',
  texteSurPrincipal: '#FFFFFF',
  ongletInactif: '#9C8069',
  ongletInactifTexte: '#86694F',
  succes: '#1F5E3A',
  succesClair: '#EAF6EF',
  erreur: '#B42318',
  erreurClair: '#FDF0EE',
  alerte: '#C2803F',
  alerteClair: '#FFF6EB',
  desactive: '#E2D3C1',
  soulignement: '#C9B096',
};

export const tailles = {
  legend: 13, // légendes, titres de section
  section: 13,
  bouton: 15,
  petit: 14,
  normal: 15, // texte courant (maquette)
  grand: 20,
  titre: 28, // titres d'écran
  titreMoyen: 22,
  ca: 38, // chiffre d'affaires hero
};

export const espacements = {
  xs: 4,
  s: 8,
  m: 16,
  l: 20,
  xl: 24,
  xxl: 32,
};

export const rayon = 16;
export const rayonPetit = 10;
export const rayonPuce = 18;
export const rayonPilule = 999;

export const hauteurBouton = 52;
export const hauteurBoutonCompact = 42;
/** Zone de touche minimale recommandée (accessibilité). */
export const tailleToucheMin = 44;

export const ombres = {
  douce: {
    shadowColor: '#5C3D27',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  feuille: {
    shadowColor: '#5C3D27',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 4,
  },
  jourActif: {
    shadowColor: '#5C3D27',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 3,
  },
};

/** Style commun des titres de section. */
export const styleTitreSection = {
  fontSize: tailles.section,
  fontWeight: '500' as const,
  color: couleurs.texteSecondaire,
  letterSpacing: 0,
  fontFamily: polices.sans,
};

export const styleTitreEcran = {
  fontSize: tailles.titre,
  fontWeight: '500' as const,
  color: couleurs.texte,
  letterSpacing: -0.4,
  fontFamily: polices.sans,
};
