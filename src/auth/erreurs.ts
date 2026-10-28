// Traduit les messages techniques (Supabase, réseau) en français.
export function messageErreur(erreur: unknown): string {
  const message =
    erreur instanceof Error
      ? erreur.message
      : typeof erreur === 'object' && erreur !== null && 'message' in erreur
        ? String((erreur as { message: unknown }).message)
        : '';
  const details =
    typeof erreur === 'object' && erreur !== null && 'details' in erreur
      ? String((erreur as { details?: unknown }).details ?? '')
      : '';
  const brut = message || 'Une erreur est survenue.';
  const texte = `${message} ${details}`.toLowerCase();
  if (texte.includes('invalid login') || texte.includes('invalid credentials')) {
    return 'Email ou mot de passe incorrect.';
  }
  if (texte.includes('email not confirmed')) {
    return 'Confirmez votre adresse email avant de vous connecter.';
  }
  if (texte.includes('already registered') || texte.includes('already been registered')) {
    return 'Un compte existe déjà avec cet email.';
  }
  if (texte.includes('password') && texte.includes('at least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (texte.includes('unable to validate email') || texte.includes('invalid email')) {
    return 'Adresse email invalide.';
  }
  if (texte.includes('code boutique invalide')) {
    return 'Ce code boutique est invalide. Vérifiez-le auprès du patron.';
  }
  if (texte.includes('déjà un profil')) {
    return 'Ce compte a déjà un profil.';
  }
  if (texte.includes('rôle non autorisé') || texte.includes('role non autorise')) {
    return 'Ce rôle n’est pas autorisé.';
  }
  if (texte.includes('produits_nom_unique')) {
    return 'Ce nom de produit est déjà utilisé dans cette boutique.';
  }
  if (texte.includes('impossible de le retirer') || texte.includes('impossible de le renommer')) {
    return 'Ce produit est imposé par le patron : vous ne pouvez pas le retirer ni le renommer.';
  }
  if (
    texte.includes('trop lourde') ||
    texte.includes('payload too large') ||
    texte.includes('entity too large') ||
    texte.includes('maximum allowed size')
  ) {
    return 'Cette photo est trop lourde. Choisissez une image plus petite.';
  }
  if (texte.includes('appareil photo') || texte.includes('galerie')) {
    return message;
  }
  if (texte.includes('pâtissier actif') || texte.includes('patissier actif')) {
    return 'Le fabricant doit être un pâtissier actif de cette boutique.';
  }
  if (texte.includes('row-level security')) {
    return "Vous n'avez pas le droit de faire cette action.";
  }
  if (texte.includes('network') || texte.includes('failed to fetch') || texte.includes('fetch')) {
    return 'Pas de connexion internet. Réessayez.';
  }
  return brut;
}
