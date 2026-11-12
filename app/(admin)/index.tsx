import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useCaJournalier, usePatissiersPourCa, usePertesPeriode } from '@/api/ca';
import { AdminCarte } from '@/components/admin-carte';
import { AdminCarteClassement } from '@/components/admin-carte-classement';
import { AdminPuce } from '@/components/admin-puce';
import { CarteHeros } from '@/components/carte-heros';
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
  nomBoutiqueCourt,
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
import {
  couleurs,
  espacements,
  ombres,
  polices,
  rayonCarte,
  seuilOrdinateur,
  styleChiffre,
  styleTitreSection,
  tailles,
} from '@/theme';

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
  const { width } = useWindowDimensions();
  const ordinateur = width >= seuilOrdinateur;
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
    const boutiquesVente = (boutiques.data ?? []).filter((b) => !b.est_laboratoire);
    const idsVente = new Set(boutiquesVente.map((b) => b.id));
    const noms = new Map(boutiquesVente.map((b) => [b.id, b.nom]));
    const groupes = parBoutique(lignes).filter((g) => idsVente.has(g.cle));
    const vus = new Set(groupes.map((g) => g.cle));
    const liste = groupes.map((g) => ({
      id: g.cle,
      nom: noms.get(g.cle) ?? 'Boutique',
      caCentimes: g.caCentimes,
      vendu: g.vendu,
    }));
    for (const b of boutiquesVente) {
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

  function legendesBoutiqueSiToutes(produits: ProduitClasse[]): Record<string, string> | undefined {
    if (boutiqueId !== null) return undefined;
    const map: Record<string, string> = {};
    for (const p of produits) {
      const nom = p.boutiqueId ? nomsBoutiques.get(p.boutiqueId) : undefined;
      if (nom) map[p.cle] = nomBoutiqueCourt(nom);
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }

  const produitsClasseBoutiqueOuverte = useMemo(() => {
    if (!boutiqueOuverte) return [];
    return classementProduits(lignes, boutiqueOuverte, triBoutique);
  }, [lignes, boutiqueOuverte, triBoutique]);

  const legendesBoutiqueOuverte = useMemo(
    () => legendesBoutiqueSiToutes(produitsClasseBoutiqueOuverte),
    [produitsClasseBoutiqueOuverte, boutiqueId, nomsBoutiques],
  );

  const produitsClasseFiltre = useMemo(() => {
    if (boutiqueId === null) return [];
    return classementProduits(lignes, null, triFiltre);
  }, [lignes, boutiqueId, triFiltre]);

  const produitsPertes = useMemo(() => classementPertes(lignes, null), [lignes]);

  const legendesPertes = useMemo(
    () => legendesBoutiqueSiToutes(produitsPertes),
    [produitsPertes, boutiqueId, nomsBoutiques],
  );

  const sousTitreHeros = useMemo(() => {
    const libellePeriode = PERIODES.find((p) => p.id === periode)?.libelle ?? '';
    const libelleBoutique =
      boutiqueId === null
        ? 'Toutes'
        : (boutiques.data?.find((b) => b.id === boutiqueId)?.nom ?? 'Toutes');
    return `${libellePeriode} · ${libelleBoutique}`;
  }, [periode, boutiqueId, boutiques.data]);

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

  const filtres = (
    <>
      <Text style={styles.section}>Boutique</Text>
      <View style={styles.puces}>
        <AdminPuce
          libelle="Toutes"
          active={boutiqueId === null}
          onPress={() => {
            setBoutiqueId(null);
            setBoutiqueOuverte(null);
          }}
        />
        {(boutiques.data ?? [])
          .filter((b) => !b.est_laboratoire)
          .map((b) => (
            <AdminPuce
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
          <AdminPuce
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
    </>
  );

  const herosEtCourbe = (caAffiche: number) => (
    <View style={[styles.colonneGauche, ordinateur && styles.colonneFlex]}>
      <CarteHeros
        libelle="Chiffre d'affaires"
        chiffre={formatEuros(caAffiche)}
        accessibiliteChiffre={`CA total ${formatEuros(caAffiche)}`}
        sousTitre={sousTitreHeros}
      />
      {courbeVisible && datesCourbe ? (
        <CourbeCa
          lignes={lignesCourbe}
          debut={datesCourbe.debut}
          fin={datesCourbe.fin}
          jourMisEnAvant={dates?.fin ?? datesCourbe.fin}
        />
      ) : null}
      {caAffiche > 0 || totalPertes > 0 || chiffres.vendu > 0 || chiffres.jete > 0 ? (
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
      ) : null}
      {pertesOuvertes ? (
        <ClassementPertes produits={produitsPertes} legendes={legendesPertes} />
      ) : null}
    </View>
  );

  const classements = (
    <View
      style={[
        styles.colonneDroite,
        ordinateur && styles.colonneFlex,
        ordinateur && styles.colonneDroiteOrdi,
      ]}
    >
      {classementBoutiques.length > 0 ? (
        <>
          <Text style={styles.section}>Chiffre d'affaires par boutique</Text>
          {classementBoutiques.map((b) => {
            const ouvert = boutiqueOuverte === b.id;
            const largeur =
              b.caCentimes <= 0 || maxCaBoutique <= 0
                ? 0
                : Math.max(4, Math.round((b.caCentimes / maxCaBoutique) * 100));
            return (
              <AdminCarteClassement
                key={b.id}
                nom={b.nom}
                montant={formatEuros(b.caCentimes)}
                largeurPct={largeur}
                detail={`Vendus : ${b.vendu}`}
                ouvert={ouvert}
                accessibilityLabel={`Voir le classement de ${b.nom}`}
                onPress={() => {
                  setBoutiqueOuverte(ouvert ? null : b.id);
                  if (!ouvert) setTriBoutique('ca');
                }}
              >
                {ouvert ? (
                  <ClassementProduits
                    produits={produitsClasseBoutiqueOuverte}
                    tri={triBoutique}
                    onTriChange={setTriBoutique}
                    legendes={legendesBoutiqueOuverte}
                  />
                ) : null}
              </AdminCarteClassement>
            );
          })}
        </>
      ) : null}

      {boutiqueId !== null ? (
        <>
          <Text style={styles.section}>Classement des produits</Text>
          <AdminCarte>
            <ClassementProduits
              produits={produitsClasseFiltre}
              tri={triFiltre}
              onTriChange={setTriFiltre}
            />
          </AdminCarte>
        </>
      ) : null}

      <Text style={styles.section}>Chiffre d'affaires par employé</Text>
      {classement.map((emp) => {
        const ouvert = employeOuvert === emp.id;
        const largeur =
          emp.caCentimes <= 0 || maxCa <= 0
            ? 0
            : Math.max(4, Math.round((emp.caCentimes / maxCa) * 100));
        const detail = ouvert ? detailFabricant(lignes, emp.id) : null;
        return (
          <AdminCarteClassement
            key={emp.id}
            nom={emp.nom}
            montant={formatEuros(emp.caCentimes)}
            largeurPct={largeur}
            ouvert={ouvert}
            accessibilityLabel={`Voir le détail de ${emp.nom}`}
            onPress={() => setEmployeOuvert(ouvert ? null : emp.id)}
          >
            {detail ? <DetailCaEmploye detail={detail} /> : null}
          </AdminCarteClassement>
        );
      })}

      {pertesParProduit.length > 0 ? (
        <AdminCarte>
          <Text style={styles.sousSection}>Pertes en production par produit</Text>
          {pertesParProduit.map((p) => (
            <Text key={p.nom} style={styles.detailLigne}>
              {p.nom} — {p.quantite}
            </Text>
          ))}
        </AdminCarte>
      ) : null}
    </View>
  );

  return (
    <Ecran
      defilement
      enRafraichissement={ca.isRefetching || patissiers.isRefetching || pertes.isRefetching}
      onRafraichir={() => {
        void rafraichir();
      }}
    >
      {filtres}

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
        <View style={[styles.grille, ordinateur && styles.grilleOrdi]}>
          {herosEtCourbe(0)}
          <View style={[styles.colonneDroite, ordinateur && styles.colonneFlex]}>
            <EtatVide message="Aucune vente enregistrée sur cette période." />
          </View>
        </View>
      ) : (
        <View style={[styles.grille, ordinateur && styles.grilleOrdi]}>
          {herosEtCourbe(chiffres.caCentimes)}
          {classements}
        </View>
      )}
    </Ecran>
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
      <View style={styles.chiffreEntete}>
        <Text style={styles.chiffreLibelle}>{libelle}</Text>
        {onPress ? (
          <Ionicons name="chevron-forward" size={16} color={couleurs.texteMuet} />
        ) : null}
      </View>
      <Text style={styles.chiffreValeur}>{valeur}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.chiffre, ombres.douce, pressed && styles.appuye]}
        accessibilityRole="button"
        accessibilityLabel={accessibiliteLibelle ?? libelle}
      >
        {contenu}
      </Pressable>
    );
  }
  return <View style={[styles.chiffre, ombres.douce]}>{contenu}</View>;
}

const styles = StyleSheet.create({
  section: {
    ...styleTitreSection,
    marginTop: espacements.m,
    marginBottom: 4,
  },
  sousSection: {
    ...styleTitreSection,
    marginTop: 0,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  datesPerso: {
    gap: espacements.m,
    marginTop: espacements.m,
  },
  erreurFiltre: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
  grille: {
    gap: espacements.m,
    marginTop: espacements.s,
  },
  grilleOrdi: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacements.l,
  },
  colonneGauche: {
    minWidth: 0,
    gap: espacements.s,
  },
  colonneDroite: {
    minWidth: 0,
    gap: 10,
  },
  colonneFlex: {
    flex: 1,
  },
  colonneDroiteOrdi: {
    paddingTop: 0,
  },
  chiffres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: espacements.s,
  },
  chiffre: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: couleurs.surface,
    borderRadius: rayonCarte,
    paddingVertical: espacements.m,
    paddingHorizontal: espacements.m,
    gap: 4,
    minHeight: 72,
  },
  chiffreEntete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  chiffreLibelle: {
    fontSize: tailles.legend,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
    flexShrink: 1,
  },
  chiffreValeur: {
    ...styleChiffre,
    fontSize: tailles.grand,
    color: couleurs.texte,
  },
  detailLigne: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    paddingVertical: 4,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
  },
  appuye: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
});
