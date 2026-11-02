// Utilitaires purs pour les commandes de gâteaux (aucun I/O).

import { aujourdhuiParis, eurosVersCentimes } from './format.ts';

export type StatutCommande = 'a_faire' | 'prete' | 'recue' | 'recuperee' | 'annulee';

export type FiltreStatutCommandes = 'a_venir' | 'recues' | 'recuperees' | 'annulees';

export const LIBELLES_STATUT: Record<StatutCommande, string> = {
  a_faire: 'À faire',
  prete: 'Prête',
  recue: 'Reçue',
  recuperee: 'Récupérée',
  annulee: 'Annulée',
};

export const FILTRES_STATUT: { id: FiltreStatutCommandes; libelle: string }[] = [
  { id: 'a_venir', libelle: 'À venir' },
  { id: 'recues', libelle: 'Reçues' },
  { id: 'recuperees', libelle: 'Récupérées' },
  { id: 'annulees', libelle: 'Annulées' },
];

const FUSEAU = 'Europe/Paris';

/** Statuts inclus dans un filtre de liste. */
export function statutsDuFiltre(filtre: FiltreStatutCommandes): StatutCommande[] {
  if (filtre === 'a_venir') return ['a_faire', 'prete', 'recue'];
  if (filtre === 'recues') return ['recue'];
  if (filtre === 'recuperees') return ['recuperee'];
  return ['annulee'];
}

/** Reste à payer en centimes, ou null si le prix n'est pas renseigné. */
export function resteAPayerCentimes(
  prixCentimes: number | null | undefined,
  acompteCentimes: number | null | undefined,
): number | null {
  if (prixCentimes == null) return null;
  return Math.max(0, prixCentimes - (acompteCentimes ?? 0));
}

/** Instant ISO → « 15h30 » (Paris). */
export function formatHeureRetrait(iso: string): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const hh = (parts.find((p) => p.type === 'hour')?.value ?? '00').padStart(2, '0');
  const mm = (parts.find((p) => p.type === 'minute')?.value ?? '00').padStart(2, '0');
  return `${hh}h${mm}`;
}

/** Instant ISO → jour AAAA-MM-JJ en Paris. */
export function jourRetraitParis(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: FUSEAU });
}

/** Instant ISO → « Aujourd'hui » / « Demain » / « mercredi 05/11 ». */
export function libelleGroupeJour(iso: string, aujourdhui: string = aujourdhuiParis()): string {
  const jour = jourRetraitParis(iso);
  if (jour === aujourdhui) return "Aujourd'hui";
  const demain = ajouterJours(aujourdhui, 1);
  if (jour === demain) return 'Demain';
  const d = new Date(`${jour}T12:00:00Z`);
  const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const jj = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const maj = weekday.charAt(0).toLocaleUpperCase('fr-FR') + weekday.slice(1);
  return `${maj} ${jj}/${mm}`;
}

/**
 * Libellé jour pour la fiche détail :
 * « Aujourd'hui » / « Demain · mardi 03/11 » / « Mercredi 05/11 ».
 */
export function libelleJourFiche(iso: string, aujourdhui: string = aujourdhuiParis()): string {
  const jour = jourRetraitParis(iso);
  const d = new Date(`${jour}T12:00:00Z`);
  const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const jj = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const date = `${jj}/${mm}`;
  if (jour === aujourdhui) return "Aujourd'hui";
  const demain = ajouterJours(aujourdhui, 1);
  if (jour === demain) return `Demain · ${weekday} ${date}`;
  const maj = weekday.charAt(0).toLocaleUpperCase('fr-FR') + weekday.slice(1);
  return `${maj} ${date}`;
}

/**
 * Délai avant retrait si c'est aujourd'hui et pas encore passé :
 * « dans 40 min » / « dans 2 h 15 » / « dans 2 h ». Sinon null.
 */
export function libelleDansCombien(
  iso: string,
  maintenant: Date = new Date(),
  aujourdhui: string = aujourdhuiParis(),
): string | null {
  if (jourRetraitParis(iso) !== aujourdhui) return null;
  const diffMs = new Date(iso).getTime() - maintenant.getTime();
  if (diffMs <= 0) return null;
  const totalMin = Math.max(1, Math.round(diffMs / 60_000));
  if (totalMin < 60) return `dans ${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `dans ${h} h`;
  return `dans ${h} h ${m}`;
}

function ajouterJours(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Liste de puces de jours à partir d'aujourd'hui (Paris). */
export function pucesJoursRetrait(
  aujourdhui: string = aujourdhuiParis(),
  nombre = 14,
): { jour: string; libelle: string }[] {
  const liste: { jour: string; libelle: string }[] = [];
  for (let i = 0; i < nombre; i++) {
    const jour = ajouterJours(aujourdhui, i);
    let libelle: string;
    if (i === 0) libelle = "Aujourd'hui";
    else if (i === 1) libelle = 'Demain';
    else {
      const d = new Date(`${jour}T12:00:00Z`);
      const weekday = d
        .toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' })
        .replace(/\.$/, '');
      const jj = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      libelle = `${weekday} ${jj}/${mm}`;
    }
    liste.push({ jour, libelle });
  }
  return liste;
}

/** Heures par pas de 15 min, de 07:00 à 20:00. */
export function creneauxHeure(pasMinutes = 15): string[] {
  const liste: string[] = [];
  for (let h = 7; h <= 20; h++) {
    for (let m = 0; m < 60; m += pasMinutes) {
      if (h === 20 && m > 0) break;
      liste.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return liste;
}

/**
 * Construit un timestamptz ISO pour un jour + heure en Europe/Paris.
 * Teste les décalages horaires courants (hiver / été).
 */
export function retraitVersIso(jour: string, heure: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || !/^\d{2}:\d{2}$/.test(heure)) return null;
  const [Y, M, D] = jour.split('-').map(Number);
  const [hh, mm] = heure.split(':').map(Number);
  if (Y == null || M == null || D == null || hh == null || mm == null) return null;
  for (const offsetMin of [60, 120, 0, 180]) {
    const utc = new Date(Date.UTC(Y, M - 1, D, hh, mm) - offsetMin * 60_000);
    const j = utc.toLocaleDateString('sv-SE', { timeZone: FUSEAU });
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: FUSEAU,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(utc);
    const h = (parts.find((p) => p.type === 'hour')?.value ?? '').padStart(2, '0');
    const m = (parts.find((p) => p.type === 'minute')?.value ?? '').padStart(2, '0');
    if (j === jour && `${h}:${m}` === heure) return utc.toISOString();
  }
  return null;
}

export type GroupeCommandes<T extends { retrait_le: string }> = {
  cle: string;
  libelle: string;
  commandes: T[];
};

/** Trie par retrait_le et regroupe par jour (libellés Aujourd'hui / Demain / …). */
export function regrouperParJour<T extends { retrait_le: string }>(
  commandes: T[],
  aujourdhui: string = aujourdhuiParis(),
): GroupeCommandes<T>[] {
  const triees = [...commandes].sort((a, b) => a.retrait_le.localeCompare(b.retrait_le));
  const map = new Map<string, GroupeCommandes<T>>();
  for (const c of triees) {
    const jour = jourRetraitParis(c.retrait_le);
    const existant = map.get(jour);
    if (existant) {
      existant.commandes.push(c);
    } else {
      map.set(jour, {
        cle: jour,
        libelle: libelleGroupeJour(c.retrait_le, aujourdhui),
        commandes: [c],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.cle.localeCompare(b.cle));
}

export type SaisieCommande = {
  clientNom: string;
  clientTelephone: string;
  clientEmail: string;
  gateau: string;
  nbParts: number;
  demandes: string;
  inscription: string;
  boutiqueFabricationId: string;
  /** Rempli automatiquement (boutique de la vendeuse) ; pas de choix UI. */
  boutiqueRetraitId: string;
  jourRetrait: string;
  heureRetrait: string;
  prixEuros: string;
  acompteEuros: string;
};

export type ErreursCommande = Partial<Record<keyof SaisieCommande, string>> & {
  form?: string;
};

export type CommandeValidee = {
  client_nom: string;
  client_telephone: string;
  client_email: string | null;
  gateau: string;
  nb_parts: number;
  demandes: string | null;
  inscription: string | null;
  boutique_fabrication_id: string;
  boutique_retrait_id: string;
  retrait_le: string;
  prix_centimes: number | null;
  acompte_centimes: number | null;
};

/** Valide le formulaire ; retourne les erreurs ou la charge utile. */
export function validerCommande(
  saisie: SaisieCommande,
  options: { maintenant?: Date; autoriserPasse?: boolean } = {},
): { ok: true; data: CommandeValidee } | { ok: false; erreurs: ErreursCommande } {
  const erreurs: ErreursCommande = {};
  const client_nom = saisie.clientNom.trim();
  const client_telephone = saisie.clientTelephone.trim();
  const client_email = saisie.clientEmail.trim();
  const gateau = saisie.gateau.trim();
  const demandes = saisie.demandes.trim();
  const inscription = saisie.inscription.trim();

  if (!client_nom) erreurs.clientNom = 'Indiquez le nom du client.';
  if (!client_telephone) erreurs.clientTelephone = 'Indiquez le téléphone du client.';
  if (!gateau) erreurs.gateau = 'Indiquez le gâteau.';
  if (!Number.isInteger(saisie.nbParts) || saisie.nbParts <= 0) {
    erreurs.nbParts = 'Le nombre de parts doit être un entier supérieur à 0.';
  }
  if (!saisie.boutiqueFabricationId) {
    erreurs.boutiqueFabricationId = 'Choisissez la boutique qui fabrique.';
  }
  if (!saisie.boutiqueRetraitId) {
    erreurs.boutiqueRetraitId = 'Boutique de prise introuvable.';
  }

  const retrait_le = retraitVersIso(saisie.jourRetrait, saisie.heureRetrait);
  if (!retrait_le) {
    erreurs.jourRetrait = 'Date ou heure de retrait invalide.';
  } else if (!options.autoriserPasse) {
    const maintenant = options.maintenant ?? new Date();
    if (new Date(retrait_le).getTime() < maintenant.getTime()) {
      erreurs.jourRetrait = 'Le retrait ne peut pas être dans le passé.';
    }
  }

  let prix_centimes: number | null = null;
  let acompte_centimes: number | null = null;
  if (saisie.prixEuros.trim()) {
    prix_centimes = eurosVersCentimes(saisie.prixEuros);
    if (prix_centimes == null) erreurs.prixEuros = 'Prix invalide (ex. 35,00).';
  }
  if (saisie.acompteEuros.trim()) {
    acompte_centimes = eurosVersCentimes(saisie.acompteEuros);
    if (acompte_centimes == null) erreurs.acompteEuros = 'Acompte invalide (ex. 10,00).';
  }
  if (prix_centimes != null && acompte_centimes != null && acompte_centimes > prix_centimes) {
    erreurs.acompteEuros = "L'acompte ne peut pas dépasser le prix.";
  }
  if (acompte_centimes != null && prix_centimes == null) {
    erreurs.prixEuros = 'Indiquez le prix si vous saisissez un acompte.';
  }

  if (Object.keys(erreurs).length > 0) return { ok: false, erreurs };

  return {
    ok: true,
    data: {
      client_nom,
      client_telephone,
      client_email: client_email || null,
      gateau,
      nb_parts: saisie.nbParts,
      demandes: demandes || null,
      inscription: inscription || null,
      boutique_fabrication_id: saisie.boutiqueFabricationId,
      boutique_retrait_id: saisie.boutiqueRetraitId,
      retrait_le: retrait_le as string,
      prix_centimes,
      acompte_centimes,
    },
  };
}

/** Affichage « JJ/MM à HHhMM ». */
export function formatRetraitComplet(iso: string): string {
  const jour = jourRetraitParis(iso);
  const [, m, d] = jour.split('-');
  return `${d}/${m} à ${formatHeureRetrait(iso)}`;
}

/**
 * Le signalement « pas reçu » est possible à partir d'une heure avant le retrait,
 * tant que la commande n'est pas reçue (à faire ou prête).
 */
export function peutSignalerNonRecue(
  retraitLe: string,
  statut: StatutCommande,
  maintenant: Date = new Date(),
): { ok: true } | { ok: false; aPartirDe: string } {
  if (statut !== 'a_faire' && statut !== 'prete') {
    return { ok: false, aPartirDe: formatHeureRetrait(retraitLe) };
  }
  const seuil = new Date(new Date(retraitLe).getTime() - 60 * 60 * 1000);
  if (maintenant.getTime() < seuil.getTime()) {
    return { ok: false, aPartirDe: formatHeureRetrait(seuil.toISOString()) };
  }
  return { ok: true };
}

/** Libellé « Non reçue signalée à HHhMM ». */
export function libelleNonRecueSignalee(iso: string): string {
  return `Non reçue signalée à ${formatHeureRetrait(iso)}`;
}

/** Libellé « Reçue à 14h05 ». */
export function libelleRecueA(iso: string): string {
  return `Reçue à ${formatHeureRetrait(iso)}`;
}

/** Extrait jour + heure Paris d'un timestamptz pour préremplir le formulaire. */
export function decomposerRetrait(iso: string): { jour: string; heure: string } {
  const jour = jourRetraitParis(iso);
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const hh = (parts.find((p) => p.type === 'hour')?.value ?? '00').padStart(2, '0');
  const mm = (parts.find((p) => p.type === 'minute')?.value ?? '00').padStart(2, '0');
  return { jour, heure: `${hh}:${mm}` };
}

/** Centimes → chaîne « 35,00 » pour le formulaire. */
export function centimesVersSaisie(centimes: number | null | undefined): string {
  if (centimes == null) return '';
  const euros = (centimes / 100).toFixed(2).replace('.', ',');
  return euros;
}
