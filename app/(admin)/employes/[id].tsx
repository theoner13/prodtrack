import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useCaJournalier } from '@/api/ca';
import { useEmploye } from '@/api/employes';
import { useUrlSignee } from '@/api/photos';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { DetailCaEmploye } from '@/components/detail-ca-employe';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import {
  datesPeriode,
  detailFabricant,
  formatDateFr,
  parseDateFr,
  totaux,
  type TypePeriode,
} from '@/lib/ca';
import { aujourdhuiParis, formatEuros } from '@/lib/format';
import { couleurs, espacements, styleTitreSection, tailles } from '@/theme';
import type { RoleEmploye } from '@/types/database';

type PeriodeChoix = TypePeriode | 'perso';

const PERIODES: { id: PeriodeChoix; libelle: string }[] = [
  { id: 'aujourdhui', libelle: "Aujourd'hui" },
  { id: 'hier', libelle: 'Hier' },
  { id: 'semaine', libelle: 'Cette semaine' },
  { id: 'mois', libelle: 'Ce mois' },
  { id: 'perso', libelle: 'Personnalisée' },
];

const ROLES: Record<RoleEmploye, string> = {
  admin: 'Admin',
  patissier: 'Pâtissier',
  vendeuse: 'Vente',
};

export default function EcranFicheEmploye() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const employeId = typeof id === 'string' ? id : id?.[0];
  const employe = useEmploye(employeId);
  const boutiques = useBoutiques();
  const photo = useUrlSignee(employe.data?.photo_url ?? null);

  const aujourdhui = aujourdhuiParis();
  const [periode, setPeriode] = useState<PeriodeChoix>('aujourdhui');
  const [duTexte, setDuTexte] = useState(formatDateFr(aujourdhui));
  const [auTexte, setAuTexte] = useState(formatDateFr(aujourdhui));

  const boutiqueId = employe.data?.boutique_id ?? null;
  const datesMois = useMemo(() => datesPeriode('mois', aujourdhui), [aujourdhui]);
  const caMois = useCaJournalier(datesMois.debut, datesMois.fin, boutiqueId);

  const datesDetail = useMemo(() => {
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
    if (debut > fin) return 'La date de début doit être avant ou égale à la date de fin.';
    return null;
  }, [periode, duTexte, auTexte]);

  const caDetail = useCaJournalier(
    datesDetail?.debut ?? null,
    datesDetail?.fin ?? null,
    boutiqueId,
  );

  const lignesMois = useMemo(
    () => (caMois.data ?? []).filter((l) => l.fabricant_id === employeId),
    [caMois.data, employeId],
  );

  const tuiles = useMemo(() => {
    const auj = datesPeriode('aujourdhui', aujourdhui);
    const sem = datesPeriode('semaine', aujourdhui);
    const mois = datesPeriode('mois', aujourdhui);
    return {
      aujourdhui: totaux(lignesMois.filter((l) => l.jour === auj.debut)),
      semaine: totaux(
        lignesMois.filter((l) => l.jour && l.jour >= sem.debut && l.jour <= sem.fin),
      ),
      mois: totaux(
        lignesMois.filter((l) => l.jour && l.jour >= mois.debut && l.jour <= mois.fin),
      ),
    };
  }, [lignesMois, aujourdhui]);

  const lignesDetail = useMemo(
    () => (caDetail.data ?? []).filter((l) => l.fabricant_id === employeId),
    [caDetail.data, employeId],
  );

  const detail = useMemo(
    () => (employeId ? detailFabricant(lignesDetail, employeId) : null),
    [lignesDetail, employeId],
  );

  const boutiqueNom = useMemo(() => {
    const bid = employe.data?.boutique_id;
    if (!bid) return '—';
    return (boutiques.data ?? []).find((b) => b.id === bid)?.nom ?? '—';
  }, [employe.data?.boutique_id, boutiques.data]);

  function retour() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(admin)/employes');
  }

  if (employe.isLoading || boutiques.isLoading) {
    return (
      <Ecran titre="Fiche employé" defilement>
        <Bouton titre="Retour" variante="secondaire" onPress={retour} />
        <EtatChargement />
      </Ecran>
    );
  }

  if (employe.isError || boutiques.isError) {
    return (
      <Ecran titre="Fiche employé" defilement>
        <Bouton titre="Retour" variante="secondaire" onPress={retour} />
        <EtatErreur
          message={messageErreur(employe.error ?? boutiques.error)}
          onReessayer={() => {
            void employe.refetch();
            void boutiques.refetch();
          }}
        />
      </Ecran>
    );
  }

  const profil = employe.data;
  if (!profil) {
    return (
      <Ecran titre="Fiche employé" defilement>
        <Bouton titre="Retour" variante="secondaire" onPress={retour} />
        <EtatVide message="Employé introuvable." />
      </Ecran>
    );
  }

  const nomComplet = `${profil.prenom} ${profil.nom}`.trim();
  const equipe =
    profil.equipe === 'jour' ? 'Jour' : profil.equipe === 'nuit' ? 'Nuit' : null;
  const estPatissier = profil.role === 'patissier';

  return (
    <Ecran titre="Fiche employé" defilement>
      <Bouton titre="Retour" variante="secondaire" onPress={retour} />

      <View style={styles.entete}>
        {photo.data ? (
          <Image
            source={{ uri: photo.data }}
            style={styles.photo}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.photo, styles.initiale]}>
            <Text style={styles.lettre}>{nomComplet.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.nom}>{nomComplet}</Text>
        <Text style={styles.meta}>Rôle : {ROLES[profil.role]}</Text>
        <Text style={styles.meta}>Boutique : {boutiqueNom}</Text>
        {equipe ? <Text style={styles.meta}>Équipe : {equipe}</Text> : null}
        {profil.archive_le ? <Text style={styles.archive}>Archivé</Text> : null}
      </View>

      {estPatissier ? (
        <>
          <Text style={styles.section}>Chiffre d'affaires</Text>
          {caMois.isLoading ? (
            <EtatChargement />
          ) : caMois.isError ? (
            <EtatErreur
              message="Impossible de charger le chiffre d'affaires."
              onReessayer={() => {
                void caMois.refetch();
              }}
            />
          ) : (
            <View style={styles.chiffres}>
              <ChiffreCle libelle="Aujourd'hui" valeur={formatEuros(tuiles.aujourdhui.caCentimes)} />
              <ChiffreCle libelle="Cette semaine" valeur={formatEuros(tuiles.semaine.caCentimes)} />
              <ChiffreCle libelle="Ce mois" valeur={formatEuros(tuiles.mois.caCentimes)} />
            </View>
          )}

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

          {erreurPeriode ? null : caDetail.isLoading ? (
            <EtatChargement />
          ) : caDetail.isError ? (
            <EtatErreur
              message="Impossible de charger le chiffre d'affaires."
              onReessayer={() => {
                void caDetail.refetch();
              }}
            />
          ) : detail ? (
            <DetailCaEmploye detail={detail} />
          ) : null}
        </>
      ) : (
        <Text style={styles.messageCa}>
          Le chiffre d'affaires est attribué aux pâtissiers.
        </Text>
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

const TAILLE_PHOTO = 72;

const styles = StyleSheet.create({
  entete: {
    alignItems: 'center',
    gap: espacements.s,
    paddingVertical: espacements.m,
  },
  photo: {
    width: TAILLE_PHOTO,
    height: TAILLE_PHOTO,
    borderRadius: 12,
  },
  initiale: {
    backgroundColor: couleurs.principalClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lettre: {
    fontSize: tailles.titre,
    fontWeight: '600',
    color: couleurs.principalFonce,
  },
  nom: {
    fontSize: tailles.grand,
    fontWeight: '600',
    color: couleurs.texte,
  },
  meta: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
  },
  archive: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.erreur,
  },
  section: {
    ...styleTitreSection,
    marginTop: espacements.m,
  },
  messageCa: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
    marginTop: espacements.m,
  },
  chiffres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  chiffre: {
    flexGrow: 1,
    flexBasis: '40%',
    backgroundColor: couleurs.fondGroupe,
    borderRadius: 10,
    padding: espacements.m,
    gap: espacements.xs,
  },
  chiffreLibelle: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
  },
  chiffreValeur: {
    fontSize: tailles.grand,
    fontWeight: '600',
    color: couleurs.texte,
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
});
