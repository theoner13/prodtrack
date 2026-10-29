// Couleurs, tailles et espacements de l'appli (style épuré blanc minimaliste iOS).
// Tous les écrans et composants prennent leurs valeurs ici.

export const couleurs = {
  fond: '#FFFFFF',
  surface: '#FFFFFF',
  fondGroupe: '#F5F5F7', // tuiles chiffres, groupes discrets
  fondPuce: '#F2F2F7', // puces, compteurs +/−
  bordure: '#E5E5EA',
  principal: '#A86B2D', // brun : boutons, onglets actifs, liens, sélection
  principalFonce: '#8A5622',
  principalClair: '#F6EEE4',
  texte: '#1D1D1F',
  texteSecondaire: '#6E6E73',
  texteSurPrincipal: '#FFFFFF',
  ongletInactif: '#8E8E93',
  succes: '#2E7D4F',
  succesClair: '#EAF6EF',
  erreur: '#C0392B',
  erreurClair: '#FBECEC',
  alerte: '#D9822B',
  alerteClair: '#FFF6EB',
  desactive: '#D1D1D6',
};

export const tailles = {
  section: 13, // titres de section iOS (MAJUSCULES)
  bouton: 15,
  petit: 14,
  normal: 16, // en-têtes de navigation
  grand: 20,
  titre: 22, // titres d'écran
};

export const espacements = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

export const rayon = 10;

export const hauteurBouton = 40;

/** Style commun des titres de section (Réglages iOS). */
export const styleTitreSection = {
  fontSize: tailles.section,
  fontWeight: '600' as const,
  color: couleurs.texteSecondaire,
  letterSpacing: 0.4,
  textTransform: 'uppercase' as const,
};
