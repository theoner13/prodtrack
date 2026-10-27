// Couleurs, tailles et espacements de l'appli (ambiance boulangerie).
// Tous les écrans et composants prennent leurs valeurs ici.

export const couleurs = {
  fond: '#FBF6EE', // crème
  surface: '#FFFFFF',
  bordure: '#E8DCC8',
  principal: '#A86B2D', // brun doré
  principalFonce: '#7A4A1C',
  principalClair: '#F3E3CC',
  texte: '#2B1D12',
  texteSecondaire: '#6E5A48',
  texteSurPrincipal: '#FFFFFF',
  succes: '#2E7D4F',
  succesClair: '#E3F2E8',
  erreur: '#C0392B',
  erreurClair: '#FBE6E3',
  alerte: '#D9822B', // orange : stock sous le seuil
  desactive: '#CFC4B5',
};

// Jamais en dessous de 16 (lisibilité en boutique).
export const tailles = {
  petit: 16,
  normal: 18,
  grand: 22,
  titre: 28,
};

export const espacements = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

export const rayon = 12;

export const hauteurBouton = 56;
