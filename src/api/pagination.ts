/** Supabase renvoie au maximum 1000 lignes par requête : on lit page par page avec .range. */

const TAILLE_PAGE = 1000;
const TAILLE_PAQUET_IN = 200;

type RequetePaginee<T> = {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
};

export async function lireToutesLesLignes<T>(
  construire: () => RequetePaginee<T>,
): Promise<T[]> {
  const resultat: T[] = [];
  let debut = 0;

  for (;;) {
    const { data, error } = await construire().range(debut, debut + TAILLE_PAGE - 1);
    if (error) throw error;
    const page = data ?? [];
    resultat.push(...page);
    if (page.length < TAILLE_PAGE) break;
    debut += TAILLE_PAGE;
  }

  return resultat;
}

/** Découpe une liste d'identifiants pour .in() (limite de longueur d'URL). */
export function paquetsDe<T>(liste: T[], taille = TAILLE_PAQUET_IN): T[][] {
  const paquets: T[][] = [];
  for (let i = 0; i < liste.length; i += taille) {
    paquets.push(liste.slice(i, i + taille));
  }
  return paquets;
}
