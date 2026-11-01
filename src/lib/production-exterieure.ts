/** Libellés et regroupements pour la production extérieure. */

export type ProduitAvecBoutiques = {
  id: string;
  nom: string;
  boutique_id: string;
  provenance_boutique_id: string | null;
};

/** True si le produit est fabriqué ailleurs et envoyé à sa boutique. */
export function estProduitExterieur(
  produit: Pick<ProduitAvecBoutiques, 'provenance_boutique_id'>,
): boolean {
  return produit.provenance_boutique_id != null;
}

/** Étiquette courte « Boutique Gare ». */
export function etiquetteBoutique(nomBoutique: string | null | undefined): string {
  const nom = (nomBoutique ?? '').trim();
  if (!nom) return 'Boutique';
  return nom.toLocaleLowerCase('fr-FR').startsWith('boutique') ? nom : `Boutique ${nom}`;
}

/** Étiquette admin « De Boutique Gare ». */
export function etiquetteProvenanceAdmin(nomBoutique: string | null | undefined): string {
  return `De ${etiquetteBoutique(nomBoutique)}`;
}

/**
 * Préfixe « Nom · détail » seulement si le fabricant est connu.
 * Pour un produit extérieur dont le profil n'est pas lisible, le nom est vide :
 * on affiche alors le détail seul (ex. « Stock : 8 »).
 */
export function avecPrefixeFabricant(fabricantNom: string, detail: string): string {
  const nom = fabricantNom.trim();
  if (!nom) return detail;
  return `${nom} · ${detail}`;
}

/**
 * Sous-titre frais pour un produit extérieur.
 * Produits = mis en vente (production du jour + restes saisis la veille).
 * Jetés = jetés vendeuse + pertes en production (un seul chiffre).
 */
export function sousTitreExterieurFrais(params: {
  produits: number;
  vendus: number;
  jetes: number;
  reste: number;
  aSaisieVendeuse: boolean;
}): string {
  if (!params.aSaisieVendeuse) {
    return `Produits : ${params.produits} · pas encore de saisie de la vendeuse`;
  }
  return (
    `Produits : ${params.produits}` +
    ` · Vendus : ${params.vendus}` +
    ` · Jetés : ${params.jetes}` +
    ` · Reste : ${params.reste}`
  );
}

/**
 * Sous-titre surgelé pour un produit extérieur.
 * Jetés = jetés vendeuse + pertes en production (un seul chiffre).
 */
export function sousTitreExterieurSurgele(params: {
  stock: number;
  vendus: number;
  jetes: number;
}): string {
  return `Stock : ${params.stock} · Vendus : ${params.vendus} · Jetés : ${params.jetes}`;
}

export type GroupeBoutique<T extends ProduitAvecBoutiques> = {
  boutiqueId: string;
  nomBoutique: string;
  produits: T[];
};

/** Regroupe les produits extérieurs par boutique destinataire. */
export function grouperParBoutiqueDestinataire<T extends ProduitAvecBoutiques>(
  produits: T[],
  nomsBoutiques: Map<string, string>,
): GroupeBoutique<T>[] {
  const parBoutique = new Map<string, T[]>();
  for (const produit of produits) {
    const liste = parBoutique.get(produit.boutique_id) ?? [];
    liste.push(produit);
    parBoutique.set(produit.boutique_id, liste);
  }

  const groupes: GroupeBoutique<T>[] = [];
  for (const [boutiqueId, liste] of parBoutique) {
    const nom = nomsBoutiques.get(boutiqueId) ?? 'Boutique';
    groupes.push({
      boutiqueId,
      nomBoutique: etiquetteBoutique(nom),
      produits: [...liste].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    });
  }
  return groupes.sort((a, b) => a.nomBoutique.localeCompare(b.nomBoutique, 'fr'));
}
