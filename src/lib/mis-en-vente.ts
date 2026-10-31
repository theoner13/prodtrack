/** Vendu + jeté + reste dépasse-t-il le total mis en vente ? (0/0/0 jamais). */
export function depassementMisEnVente(
  vendu: number,
  jete: number,
  reste: number,
  total: number,
): boolean {
  const somme = vendu + jete + reste;
  if (somme === 0) return false;
  return somme > total;
}

/** Sous-titre sous le nom du produit (Fin de journée). */
export function texteMisEnVente(
  conservation: 'frais' | 'surgele',
  arrivee: number,
  restesVeille: number,
): string {
  const total = arrivee + restesVeille;
  if (total === 0) return 'Mis en vente : 0';
  if (conservation === 'surgele') {
    return `Mis en vente : ${total} (${arrivee} sortis · ${restesVeille} restes d'hier)`;
  }
  return `Mis en vente : ${total} (${arrivee} produits · ${restesVeille} restes d'hier)`;
}

/** Message orange sous la ligne produit pendant la saisie. */
export function messageDepassementLigne(total: number): string {
  return `Dépasse la quantité mise en vente (${total}).`;
}

/** Message du bouton Enregistrer quand au moins un produit dépasse. */
export function messageDepassementEnregistrement(noms: string[]): string {
  return `Vendu + jeté + reste dépasse la quantité mise en vente pour : ${noms.join(', ')}.`;
}
