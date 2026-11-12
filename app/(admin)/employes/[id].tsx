import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useAProduitsLabo, useCaJournalier, useCaLaboratoire } from '@/api/ca';
import { useChangerArchivage, useEmploye } from '@/api/employes';
import { useUrlSignee } from '@/api/photos';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { AdminCarte } from '@/components/admin-carte';
import { AdminPuce } from '@/components/admin-puce';
import { Bouton } from '@/components/bouton';
import { BoutonRetour } from '@/components/bouton-retour';
import { CarteHeros } from '@/components/carte-heros';
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
import { detailCaLaboratoire } from '@/lib/laboratoire';
import {
  couleurs,
  espacements,
  ombres,
  polices,
  rayonCarte,
  seuilOrdinateur,
  styleChiffre,
  styleTitreSection,
  tailleToucheMin,
  tailles,
} from '@/theme';
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
  laboratoire: 'Laboratoire',
};

export default function EcranFicheEmploye() {
  const { width } = useWindowDimensions();
  const ordinateur = width >= seuilOrdinateur;
  const { id } = useLocalSearchParams<{ id: string }>();
  const employeId = typeof id === 'string' ? id : id?.[0];
  const { profil: moi } = useAuth();
  const employe = useEmploye(employeId);
  const boutiques = useBoutiques();
  const photo = useUrlSignee(employe.data?.photo_url ?? null);
  const archivage = useChangerArchivage();

  const aujourdhui = aujourdhuiParis();
  const [periode, setPeriode] = useState<PeriodeChoix>('aujourdhui');
  const [duTexte, setDuTexte] = useState(formatDateFr(aujourdhui));
  const [auTexte, setAuTexte] = useState(formatDateFr(aujourdhui));
  const [confirmationArchivage, setConfirmationArchivage] = useState(false);
  const [erreurArchivage, setErreurArchivage] = useState<string | null>(null);

  const boutiqueId = employe.data?.boutique_id ?? null;
  const datesTuiles = useMemo(() => {
    const sem = datesPeriode('semaine', aujourdhui);
    const mois = datesPeriode('mois', aujourdhui);
    const debut = sem.debut < mois.debut ? sem.debut : mois.debut;
    return { debut, fin: aujourdhui };
  }, [aujourdhui]);
  const caTuiles = useCaJournalier(datesTuiles.debut, datesTuiles.fin, boutiqueId);

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
  const aProduitsLabo = useAProduitsLabo(employeId ?? null);
  const caLabo = useCaLaboratoire(
    datesDetail?.debut ?? null,
    datesDetail?.fin ?? null,
    employeId ?? null,
  );

  const lignesTuiles = useMemo(
    () => (caTuiles.data ?? []).filter((l) => l.fabricant_id === employeId),
    [caTuiles.data, employeId],
  );

  const tuiles = useMemo(() => {
    const auj = datesPeriode('aujourdhui', aujourdhui);
    const sem = datesPeriode('semaine', aujourdhui);
    const mois = datesPeriode('mois', aujourdhui);
    return {
      aujourdhui: totaux(lignesTuiles.filter((l) => l.jour === auj.debut)),
      semaine: totaux(
        lignesTuiles.filter((l) => l.jour && l.jour >= sem.debut && l.jour <= sem.fin),
      ),
      mois: totaux(
        lignesTuiles.filter((l) => l.jour && l.jour >= mois.debut && l.jour <= mois.fin),
      ),
    };
  }, [lignesTuiles, aujourdhui]);

  const lignesDetail = useMemo(
    () => (caDetail.data ?? []).filter((l) => l.fabricant_id === employeId),
    [caDetail.data, employeId],
  );

  const detail = useMemo(
    () => (employeId ? detailFabricant(lignesDetail, employeId) : null),
    [lignesDetail, employeId],
  );

  const detailLabo = useMemo(
    () => (employeId ? detailCaLaboratoire(caLabo.data ?? [], employeId) : null),
    [caLabo.data, employeId],
  );

  const afficherCaLabo =
    Boolean(aProduitsLabo.data) || (caLabo.data ?? []).length > 0;

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

  async function confirmerArchivage(archiver: boolean) {
    if (!employeId) return;
    setErreurArchivage(null);
    try {
      await archivage.mutateAsync({ id: employeId, archiver });
      setConfirmationArchivage(false);
      router.replace('/(admin)/employes');
    } catch (probleme: unknown) {
      setErreurArchivage(messageErreur(probleme));
    }
  }

  if (employe.isLoading || boutiques.isLoading) {
    return (
      <Ecran defilement>
        <BoutonRetour onPress={retour} />
        <EtatChargement />
      </Ecran>
    );
  }

  if (employe.isError || boutiques.isError) {
    return (
      <Ecran defilement>
        <BoutonRetour onPress={retour} />
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
      <Ecran defilement>
        <BoutonRetour onPress={retour} />
        <EtatVide message="Employé introuvable." />
      </Ecran>
    );
  }

  const nomComplet = `${profil.prenom} ${profil.nom}`.trim();
  const equipe =
    profil.equipe === 'jour' ? 'Jour' : profil.equipe === 'nuit' ? 'Nuit' : null;
  const estPatissier = profil.role === 'patissier';

  return (
    <Ecran defilement>
      <View style={ordinateur ? styles.colonneLimitee : undefined}>
        <BoutonRetour onPress={retour} />

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
            {caTuiles.isLoading ? (
              <EtatChargement />
            ) : caTuiles.isError ? (
              <EtatErreur
                message="Impossible de charger le chiffre d'affaires."
                onReessayer={() => {
                  void caTuiles.refetch();
                }}
              />
            ) : (
              <>
                <CarteHeros
                  libelle="Aujourd'hui"
                  chiffre={formatEuros(tuiles.aujourdhui.caCentimes)}
                />
                <View style={styles.chiffres}>
                  <ChiffreCle
                    libelle="Cette semaine"
                    valeur={formatEuros(tuiles.semaine.caCentimes)}
                  />
                  <ChiffreCle libelle="Ce mois" valeur={formatEuros(tuiles.mois.caCentimes)} />
                </View>
              </>
            )}

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
              <AdminCarte>
                <DetailCaEmploye detail={detail} />
              </AdminCarte>
            ) : null}

            {afficherCaLabo ? (
              <>
                <Text style={styles.section}>CA laboratoire</Text>
                {erreurPeriode ? null : caLabo.isLoading || aProduitsLabo.isLoading ? (
                  <EtatChargement />
                ) : caLabo.isError || aProduitsLabo.isError ? (
                  <EtatErreur
                    message="Impossible de charger le CA laboratoire."
                    onReessayer={() => {
                      void caLabo.refetch();
                      void aProduitsLabo.refetch();
                    }}
                  />
                ) : detailLabo ? (
                  <AdminCarte style={styles.blocCaLabo}>
                    <Text style={styles.totalLabo}>
                      Total période : {formatEuros(detailLabo.totalCentimes)}
                    </Text>
                    {detailLabo.produits.length === 0 && detailLabo.jours.length === 0 ? (
                      <Text style={styles.videLabo}>Aucune sortie labo sur cette période.</Text>
                    ) : (
                      <>
                        <Text style={styles.sousSectionLabo}>Par produit</Text>
                        {detailLabo.produits.map((p) => (
                          <View key={p.cle} style={styles.ligneLabo}>
                            <Text style={styles.ligneLaboNom}>{p.nom}</Text>
                            <Text style={styles.ligneLaboQte}>{p.quantite}</Text>
                            <Text style={styles.ligneLaboCa}>{formatEuros(p.caCentimes)}</Text>
                          </View>
                        ))}
                        <Text style={styles.sousSectionLabo}>Par jour</Text>
                        {detailLabo.jours.map((j) => (
                          <View key={j.cle} style={styles.ligneLabo}>
                            <Text style={styles.ligneLaboNom}>{formatDateFr(j.cle)}</Text>
                            <Text style={styles.ligneLaboQte}>{j.quantite}</Text>
                            <Text style={styles.ligneLaboCa}>{formatEuros(j.caCentimes)}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </AdminCarte>
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <Text style={styles.messageCa}>
            Le chiffre d'affaires est attribué aux pâtissiers.
          </Text>
        )}

        {employeId !== moi?.id ? (
          <View style={styles.archivage}>
            {erreurArchivage ? <Text style={styles.erreurArchivage}>{erreurArchivage}</Text> : null}
            {confirmationArchivage ? (
              <View style={styles.confirmation}>
                <Text style={styles.confirmationTexte}>
                  {profil.archive_le
                    ? 'Réactiver ce compte ? La personne pourra à nouveau se connecter.'
                    : 'Archiver ce compte ? L’historique de production et de chiffre d’affaires est conservé. La personne ne pourra plus se connecter.'}
                </Text>
                <Bouton
                  titre={profil.archive_le ? 'Réactiver ce compte' : 'Archiver ce compte'}
                  variante={profil.archive_le ? 'principal' : 'danger'}
                  chargement={archivage.isPending}
                  onPress={() => void confirmerArchivage(profil.archive_le === null)}
                />
                <Bouton
                  titre="Annuler"
                  variante="secondaire"
                  onPress={() => setConfirmationArchivage(false)}
                />
              </View>
            ) : (
              <Pressable
                onPress={() => setConfirmationArchivage(true)}
                accessibilityRole="button"
                accessibilityLabel={
                  profil.archive_le ? 'Réactiver ce compte' : 'Archiver ce compte'
                }
                style={styles.lienArchiver}
              >
                <Text style={styles.lienArchiverTexte}>
                  {profil.archive_le ? 'Réactiver ce compte' : 'Archiver ce compte'}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </Ecran>
  );
}

function ChiffreCle({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <View style={[styles.chiffre, ombres.douce]}>
      <Text style={styles.chiffreLibelle}>{libelle}</Text>
      <Text style={styles.chiffreValeur}>{valeur}</Text>
    </View>
  );
}

const TAILLE_PHOTO = 88;

const styles = StyleSheet.create({
  colonneLimitee: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  entete: {
    alignItems: 'center',
    gap: espacements.s,
    paddingVertical: espacements.m,
  },
  photo: {
    width: TAILLE_PHOTO,
    height: TAILLE_PHOTO,
    borderRadius: rayonCarte,
  },
  initiale: {
    backgroundColor: couleurs.fondGroupe,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lettre: {
    fontSize: tailles.titre,
    fontWeight: '600',
    color: couleurs.principalFonce,
    fontFamily: polices.sans,
  },
  nom: {
    fontSize: tailles.titreMoyen,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
    letterSpacing: -0.4,
  },
  meta: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  archive: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
  section: {
    ...styleTitreSection,
    marginTop: espacements.m,
    marginBottom: 4,
  },
  messageCa: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
    marginTop: espacements.m,
    fontFamily: polices.sans,
  },
  blocCaLabo: {
    gap: espacements.xs,
  },
  totalLabo: {
    ...styleChiffre,
    fontSize: tailles.grand,
    color: couleurs.texte,
    marginBottom: espacements.s,
  },
  sousSectionLabo: {
    ...styleTitreSection,
    marginTop: espacements.s,
  },
  ligneLabo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordureDouce,
    gap: 4,
  },
  ligneLaboNom: {
    flex: 1,
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  ligneLaboQte: {
    width: 48,
    textAlign: 'right',
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
  },
  ligneLaboCa: {
    width: 72,
    textAlign: 'right',
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
  },
  videLabo: {
    fontSize: tailles.petit,
    color: couleurs.texte,
    paddingVertical: 4,
    fontFamily: polices.sans,
  },
  chiffres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: espacements.s,
  },
  chiffre: {
    flexGrow: 1,
    flexBasis: '40%',
    backgroundColor: couleurs.surface,
    borderRadius: rayonCarte,
    padding: espacements.m,
    gap: espacements.xs,
    minHeight: 72,
  },
  chiffreLibelle: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  chiffreValeur: {
    ...styleChiffre,
    fontSize: tailles.grand,
    color: couleurs.texte,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  datesPerso: {
    gap: espacements.m,
  },
  erreurFiltre: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
  archivage: {
    marginTop: espacements.xl,
    gap: espacements.s,
  },
  lienArchiver: {
    alignSelf: 'flex-start',
    minHeight: tailleToucheMin,
    justifyContent: 'center',
    paddingVertical: espacements.xs,
  },
  lienArchiverTexte: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
  confirmation: {
    gap: espacements.s,
    padding: espacements.m,
    borderRadius: rayonCarte,
    backgroundColor: couleurs.erreurClair,
  },
  confirmationTexte: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  erreurArchivage: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
});
