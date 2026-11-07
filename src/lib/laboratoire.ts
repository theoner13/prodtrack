/** Libellés et regroupements pour le laboratoire. */

import { aujourdhuiParis } from './format.ts';

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

export type FiltreCommandesLabo = 'a_venir' | 'passees' | 'annulees';

export const FILTRES_COMMANDES_LABO: { id: FiltreCommandesLabo; libelle: string }[] = [
  { id: 'a_venir', libelle: 'À venir' },
  { id: 'passees', libelle: 'Passées' },
  { id: 'annulees', libelle: 'Annulées' },
];

export type CommandeLaboPourGroupe = {
  id: string;
  pour_le: string;
  quantite: number;
  produit_nom: string;
  fabricant_nom: string;
  client: string | null;
  annulee_le: string | null;
};

export type GroupeCommandesLabo<T extends CommandeLaboPourGroupe> = {
  cle: string;
  libelle: string;
  commandes: T[];
};

export type LigneCaLabo = {
  jour: string | null;
  fabricant_id: string | null;
  produit_id: string | null;
  produit_nom: string | null;
  quantite: number | null;
  prix_unitaire_centimes: number | null;
  ca_centimes: number | null;
};

export type DetailCaLabo = {
  totalCentimes: number;
  produits: { cle: string; nom: string; quantite: number; caCentimes: number }[];
  jours: { cle: string; quantite: number; caCentimes: number }[];
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

function ajouterJours(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** « Aujourd'hui » / « Demain » / « mercredi 05/11 » pour un jour AAAA-MM-JJ. */
export function libelleJourCommandeLabo(
  jour: string,
  aujourdhui: string = aujourdhuiParis(),
): string {
  if (jour === aujourdhui) return "Aujourd'hui";
  if (jour === ajouterJours(aujourdhui, 1)) return 'Demain';
  const d = new Date(`${jour}T12:00:00Z`);
  const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const jj = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${weekday.charAt(0).toLocaleUpperCase('fr-FR')}${weekday.slice(1)} ${jj}/${mm}`;
}

/** Filtre une liste selon À venir / Passées / Annulées. */
export function filtrerCommandesLabo<T extends { pour_le: string; annulee_le: string | null }>(
  commandes: T[],
  filtre: FiltreCommandesLabo,
  aujourdhui: string = aujourdhuiParis(),
): T[] {
  if (filtre === 'annulees') {
    return commandes.filter((c) => c.annulee_le != null);
  }
  const actives = commandes.filter((c) => c.annulee_le == null);
  if (filtre === 'a_venir') {
    return actives.filter((c) => c.pour_le >= aujourdhui);
  }
  return actives.filter((c) => c.pour_le < aujourdhui);
}

/**
 * Regroupe les commandes labo par jour (Aujourd'hui, Demain, puis jour + date).
 * Tri des jours croissant ; dans un jour, par produit puis client.
 */
export function regrouperCommandesLaboParJour<T extends CommandeLaboPourGroupe>(
  commandes: T[],
  aujourdhui: string = aujourdhuiParis(),
): GroupeCommandesLabo<T>[] {
  const parJour = new Map<string, T[]>();
  for (const commande of commandes) {
    const liste = parJour.get(commande.pour_le) ?? [];
    liste.push(commande);
    parJour.set(commande.pour_le, liste);
  }

  const jours = [...parJour.keys()].sort((a, b) => a.localeCompare(b));
  return jours.map((jour) => {
    const liste = (parJour.get(jour) ?? []).slice().sort((a, b) => {
      const parProduit = a.produit_nom.localeCompare(b.produit_nom, 'fr');
      if (parProduit !== 0) return parProduit;
      return (a.client ?? '').localeCompare(b.client ?? '', 'fr');
    });
    return {
      cle: jour,
      libelle: libelleJourCommandeLabo(jour, aujourdhui),
      commandes: liste,
    };
  });
}

export type CommandeLaboPourPlanning = {
  produit_id: string;
  pour_le: string;
  quantite: number;
  produit_nom: string;
  fabricant_nom: string;
  client: string | null;
  note: string | null;
  annulee_le: string | null;
};

export type LigneClientPlanningLabo = {
  clientLibelle: string;
  quantite: number;
  notes: string[];
};

export type CarteProduitPlanningLabo = {
  produitId: string;
  produitNom: string;
  fabricantNom: string;
  quantite: number;
  clients: LigneClientPlanningLabo[];
};

export type JourPlanningLabo = {
  jour: string;
  libelle: string;
  totalPieces: number;
  produits: CarteProduitPlanningLabo[];
};

const LIBELLE_SANS_CLIENT = 'Sans client';

/**
 * Regroupe les commandes labo non annulées (à partir d'aujourd'hui) :
 * jour → produit (qté décroissante) → client (quantités additionnées).
 */
export function planningLaboParJour(
  commandes: CommandeLaboPourPlanning[],
  aujourdhui: string = aujourdhuiParis(),
): JourPlanningLabo[] {
  const actives = commandes.filter(
    (c) => c.annulee_le == null && c.pour_le >= aujourdhui && c.quantite > 0,
  );

  type AccClient = { quantite: number; notes: string[] };
  type AccProduit = {
    produitNom: string;
    fabricantNom: string;
    quantite: number;
    clients: Map<string, AccClient>;
  };

  const parJour = new Map<string, Map<string, AccProduit>>();

  for (const commande of actives) {
    let produits = parJour.get(commande.pour_le);
    if (!produits) {
      produits = new Map();
      parJour.set(commande.pour_le, produits);
    }

    let produit = produits.get(commande.produit_id);
    if (!produit) {
      produit = {
        produitNom: commande.produit_nom,
        fabricantNom: commande.fabricant_nom,
        quantite: 0,
        clients: new Map(),
      };
      produits.set(commande.produit_id, produit);
    }

    produit.quantite += commande.quantite;
    const cleClient = (commande.client ?? '').trim() || LIBELLE_SANS_CLIENT;
    const existant = produit.clients.get(cleClient) ?? { quantite: 0, notes: [] };
    existant.quantite += commande.quantite;
    const note = (commande.note ?? '').trim();
    if (note && !existant.notes.includes(note)) {
      existant.notes.push(note);
    }
    produit.clients.set(cleClient, existant);
  }

  const jours = [...parJour.keys()].sort((a, b) => a.localeCompare(b));
  return jours.map((jour) => {
    const produitsMap = parJour.get(jour)!;
    const produits: CarteProduitPlanningLabo[] = [...produitsMap.entries()]
      .map(([produitId, acc]) => {
        const clients = [...acc.clients.entries()]
          .map(([clientLibelle, c]) => ({
            clientLibelle,
            quantite: c.quantite,
            notes: c.notes,
          }))
          .sort(
            (a, b) =>
              b.quantite - a.quantite ||
              a.clientLibelle.localeCompare(b.clientLibelle, 'fr'),
          );
        return {
          produitId,
          produitNom: acc.produitNom,
          fabricantNom: acc.fabricantNom,
          quantite: acc.quantite,
          clients,
        };
      })
      .sort(
        (a, b) =>
          b.quantite - a.quantite || a.produitNom.localeCompare(b.produitNom, 'fr'),
      );

    const totalPieces = produits.reduce((somme, p) => somme + p.quantite, 0);
    return {
      jour,
      libelle: libelleJourCommandeLabo(jour, aujourdhui),
      totalPieces,
      produits,
    };
  });
}

/** Total et détail par produit / par jour pour le CA laboratoire d'un fabricant. */
export function detailCaLaboratoire(
  lignes: LigneCaLabo[],
  fabricantId: string,
): DetailCaLabo {
  const duFabricant = lignes.filter((l) => l.fabricant_id === fabricantId);
  let totalCentimes = 0;
  const produits = new Map<string, { cle: string; nom: string; quantite: number; caCentimes: number }>();
  const jours = new Map<string, { cle: string; quantite: number; caCentimes: number }>();

  for (const ligne of duFabricant) {
    const qte = ligne.quantite ?? 0;
    const ca = ligne.ca_centimes ?? 0;
    totalCentimes += ca;

    const cleProduit = ligne.produit_id ?? ligne.produit_nom ?? '';
    if (cleProduit) {
      const existant = produits.get(cleProduit) ?? {
        cle: cleProduit,
        nom: ligne.produit_nom ?? cleProduit,
        quantite: 0,
        caCentimes: 0,
      };
      existant.quantite += qte;
      existant.caCentimes += ca;
      produits.set(cleProduit, existant);
    }

    if (ligne.jour) {
      const existant = jours.get(ligne.jour) ?? {
        cle: ligne.jour,
        quantite: 0,
        caCentimes: 0,
      };
      existant.quantite += qte;
      existant.caCentimes += ca;
      jours.set(ligne.jour, existant);
    }
  }

  return {
    totalCentimes,
    produits: [...produits.values()].sort(
      (a, b) => b.caCentimes - a.caCentimes || a.nom.localeCompare(b.nom, 'fr'),
    ),
    jours: [...jours.values()].sort((a, b) => a.cle.localeCompare(b.cle)),
  };
}
