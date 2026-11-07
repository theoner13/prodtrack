/** Libellés et regroupements pour le laboratoire. */

export type ProduitLabo = {
  id: string;
  nom: string;
  fabricant_id: string | null;
  fabricantNom: string;
  provenance_boutique_id: string | null;
  provenanceBoutiqueNom: string | null;
};

export type GroupePatissierLabo<T extends ProduitLabo> = {
  fabricantId: string;
  fabricantNom: string;
  produits: T[];
};

/** Étiquette courte « Laboratoire ». */
export function etiquetteLaboratoire(): string {
  return 'Laboratoire';
}

/** True si la boutique destinataire est un laboratoire. */
export function estBoutiqueLaboratoire(
  boutiqueId: string,
  laboratoires: ReadonlySet<string>,
): boolean {
  return laboratoires.has(boutiqueId);
}

/**
 * Regroupe les produits du labo par pâtissier fabricant.
 * Tri : nom du pâtissier, puis nom du produit.
 */
export function grouperParPatissierLabo<T extends ProduitLabo>(
  produits: T[],
): GroupePatissierLabo<T>[] {
  const parFabricant = new Map<string, T[]>();
  for (const produit of produits) {
    const cle = produit.fabricant_id ?? 'inconnu';
    const liste = parFabricant.get(cle) ?? [];
    liste.push(produit);
    parFabricant.set(cle, liste);
  }

  const groupes: GroupePatissierLabo<T>[] = [];
  for (const [fabricantId, liste] of parFabricant) {
    const premier = liste[0]!;
    groupes.push({
      fabricantId,
      fabricantNom: premier.fabricantNom.trim() || 'Pâtissier',
      produits: [...liste].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    });
  }
  return groupes.sort((a, b) => a.fabricantNom.localeCompare(b.fabricantNom, 'fr'));
}
