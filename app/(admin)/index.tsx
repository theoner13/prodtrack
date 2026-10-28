import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useCaJournalier, usePatissiersPourCa } from '@/api/ca';
import { Champ } from '@/components/champ';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import {
  datesPeriode,
  formatDateFr,
  parseDateFr,
  parEmploye,
  parJour,
  parProduit,
  totaux,
  type TypePeriode,
} from '@/lib/ca';
import { aujourdhuiParis, formatEuros } from '@/lib/format';
import { couleurs, espacements, rayon, tailles } from '@/theme';

type PeriodeChoix = TypePeriode | 'perso';

const PERIODES: { id: PeriodeChoix; libelle: string }[] = [
  { id: 'aujourdhui', libelle: "Aujourd'hui" },
  { id: 'hier', libelle: 'Hier' },
  { id: 'semaine', libelle: 'Cette semaine' },
  { id: 'mois', libelle: 'Ce mois' },
  { id: 'perso', libelle: 'Personnalisée' },
];

type EmployeAffiche = {
  id: string;
  nom: string;
  caCentimes: number;
  vendu: number;
  jete: number;
};

export default function EcranTableauDeBord() {
  const aujourdhui = aujourdhuiParis();
  const boutiques = useBoutiques();

  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [periode, setPeriode] = useState<PeriodeChoix>('aujourdhui');
  const [duTexte, setDuTexte] = useState(formatDateFr(aujourdhui));
  const [auTexte, setAuTexte] = useState(formatDateFr(aujourdhui));
  const [employeOuvert, setEmployeOuvert] = useState<string | null>(null);

  const dates = useMemo(() => {
    if (periode !== 'perso') {
      return datesPeriode(periode, aujourdhui);
    }
    const debut = parseDateFr(duTexte);
    const fin = parseDateFr(auTexte);
    if (!debut || !fin) return null;
    if (debut > fin) return null;
    return { debut, fin };
  }, [periode, aujourdhui, duTexte, auTexte]);

  const erreurPeriode = useMemo(() => {
    if (periode !== 'perso') return null;
    const debut = parseDateFr(duTexte);
    const fin = parseDateFr(auTexte);
    if (!debut || !fin) {
      return 'Indiquez les dates au format JJ/MM/AAAA.';
    }
    if (debut > fin) {
      return 'La date de début doit être avant ou égale à la date de fin.';
    }
    return null;
  }, [periode, duTexte, auTexte]);

  const ca = useCaJournalier(dates?.debut ?? null, dates?.fin ?? null, boutiqueId);
  const patissiers = usePatissiersPourCa(boutiqueId);

  const lignes = ca.data ?? [];
  const chiffres = useMemo(() => totaux(lignes), [lignes]);

  const classement = useMemo((): EmployeAffiche[] => {
    const parId = new Map(parEmploye(lignes).map((g) => [g.cle, g]));
    const noms = new Map(
      lignes.map((l) => [l.fabricant_id ?? '', l.fabricant_nom]),
    );
    const actifs = patissiers.data ?? [];
    const vus = new Set<string>();
    const liste: EmployeAffiche[] = [];

    for (const p of actifs) {
      vus.add(p.id);
      const g = parId.get(p.id);
      liste.push({
        id: p.id,
        nom: `${p.prenom} ${p.nom}`.trim(),
        caCentimes: g?.caCentimes ?? 0,
        vendu: g?.vendu ?? 0,
        jete: g?.jete ?? 0,
      });
    }

    for (const [id, g] of parId) {
      if (vus.has(id)) continue;
      liste.push({
        id,
        nom: noms.get(id) ?? 'Employé',
        caCentimes: g.caCentimes,
        vendu: g.vendu,
        jete: g.jete,
      });
    }

    return liste.sort((a, b) => b.caCentimes - a.caCentimes || a.nom.localeCompare(b.nom, 'fr'));
  }, [lignes, patissiers.data]);

  const maxCa = classement[0]?.caCentimes ?? 0;

  const produitsClasses = useMemo(() => {
    const groupes = parProduit(lignes);
    const noms = new Map(
      lignes.map((l) => [l.produit_id ?? '', l.produit_nom ?? 'Produit']),
    );
    return groupes.map((g) => ({
      ...g,
      nom: noms.get(g.cle) ?? g.cle,
    }));
  }, [lignes]);

  const meilleurs = produitsClasses.slice(0, 5);
  const moinsBons = [...produitsClasses].reverse().slice(0, 5);

  const detailEmploye = useCallback(
    (fabricantId: string) => {
      const duFabricant = lignes.filter((l) => l.fabricant_id === fabricantId);
      const produits = parProduit(duFabricant).map((g) => ({
        ...g,
        nom:
          duFabricant.find((l) => l.produit_id === g.cle)?.produit_nom ?? g.cle,
      }));
      const jours = parJour(duFabricant);
      return { produits, jours };
    },
    [lignes],
  );

  const enChargement =
    boutiques.isLoading ||
    (Boolean(dates) && (ca.isLoading || patissiers.isLoading));
  const enErreur = boutiques.isError || ca.isError || patissiers.isError;
  const aucuneVente = !enChargement && !enErreur && Boolean(dates) && lignes.length === 0;

  async function rafraichir() {
    await Promise.all([boutiques.refetch(), ca.refetch(), patissiers.refetch()]);
  }

  return (
    <Ecran
      titre="Tableau de bord"
      defilement
      enRafraichissement={ca.isRefetching || patissiers.isRefetching}
      onRafraichir={() => {
        void rafraichir();
      }}
    >
      <Text style={styles.section}>Boutique</Text>
      <View style={styles.puces}>
        <Puce
          libelle="Toutes"
          active={boutiqueId === null}
          onPress={() => setBoutiqueId(null)}
        />
        {(boutiques.data ?? []).map((b) => (
          <Puce
            key={b.id}
            libelle={b.nom}
            active={boutiqueId === b.id}
            onPress={() => setBoutiqueId(b.id)}
          />
        ))}
      </View>

      <Text style={styles.section}>Période</Text>
      <View style={styles.puces}>
        {PERIODES.map((p) => (
          <Puce
            key={p.id}
            libelle={p.libelle}
            active={periode === p.id}
            onPress={() => {
              setPeriode(p.id);
              if (p.id === 'perso') {
                const d = datesPeriode('aujourdhui', aujourdhui);
                setDuTexte(formatDateFr(d.debut));
                setAuTexte(formatDateFr(d.fin));
              }
            }}
          />
        ))}
      </View>

      {periode === 'perso' ? (
        <View style={styles.datesPerso}>
          <Champ
            libelle="Du"
            value={duTexte}
            onChangeText={setDuTexte}
            placeholder="JJ/MM/AAAA"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Champ
            libelle="Au"
            value={auTexte}
            onChangeText={setAuTexte}
            placeholder="JJ/MM/AAAA"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {erreurPeriode ? <Text style={styles.erreurFiltre}>{erreurPeriode}</Text> : null}
        </View>
      ) : null}

      {erreurPeriode ? null : enChargement ? (
        <EtatChargement />
      ) : enErreur ? (
        <EtatErreur
          message="Impossible de charger le chiffre d'affaires."
          onReessayer={() => {
            void rafraichir();
          }}
        />
      ) : aucuneVente ? (
        <EtatVide message="Aucune vente enregistrée sur cette période." />
      ) : (
        <>
          <View style={styles.chiffres}>
            <ChiffreCle libelle="CA total" valeur={formatEuros(chiffres.caCentimes)} />
            <ChiffreCle libelle="Vendus" valeur={String(chiffres.vendu)} />
            <ChiffreCle libelle="Jetés" valeur={String(chiffres.jete)} />
            <ChiffreCle
              libelle="Taux de perte"
              valeur={`${chiffres.tauxPerte.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`}
            />
          </View>

          <Text style={styles.section}>Chiffre d'affaires par employé</Text>
          {classement.map((emp) => {
            const ouvert = employeOuvert === emp.id;
            const largeur =
              maxCa > 0 ? Math.max(4, Math.round((emp.caCentimes / maxCa) * 100)) : 0;
            const detail = ouvert ? detailEmploye(emp.id) : null;
            return (
              <Pressable
                key={emp.id}
                onPress={() => setEmployeOuvert(ouvert ? null : emp.id)}
                style={styles.carteEmploye}
              >
                <View style={styles.ligneEmploye}>
                  <Text style={styles.nomEmploye}>{emp.nom}</Text>
                  <Text style={styles.montantEmploye}>{formatEuros(emp.caCentimes)}</Text>
                </View>
                <View style={styles.barreFond}>
                  <View style={[styles.barreRemplie, { width: `${largeur}%` }]} />
                </View>
                {detail ? (
                  <View style={styles.detail}>
                    <Text style={styles.detailTitre}>Par produit</Text>
                    {detail.produits.length === 0 ? (
                      <Text style={styles.detailLigne}>Aucune vente</Text>
                    ) : (
                      detail.produits.map((p) => (
                        <Text key={p.cle} style={styles.detailLigne}>
                          {p.nom} — {formatEuros(p.caCentimes)}
                        </Text>
                      ))
                    )}
                    <Text style={styles.detailTitre}>Par jour</Text>
                    {detail.jours.length === 0 ? (
                      <Text style={styles.detailLigne}>Aucune vente</Text>
                    ) : (
                      detail.jours.map((j) => (
                        <Text key={j.cle} style={styles.detailLigne}>
                          {formatDateFr(j.cle)} — {formatEuros(j.caCentimes)}
                        </Text>
                      ))
                    )}
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          <Text style={styles.section}>Produits</Text>
          <Text style={styles.sousSection}>5 meilleurs</Text>
          {meilleurs.map((p) => (
            <Text key={`m-${p.cle}`} style={styles.detailLigne}>
              {p.nom} — {formatEuros(p.caCentimes)}
            </Text>
          ))}
          <Text style={styles.sousSection}>5 moins bons</Text>
          {moinsBons.map((p) => (
            <Text key={`f-${p.cle}`} style={styles.detailLigne}>
              {p.nom} — {formatEuros(p.caCentimes)}
            </Text>
          ))}
        </>
      )}
    </Ecran>
  );
}

function Puce({
  libelle,
  active,
  onPress,
}: {
  libelle: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.puce, active && styles.puceActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.puceTexte, active && styles.puceTexteActive]}>{libelle}</Text>
    </Pressable>
  );
}

function ChiffreCle({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <View style={styles.chiffre}>
      <Text style={styles.chiffreLibelle}>{libelle}</Text>
      <Text style={styles.chiffreValeur}>{valeur}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.texte,
    marginTop: espacements.s,
  },
  sousSection: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  puce: {
    minHeight: 44,
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.s,
    borderRadius: rayon,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.surface,
    justifyContent: 'center',
  },
  puceActive: {
    borderColor: couleurs.principal,
    backgroundColor: couleurs.principalClair,
  },
  puceTexte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontWeight: '600',
  },
  puceTexteActive: {
    color: couleurs.principalFonce,
  },
  datesPerso: {
    gap: espacements.m,
  },
  erreurFiltre: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
  },
  chiffres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.m,
  },
  chiffre: {
    flexGrow: 1,
    flexBasis: '40%',
    backgroundColor: couleurs.surface,
    borderRadius: rayon,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espacements.m,
    gap: espacements.xs,
  },
  chiffreLibelle: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  chiffreValeur: {
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.texte,
  },
  carteEmploye: {
    backgroundColor: couleurs.surface,
    borderRadius: rayon,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espacements.m,
    gap: espacements.s,
  },
  ligneEmploye: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espacements.m,
  },
  nomEmploye: {
    flex: 1,
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
  },
  montantEmploye: {
    fontSize: tailles.normal,
    fontWeight: '700',
    color: couleurs.principalFonce,
  },
  barreFond: {
    height: 12,
    borderRadius: 6,
    backgroundColor: couleurs.principalClair,
    overflow: 'hidden',
  },
  barreRemplie: {
    height: '100%',
    backgroundColor: couleurs.principal,
    borderRadius: 6,
  },
  detail: {
    gap: espacements.xs,
    paddingTop: espacements.s,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  detailTitre: {
    fontSize: tailles.petit,
    fontWeight: '700',
    color: couleurs.texteSecondaire,
    marginTop: espacements.s,
  },
  detailLigne: {
    fontSize: tailles.petit,
    color: couleurs.texte,
  },
});
