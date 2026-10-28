import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import {
  lireExportMouvements,
  lireExportVentes,
  telechargerCsv,
  useCaJournalier,
} from '@/api/ca';
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
import { dateCsv, genererCsv, montantEurosCsv } from '@/lib/csv';
import { aujourdhuiParis } from '@/lib/format';
import { couleurs, espacements, rayon, tailles } from '@/theme';

type PeriodeChoix = TypePeriode | 'perso';

const PERIODES: { id: PeriodeChoix; libelle: string }[] = [
  { id: 'aujourdhui', libelle: "Aujourd'hui" },
  { id: 'hier', libelle: 'Hier' },
  { id: 'semaine', libelle: 'Cette semaine' },
  { id: 'mois', libelle: 'Ce mois' },
  { id: 'perso', libelle: 'Personnalisée' },
];

const TYPE_FR: Record<'production' | 'sortie' | 'ajustement', string> = {
  production: 'Production',
  sortie: 'Sortie',
  ajustement: 'Ajustement',
};

export default function EcranExport() {
  const aujourdhui = aujourdhuiParis();
  const boutiques = useBoutiques();

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

  // Précharge le CA pour l'export « par employé et par jour »
  const ca = useCaJournalier(dates?.debut ?? null, dates?.fin ?? null, boutiqueId);

  function afficher(texte: string, type: 'succes' | 'erreur') {
    setTypeMessage(type);
    setMessage(texte);
  }

  async function exporter(
    type: 'ventes' | 'mouvements' | 'ca-employes',
  ): Promise<void> {
    if (!dates || erreurPeriode) {
      afficher(erreurPeriode ?? 'Période invalide.', 'erreur');
      return;
    }
    setExportEnCours(type);
    try {
      const { debut, fin } = dates;
      let contenu: string;
      let nbLignes: number;
      let prefixe: string;

      if (type === 'ventes') {
        const lignes = await lireExportVentes(debut, fin, boutiqueId);
        if (lignes.length === 0) {
          afficher('Aucune donnée à exporter sur cette période.', 'erreur');
          return;
        }
        contenu = genererCsv(
          [
            'Jour',
            'Boutique',
            'Produit',
            'Fabricant',
            'Vendu',
            'Jeté',
            'Reste',
            'Prix unitaire (€)',
            'CA (€)',
          ],
          lignes.map((l) => [
            dateCsv(l.jour),
            l.boutique_nom,
            l.produit_nom,
            l.fabricant_nom,
            l.vendu,
            l.jete,
            l.reste,
            montantEurosCsv(l.prix_unitaire_centimes),
            montantEurosCsv(l.ca_centimes),
          ]),
        );
        nbLignes = lignes.length;
        prefixe = 'ventes';
      } else if (type === 'mouvements') {
        const lignes = await lireExportMouvements(debut, fin, boutiqueId);
        if (lignes.length === 0) {
          afficher('Aucune donnée à exporter sur cette période.', 'erreur');
          return;
        }
        contenu = genererCsv(
          ['Jour', 'Boutique', 'Produit', 'Type', 'Quantité', 'Saisi par'],
          lignes.map((l) => [
            dateCsv(l.jour),
            l.boutique_nom,
            l.produit_nom,
            TYPE_FR[l.type],
            l.quantite,
            l.saisi_par_nom,
          ]),
        );
        nbLignes = lignes.length;
        prefixe = 'mouvements';
      } else {
        const resultat = await ca.refetch();
        if (resultat.error) throw resultat.error;
        const lignesCa = resultat.data ?? [];

        const map = new Map<
          string,
          { jour: string; employe: string; ca: number; vendu: number; jete: number }
        >();
        for (const l of lignesCa) {
          if (!l.jour || !l.fabricant_id) continue;
          const cle = `${l.jour}|${l.fabricant_id}`;
          const existant = map.get(cle) ?? {
            jour: l.jour,
            employe: l.fabricant_nom,
            ca: 0,
            vendu: 0,
            jete: 0,
          };
          existant.ca += l.ca_centimes ?? 0;
          existant.vendu += l.vendu ?? 0;
          existant.jete += l.jete ?? 0;
          map.set(cle, existant);
        }
        const lignes = [...map.values()].sort(
          (a, b) => a.jour.localeCompare(b.jour) || a.employe.localeCompare(b.employe, 'fr'),
        );
        if (lignes.length === 0) {
          afficher('Aucune donnée à exporter sur cette période.', 'erreur');
          return;
        }
        contenu = genererCsv(
          ['Jour', 'Employé', 'CA (€)', 'Vendu', 'Jeté'],
          lignes.map((l) => [
            dateCsv(l.jour),
            l.employe,
            montantEurosCsv(l.ca),
            l.vendu,
            l.jete,
          ]),
        );
        nbLignes = lignes.length;
        prefixe = 'ca-employes';
      }

      const nom = `prodtrack-${prefixe}-${debut}_${fin}.csv`;
      await telechargerCsv(nom, contenu);
      afficher(`Fichier prêt : ${nbLignes} ligne${nbLignes > 1 ? 's' : ''}.`, 'succes');
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
        Les fichiers CSV s’ouvrent dans Excel (séparateur point-virgule, accents conservés).
      </Text>

      <Bouton
        titre="Exporter les ventes"
        onPress={() => {
          void exporter('ventes');
        }}
        chargement={exportEnCours === 'ventes'}
        desactive={Boolean(erreurPeriode) || exportEnCours !== null}
      />
      <Bouton
        titre="Exporter les mouvements de stock"
        variante="secondaire"
        onPress={() => {
          void exporter('mouvements');
        }}
        chargement={exportEnCours === 'mouvements'}
        desactive={Boolean(erreurPeriode) || exportEnCours !== null}
      />
      <Bouton
        titre="Exporter le CA par employé et par jour"
        variante="secondaire"
        onPress={() => {
          void exporter('ca-employes');
        }}
        chargement={exportEnCours === 'ca-employes'}
        desactive={Boolean(erreurPeriode) || exportEnCours !== null}
      />
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
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.texte,
    marginTop: espacements.s,
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
  aide: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
});
