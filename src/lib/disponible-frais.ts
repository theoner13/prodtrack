/** Confirmation après production d'un produit frais (pas de mention « Stock »). */
export function messageConfirmationProductionFrais(
  quantite: number,
  nom: string,
  disponible: number,
): string {
  const verbe = quantite === 1 ? 'produit' : 'produits';
  return `${quantite} ${nom} ${verbe} aujourd'hui. Disponible : ${disponible}`;
}

/** Sous-titre « Disponible : N » avec détail optionnel production / restes. */
export function sousTitreDisponibleFrais(
  disponible: number,
  productionJour: number,
  restesVeille: number,
): string {
  let texte = `Disponible : ${disponible}`;
  if (productionJour > 0 || restesVeille > 0) {
    texte += ` (produits aujourd'hui ${productionJour} · restes d'hier ${restesVeille})`;
  }
  return texte;
}
