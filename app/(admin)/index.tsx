import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useCaJournalier, usePatissiersPourCa, usePertesPeriode } from '@/api/ca';
import { Champ } from '@/components/champ';
import { ClassementPertes } from '@/components/classement-pertes';
import { ClassementProduits } from '@/components/classement-produits';
import { CourbeCa } from '@/components/courbe-ca';
import { DetailCaEmploye } from '@/components/detail-ca-employe';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import {
  classementPertes,
  classementProduits,
  datesPeriode,
  detailFabricant,
  formatDateFr,
  formatTauxPerte,
  libelleProduitBoutique,
  parseDateFr,
  parBoutique,
  parEmploye,
  totaux,
  type ProduitClasse,
  type TriClassementProduit,
  type TypePeriode,
} from '@/lib/ca';
import { courbeADesVentes, plageCourbe } from '@/lib/courbe-ca';
import { aujourdhuiParis, formatEuros } from '@/lib/format';
import { couleurs, espacements, styleTitreSection, tailles } from '@/theme';

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
  const [boutiqueOuverte, setBoutiqueOuverte] = useState<string | null>(null);
  const [triBoutique, setTriBoutique] = useState<TriClassementProduit>('ca');
  const [triFiltre, setTriFiltre] = useState<TriClassementProduit>('ca');
  const [pertesOuvertes, setPertesOuvertes] = useState(false);

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
  const pertes = usePertesPeriode(dates?.debut ?? null, dates?.fin ?? null, boutiqueId);

  // Courbe : 7 jours pour Aujourd'hui/Hier ; aussi pour Semaine/Mois si < 7 jours.
  const datesCourbe = useMemo(() => {
    if (!dates) return null;
    return plageCourbe(periode, dates.debut, dates.fin);
  }, [dates, periode]);

  const caCourbe = useCaJournalier(
    datesCourbe?.debut ?? null,
    datesCourbe?.fin ?? null,
    boutiqueId,
  );

  const lignes = ca.data ?? [];
  const lignesCourbe = caCourbe.data ?? [];
  const chiffres = useMemo(() => totaux(lignes), [lignes]);
  const courbeVisible = useMemo(() => {
    if (!datesCourbe) return false;
    return courbeADesVentes(lignesCourbe, datesCourbe.debut, datesCourbe.fin);
  }, [lignesCourbe, datesCourbe]);

  const totalPertes = useMemo(
    () => (pertes.data ?? []).reduce((somme, p) => somme + p.quantite, 0),
    [pertes.data],
  );

  const pertesParProduit = useMemo(() => {
    const map = new Map<string, { nom: string; quantite: number }>();
    for (const p of pertes.data ?? []) {
      const existant = map.get(p.produit_id);
      if (existant) {
        existant.quantite += p.quantite;
      } else {
        map.set(p.produit_id, { nom: p.produit_nom, quantite: p.quantite });
      }
    }
    return [...map.values()].sort(
      (a, b) => b.quantite - a.quantite || a.nom.localeCompare(b.nom, 'fr'),
    );
  }, [pertes.data]);

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

  const classementBoutiques = useMemo(() => {
    if (boutiqueId !== null) return [];
    const noms = new Map((boutiques.data ?? []).map((b) => [b.id, b.nom]));
    const groupes = parBoutique(lignes);
    const vus = new Set(groupes.map((g) => g.cle));
    const liste = groupes.map((g) => ({
      id: g.cle,
      nom: noms.get(g.cle) ?? 'Boutique',
      caCentimes: g.caCentimes,
      vendu: g.vendu,
    }));
    for (const b of boutiques.data ?? []) {
      if (vus.has(b.id)) continue;
      liste.push({ id: b.id, nom: b.nom, caCentimes: 0, vendu: 0 });
    }
    return liste.sort((a, b) => b.caCentimes - a.caCentimes || a.nom.localeCompare(b.nom, 'fr'));
  }, [lignes, boutiques.data, boutiqueId]);

  const maxCaBoutique = classementBoutiques[0]?.caCentimes ?? 0;

  const nomsBoutiques = useMemo(
    () => new Map((boutiques.data ?? []).map((b) => [b.id, b.nom])),
    [boutiques.data],
  );

  function avecSuffixeBoutiqueSiToutes(produits: ProduitClasse[]): ProduitClasse[] {
    if (boutiqueId !== null) return produits;
    return produits.map((p) => ({
      ...p,
      nom: libelleProduitBoutique(
        p.nom,
        p.boutiqueId ? nomsBoutiques.get(p.boutiqueId) : undefined,
        true,
      ),
    }));
  }

  const produitsClasseBoutiqueOuverte = useMemo(() => {
    if (!boutiqueOuverte) return [];
    return avecSuffixeBoutiqueSiToutes(
      classementProduits(lignes, boutiqueOuverte, triBoutique),
    );
  }, [lignes, boutiqueOuverte, triBoutique, boutiqueId, nomsBoutiques]);

  const produitsClasseFiltre = useMemo(() => {
    if (boutiqueId === null) return [];
    // Une seule boutique filtrée : pas de suffixe.
    return classementProduits(lignes, null, triFiltre);
  }, [lignes, boutiqueId, triFiltre]);

  const produitsPertes = useMemo(
    () => avecSuffixeBoutiqueSiToutes(classementPertes(lignes, null)),
    [lignes, boutiqueId, nomsBoutiques],
  );

  const enChargement =
    boutiques.isLoading ||
    (Boolean(dates) &&
      (ca.isLoading || caCourbe.isLoading || patissiers.isLoading || pertes.isLoading));
  const enErreur =
    boutiques.isError || ca.isError || caCourbe.isError || patissiers.isError || pertes.isError;
  const aucuneDonnee =
    !enChargement &&
    !enErreur &&
    Boolean(dates) &&
    lignes.length === 0 &&
    totalPertes === 0;

  function basculerPertes() {
    setPertesOuvertes((o) => !o);
  }

  async function rafraichir() {
    await Promise.all([
      boutiques.refetch(),
      ca.refetch(),
      caCourbe.refetch(),
      patissiers.refetch(),
      pertes.refetch(),
    ]);
  }

  return (
    <Ecran
      defilement
      enRafraichissement={ca.isRefetching || patissiers.isRefetching || pertes.isRefetching}
      onRafraichir={() => {
        void rafraichir();
      }}
    >
      <Text style={styles.section}>Boutique</Text>
      <View style={styles.puces}>
        <Puce
          libelle="Toutes"
          active={boutiqueId === null}
          onPress={() => {
            setBoutiqueId(null);
            setBoutiqueOuverte(null);
          }}
        />
        {(boutiques.data ?? []).map((b) => (
          <Puce
            key={b.id}
            libelle={b.nom}
            active={boutiqueId === b.id}
            onPress={() => {
              setBoutiqueId(b.id);
              setBoutiqueOuverte(null);
            }}
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
      ) : aucuneDonnee ? (
        courbeVisible && datesCourbe ? (
          <>
            <View style={styles.blocCa}>
              <Text style={styles.caLibelle}>Chiffre d'affaires</Text>
              <Text
                style={styles.caValeur}
                accessibilityLabel={`CA total ${formatEuros(0)}`}
              >
                {formatEuros(0)}
              </Text>
              <CourbeCa
                lignes={lignesCourbe}
                debut={datesCourbe.debut}
                fin={datesCourbe.fin}
                jourMisEnAvant={dates?.fin ?? datesCourbe.fin}
              />
            </View>
            <EtatVide message="Aucune vente enregistrée sur cette période." />
          </>
        ) : (
          <EtatVide message="Aucune vente enregistrée sur cette période." />
        )
      ) : (
        <>
          <View style={styles.blocCa}>
            <Text style={styles.caLibelle}>Chiffre d'affaires</Text>
            <Text style={styles.caValeur} accessibilityLabel={`CA total ${formatEuros(chiffres.caCentimes)}`}>
              {formatEuros(chiffres.caCentimes)}
            </Text>
            {courbeVisible && datesCourbe ? (
              <CourbeCa
                lignes={lignesCourbe}
                debut={datesCourbe.debut}
                fin={datesCourbe.fin}
                jourMisEnAvant={dates?.fin ?? datesCourbe.fin}
              />
            ) : null}
          </View>

          <View style={styles.chiffres}>
            <ChiffreCle libelle="Vendus" valeur={String(chiffres.vendu)} />
            <ChiffreCle
              libelle="Jetés"
              valeur={String(chiffres.jete)}
              onPress={basculerPertes}
              accessibiliteLibelle="Voir le classement des pertes"
            />
            <ChiffreCle
              libelle="Taux de perte"
              valeur={formatTauxPerte(chiffres.tauxPerte)}
              onPress={basculerPertes}
              accessibiliteLibelle="Voir le classement des pertes"
            />
            <ChiffreCle libelle="Pertes en production" valeur={String(totalPertes)} />
          </View>

          {pertesOuvertes ? <ClassementPertes produits={produitsPertes} /> : null}

          {classementBoutiques.length > 0 ? (
            <>
              <Text style={styles.section}>Chiffre d'affaires par boutique</Text>
              {classementBoutiques.map((b) => {
                const ouvert = boutiqueOuverte === b.id;
                const largeur =
                  maxCaBoutique > 0
                    ? Math.max(4, Math.round((b.caCentimes / maxCaBoutique) * 100))
                    : 0;
                return (
                  <View key={b.id} style={styles.carteEmploye}>
                    <Pressable
                      onPress={() => {
                        setBoutiqueOuverte(ouvert ? null : b.id);
                        if (!ouvert) setTriBoutique('ca');
                      }}
                      style={styles.enteteCarte}
                      accessibilityRole="button"
                      accessibilityLabel={`Voir le classement de ${b.nom}`}
                    >
                      <View style={styles.ligneEmploye}>
                        <Text style={styles.nomEmploye}>{b.nom}</Text>
                        <Text style={styles.montantEmploye}>{formatEuros(b.caCentimes)}</Text>
                      </View>
                      <View style={styles.barreFond}>
                        <View style={[styles.barreRemplie, { width: `${largeur}%` }]} />
                      </View>
                      <Text style={styles.detailLigne}>Vendus : {b.vendu}</Text>
                    </Pressable>
                    {ouvert ? (
                      <ClassementProduits
                        produits={produitsClasseBoutiqueOuverte}
                        tri={triBoutique}
                        onTriChange={setTriBoutique}
                      />
                    ) : null}
                  </View>
                );
              })}
            </>
          ) : null}

          {boutiqueId !== null ? (
            <>
              <Text style={styles.section}>Classement des produits</Text>
              <ClassementProduits
                produits={produitsClasseFiltre}
                tri={triFiltre}
                onTriChange={setTriFiltre}
              />
            </>
          ) : null}

          <Text style={styles.section}>Chiffre d'affaires par employé</Text>
          {classement.map((emp) => {
            const ouvert = employeOuvert === emp.id;
            const largeur =
              maxCa > 0 ? Math.max(4, Math.round((emp.caCentimes / maxCa) * 100)) : 0;
            const detail = ouvert ? detailFabricant(lignes, emp.id) : null;
            return (
              <View key={emp.id} style={styles.carteEmploye}>
                <Pressable
                  onPress={() => setEmployeOuvert(ouvert ? null : emp.id)}
                  style={styles.enteteCarte}
                  accessibilityRole="button"
                  accessibilityLabel={`Voir le détail de ${emp.nom}`}
                >
                  <View style={styles.ligneEmploye}>
                    <Text style={styles.nomEmploye}>{emp.nom}</Text>
                    <Text style={styles.montantEmploye}>{formatEuros(emp.caCentimes)}</Text>
                  </View>
                  <View style={styles.barreFond}>
                    <View style={[styles.barreRemplie, { width: `${largeur}%` }]} />
                  </View>
                </Pressable>
                {detail ? <DetailCaEmploye detail={detail} /> : null}
              </View>
            );
          })}

          {pertesParProduit.length > 0 ? (
            <>
              <Text style={styles.sousSection}>Pertes en production par produit</Text>
              {pertesParProduit.map((p) => (
                <Text key={p.nom} style={styles.detailLigne}>
                  {p.nom} — {p.quantite}
                </Text>
              ))}
            </>
          ) : null}
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

function ChiffreCle({
  libelle,
  valeur,
  onPress,
  accessibiliteLibelle,
}: {
  libelle: string;
  valeur: string;
  onPress?: () => void;
  accessibiliteLibelle?: string;
}) {
  const contenu = (
    <>
      <Text style={styles.chiffreLibelle}>{libelle}</Text>
      <Text style={styles.chiffreValeur}>{valeur}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={styles.chiffre}
        accessibilityRole="button"
        accessibilityLabel={accessibiliteLibelle ?? libelle}
      >
        {contenu}
      </Pressable>
    );
  }
  return <View style={styles.chiffre}>{contenu}</View>;
}

const styles = StyleSheet.create({
  section: {
    ...styleTitreSection,
    marginTop: espacements.m,
  },
  sousSection: {
    fontSize: tailles.petit,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  puce: {
    height: 32,
    paddingHorizontal: espacements.m,
    borderRadius: 16,
    backgroundColor: couleurs.fondPuce,
    justifyContent: 'center',
  },
  puceActive: {
    backgroundColor: couleurs.principal,
  },
  puceTexte: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontWeight: '500',
  },
  puceTexteActive: {
    color: couleurs.texteSurPrincipal,
  },
  datesPerso: {
    gap: espacements.m,
  },
  erreurFiltre: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
  },
  blocCa: {
    gap: 6,
    marginTop: espacements.s,
  },
  caLibelle: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
  },
  caValeur: {
    fontSize: tailles.ca,
    fontWeight: '400',
    letterSpacing: -1,
    color: couleurs.texte,
    fontVariant: ['tabular-nums'],
  },
  chiffres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: espacements.m,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: couleurs.bordure,
  },
  chiffre: {
    flexGrow: 1,
    flexBasis: '30%',
    paddingVertical: espacements.xs,
    paddingHorizontal: espacements.s,
    gap: 4,
    borderLeftWidth: 1,
    borderLeftColor: couleurs.bordure,
  },
  chiffreLibelle: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
  },
  chiffreValeur: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.3,
    color: couleurs.texte,
    fontVariant: ['tabular-nums'],
  },
  carteEmploye: {
    paddingVertical: 12,
    gap: espacements.s,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  enteteCarte: {
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
    fontWeight: '500',
    color: couleurs.texte,
  },
  montantEmploye: {
    fontSize: tailles.normal,
    fontWeight: '500',
    color: couleurs.texte,
    fontVariant: ['tabular-nums'],
  },
  barreFond: {
    height: 3,
    borderRadius: 3,
    backgroundColor: couleurs.fondSegment,
    overflow: 'hidden',
  },
  barreRemplie: {
    height: '100%',
    backgroundColor: couleurs.croute,
    borderRadius: 3,
  },
  detailLigne: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    paddingVertical: 4,
  },
});
