// Mise en forme des montants et des dates, en français.
// Les « jours » sont toujours des chaînes 'YYYY-MM-DD' (comme dans la base).

const FUSEAU = 'Europe/Paris';

const formateurEuros = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

// 1250 → "12,50 €"
export function formatEuros(centimes: number): string {
  // Intl met une espace insécable fine : on la remplace par une espace normale.
  return formateurEuros.format(centimes / 100).replace(/[  ]/g, ' ');
}

// "12,50" ou "12.5" → 1250. null si la saisie n'est pas un montant valide.
export function eurosVersCentimes(saisie: string): number | null {
  const texte = saisie.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(texte)) return null;
  const [entiers, decimales = ''] = texte.split('.');
  return Number(entiers) * 100 + Number(decimales.padEnd(2, '0'));
}

// 'YYYY-MM-DD' → Date à midi UTC (évite les décalages d'un jour).
function versDate(jour: string): Date {
  return new Date(`${jour}T12:00:00Z`);
}

function versJour(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Accepte un jour 'YYYY-MM-DD' ou une Date (prise en heure de Paris).
function normaliser(date: string | Date): Date {
  if (typeof date === 'string') return versDate(date);
  return versDate(date.toLocaleDateString('sv-SE', { timeZone: FUSEAU }));
}

// → "lun. 27/10"
export function formatDate(date: string | Date): string {
  const d = normaliser(date);
  const jourSemaine = d.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const jj = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${jourSemaine} ${jj}/${mm}`;
}

// → "lundi 27 octobre 2026"
export function formatJourComplet(date: string | Date): string {
  return normaliser(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Date du jour en heure de Paris → 'YYYY-MM-DD'
export function aujourdhuiParis(): string {
  // Le format suédois (sv-SE) donne directement YYYY-MM-DD.
  return new Date().toLocaleDateString('sv-SE', { timeZone: FUSEAU });
}

// Lundi de la semaine → 'YYYY-MM-DD'
export function debutSemaine(date: string | Date): string {
  const d = normaliser(date);
  const decalage = (d.getUTCDay() + 6) % 7; // lundi = 0 … dimanche = 6
  d.setUTCDate(d.getUTCDate() - decalage);
  return versJour(d);
}

// 1er jour du mois → 'YYYY-MM-DD'
export function debutMois(date: string | Date): string {
  return `${versJour(normaliser(date)).slice(0, 7)}-01`;
}
