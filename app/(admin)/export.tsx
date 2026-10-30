import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import {
  lireExportMouvements,
  lireExportPertes,
  lireExportVentes,
  useCaJournalier,
  useNomEntreprise,
} from '@/api/ca';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur } from '@/components/etats';
import {
  datesPeriode,
  formatDateFr,
  parseDateFr,
  type TypePeriode,
} from '@/lib/ca';
import { telechargerPdf, telechargerXlsx } from '@/lib/exports-fichier';
import {
  genererHtmlRapport,
  nomFichierExport,
  preparerCaEmployes,
  preparerMouvements,
  preparerPertes,
  preparerVentes,
  type TableauExport,
} from '@/lib/exports';
import { aujourdhuiParis } from '@/lib/format';
import { couleurs, espacements, styleTitreSection, tailles } from '@/theme';

type PeriodeChoix = TypePeriode | 'perso';
type TypeExport = 'ventes' | 'mouvements' | 'ca-employes' | 'pertes';
type FormatExport = 'xlsx' | 'pdf';

const PERIODES: { id: PeriodeChoix; libelle: string }[] = [
  { id: 'aujourdhui', libelle: "Aujourd'hui" },
  { id: 'hier', libelle: 'Hier' },
  { id: 'semaine', libelle: 'Cette semaine' },
  { id: 'mois', libelle: 'Ce mois' },
  { id: 'perso', libelle: 'Personnalisée' },
];

const EXPORTS: {
  id: TypeExport;
  titre: string;
  description: string;
  libelleFichier: string;
}[] = [
  {
    id: 'ventes',
    titre: 'Ventes',
    description: 'Détail des ventes : produit, pâtissier, quantités et chiffre d’affaires.',
    libelleFichier: 'Ventes',
  },
  {
    id: 'mouvements',
    titre: 'Mouvements de stock',
    description: 'Productions, sorties et corrections saisies sur la période.',
    libelleFichier: 'Mouvements de stock',
  },
  {
    id: 'ca-employes',
    titre: 'CA par employé',
    description: 'Chiffre d’affaires, vendus et jetés par employé et par jour.',
    libelleFichier: 'CA par employé',
  },
  {
    id: 'pertes',
    titre: 'Pertes en production',
    description: 'Pertes déclarées : motif, quantité et retrait éventuel du stock.',
    libelleFichier: 'Pertes en production',
  },
];

export default function EcranExport() {
  const aujourdhui = aujourdhuiParis();
  const { profil } = useAuth();
  const boutiques = useBoutiques();
  const entreprise = useNomEntreprise(profil?.entreprise_id ?? null);

  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [periode, setPeriode] = useState<PeriodeChoix>('aujourdhui');
  const [duTexte, setDuTexte] = useState(formatDateFr(aujourdhui));
  const [auTexte, setAuTexte] = useState(formatDateFr(aujourdhui));
  const [message, setMessage] = useState<string | null>(null);
  const [typeMessage, setTypeMessage] = useState<'succes' | 'erreur'>('succes');
  const [exportEnCours, setExportEnCours] = useState<string | null>(null);

  const dates = useMemo(() => {
    if (periode !== 'perso') {
      return datesPeriode(periode, aujourdhui);
    }
    const debut = parseDateFr(duTexte);
    const fin = parseDateFr(auTexte);
    if (!debut || !fin || debut > fin) return null;
    return { debut, fin };
  }, [periode, aujourdhui, duTexte, auTexte]);

  const erreurPeriode = useMemo(() => {
    if (periode !== 'perso') return null;
    const debut = parseDateFr(duTexte);
    const fin = parseDateFr(auTexte);
    if (!debut || !fin) return 'Indiquez les dates au format JJ/MM/AAAA.';
    if (debut > fin) {
      return 'La date de début doit être avant ou égale à la date de fin.';
    }
    return null;
  }, [periode, duTexte, auTexte]);

  const ca = useCaJournalier(dates?.debut ?? null, dates?.fin ?? null, boutiqueId);

  const nomsBoutiques = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of boutiques.data ?? []) {
      map.set(b.id, b.nom);
    }
    return map;
  }, [boutiques.data]);

  const contexteExport = useMemo(() => {
    if (boutiqueId) {
      return nomsBoutiques.get(boutiqueId) ?? 'Boutique';
    }
    return entreprise.data ?? 'Toutes les boutiques';
  }, [boutiqueId, nomsBoutiques, entreprise.data]);

  function afficher(texte: string, type: 'succes' | 'erreur') {
    setTypeMessage(type);
    setMessage(texte);
  }

  async function construireTableau(
    type: TypeExport,
    debut: string,
    fin: string,
  ): Promise<TableauExport | null> {
    if (type === 'ventes') {
      const brutes = await lireExportVentes(debut, fin, boutiqueId);
      if (brutes.length === 0) return null;
      return preparerVentes(brutes, debut, fin, contexteExport).tableau;
    }
    if (type === 'mouvements') {
      const brutes = await lireExportMouvements(debut, fin, boutiqueId);
      if (brutes.length === 0) return null;
      return preparerMouvements(brutes, debut, fin, contexteExport).tableau;
    }
    if (type === 'pertes') {
      const brutes = await lireExportPertes(debut, fin, boutiqueId);
      if (brutes.length === 0) return null;
      return preparerPertes(brutes, debut, fin, contexteExport).tableau;
    }

    const resultat = await ca.refetch();
    if (resultat.error) throw resultat.error;
    const { tableau, lignes } = preparerCaEmployes(
      resultat.data ?? [],
      (id) => (id ? (nomsBoutiques.get(id) ?? '—') : '—'),
      debut,
      fin,
      contexteExport,
    );
    if (lignes.length === 0) return null;
    return tableau;
  }

  async function exporter(type: TypeExport, format: FormatExport): Promise<void> {
    if (!dates || erreurPeriode) {
      afficher(erreurPeriode ?? 'Période invalide.', 'erreur');
      return;
    }
    const cle = `${type}-${format}`;
    setExportEnCours(cle);
    try {
      const { debut, fin } = dates;
      const meta = EXPORTS.find((e) => e.id === type);
      if (!meta) return;

      const tableau = await construireTableau(type, debut, fin);
      if (!tableau) {
        afficher('Aucune donnée à exporter sur cette période.', 'erreur');
        return;
      }

      const nom = nomFichierExport(meta.libelleFichier, debut, fin, format);
      if (format === 'xlsx') {
        await telechargerXlsx(nom, tableau);
      } else {
        await telechargerPdf(nom, genererHtmlRapport(tableau, undefined, nom));
      }
      afficher(
        `Fichier prêt : ${tableau.lignes.length} ligne${tableau.lignes.length > 1 ? 's' : ''}.`,
        'succes',
      );
    } catch (probleme: unknown) {
      afficher(messageErreur(probleme), 'erreur');
    } finally {
      setExportEnCours(null);
    }
  }

  if (boutiques.isLoading) {
    return (
      <Ecran titre="Export">
        <EtatChargement />
      </Ecran>
    );
  }

  if (boutiques.isError) {
    return (
      <Ecran titre="Export">
        <EtatErreur
          message="Impossible de charger les boutiques."
          onReessayer={() => {
            void boutiques.refetch();
          }}
        />
      </Ecran>
    );
  }

  const desactive = Boolean(erreurPeriode) || exportEnCours !== null;

  return (
    <Ecran titre="Export" defilement>
      <Banniere
        message={message}
        type={typeMessage}
        onFermer={() => setMessage(null)}
      />

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

      <Text style={styles.aide}>
        Chaque export est disponible en Excel (.xlsx) et en PDF, lisibles sur téléphone et ordinateur.
      </Text>

      {EXPORTS.map((item) => (
        <View key={item.id} style={styles.blocExport}>
          <Text style={styles.titreExport}>{item.titre}</Text>
          <Text style={styles.descExport}>{item.description}</Text>
          <View style={styles.rangBoutons}>
            <View style={styles.boutonFlex}>
              <Bouton
                titre="Excel"
                pleineLargeur
                onPress={() => {
                  void exporter(item.id, 'xlsx');
                }}
                chargement={exportEnCours === `${item.id}-xlsx`}
                desactive={desactive}
              />
            </View>
            <View style={styles.boutonFlex}>
              <Bouton
                titre="PDF"
                pleineLargeur
                onPress={() => {
                  void exporter(item.id, 'pdf');
                }}
                chargement={exportEnCours === `${item.id}-pdf`}
                desactive={desactive}
              />
            </View>
          </View>
        </View>
      ))}
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

const styles = StyleSheet.create({
  section: {
    ...styleTitreSection,
    marginTop: espacements.m,
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
    color: couleurs.texte,
    fontWeight: '600',
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
  aide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.s,
  },
  blocExport: {
    gap: espacements.s,
    paddingVertical: espacements.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: couleurs.bordure,
  },
  titreExport: {
    fontSize: tailles.normal,
    fontWeight: '600',
    color: couleurs.texte,
  },
  descExport: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  rangBoutons: {
    flexDirection: 'row',
    gap: espacements.s,
  },
  boutonFlex: {
    flex: 1,
  },
});
