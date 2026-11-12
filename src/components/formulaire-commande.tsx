import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { Compteur } from '@/components/compteur';
import { VenteSection } from '@/components/vente-section';
import {
  creneauxHeure,
  pucesJoursRetrait,
  resteAPayerCentimes,
  validerCommande,
  type ErreursCommande,
  type SaisieCommande,
} from '@/lib/commandes';
import { eurosVersCentimes, formatEuros } from '@/lib/format';
import {
  couleurs,
  espacements,
  ombres,
  polices,
  rayonCarte,
  rayonPuce,
  styleChiffre,
  styleTitreSection,
  tailleToucheMin,
  tailles,
} from '@/theme';

type BoutiqueOption = { id: string; nom: string };

type Props = {
  initial: SaisieCommande;
  boutiques: BoutiqueOption[];
  onEnregistrer: (saisie: SaisieCommande) => Promise<void>;
  titreBouton?: string;
  chargement?: boolean;
  /** Si true, le bouton n'est pas rendu (le parent l'affiche dans le pied d'écran). */
  masquerBouton?: boolean;
};

export type FormulaireCommandeHandle = {
  soumettre: () => void;
};

export const FormulaireCommande = forwardRef<FormulaireCommandeHandle, Props>(
  function FormulaireCommande(
    {
      initial,
      boutiques,
      onEnregistrer,
      titreBouton = 'Enregistrer la commande',
      chargement = false,
      masquerBouton = false,
    },
    ref,
  ) {
    const [saisie, setSaisie] = useState<SaisieCommande>(initial);
    const [erreurs, setErreurs] = useState<ErreursCommande>({});
    const jours = useMemo(() => pucesJoursRetrait(), []);
    const heures = useMemo(() => creneauxHeure(), []);
    const friseHeuresRef = useRef<ComponentRef<typeof ScrollView>>(null);
    const largeursHeures = useRef<Record<string, number>>({});
    const [largeurFriseHeures, setLargeurFriseHeures] = useState(0);
    const aScrolleHeure = useRef(false);

    const prixCentimes = saisie.prixEuros.trim()
      ? eurosVersCentimes(saisie.prixEuros)
      : null;
    const acompteCentimes = saisie.acompteEuros.trim()
      ? eurosVersCentimes(saisie.acompteEuros)
      : null;
    const reste =
      prixCentimes != null ? resteAPayerCentimes(prixCentimes, acompteCentimes) : null;

    const nomBoutiqueFab =
      boutiques.find((b) => b.id === saisie.boutiqueFabricationId)?.nom ?? '';
    const libelleJour =
      jours.find((j) => j.jour === saisie.jourRetrait)?.libelle ?? saisie.jourRetrait;

    const ligneRecap = [saisie.clientNom.trim(), saisie.gateau.trim()]
      .filter(Boolean)
      .join(' · ');

    function maj<K extends keyof SaisieCommande>(cle: K, valeur: SaisieCommande[K]) {
      setSaisie((prev) => ({ ...prev, [cle]: valeur }));
    }

    async function soumettre() {
      const resultat = validerCommande(saisie);
      if (!resultat.ok) {
        setErreurs(resultat.erreurs);
        return;
      }
      setErreurs({});
      await onEnregistrer(saisie);
    }

    useImperativeHandle(ref, () => ({
      soumettre: () => {
        void soumettre();
      },
    }));

    function memoriserLargeurHeure(heure: string, e: LayoutChangeEvent) {
      largeursHeures.current[heure] = e.nativeEvent.layout.width;
      faireDefilerVersHeureActive();
    }

    function onLayoutFriseHeures(e: LayoutChangeEvent) {
      setLargeurFriseHeures(e.nativeEvent.layout.width);
    }

    function faireDefilerVersHeureActive() {
      if (aScrolleHeure.current || largeurFriseHeures <= 0) return;
      const index = heures.indexOf(saisie.heureRetrait);
      if (index < 0) return;
      let offset = 0;
      for (let i = 0; i < index; i++) {
        const h = heures[i];
        const w = h ? largeursHeures.current[h] : undefined;
        if (w == null) return;
        offset += w + espacements.s;
      }
      const largeurActive = largeursHeures.current[saisie.heureRetrait];
      if (largeurActive == null) return;
      const x = Math.max(0, offset - (largeurFriseHeures - largeurActive) / 2);
      friseHeuresRef.current?.scrollTo({ x, animated: false });
      aScrolleHeure.current = true;
    }

    useEffect(() => {
      aScrolleHeure.current = false;
      faireDefilerVersHeureActive();
    }, [largeurFriseHeures, saisie.heureRetrait, heures]);

    return (
      <View style={styles.form}>
        <VenteSection>
          <Champ
            libelle="Nom du client"
            value={saisie.clientNom}
            onChangeText={(t) => maj('clientNom', t)}
            erreur={erreurs.clientNom}
            autoCapitalize="words"
          />
          <Champ
            libelle="Téléphone"
            value={saisie.clientTelephone}
            onChangeText={(t) => maj('clientTelephone', t)}
            erreur={erreurs.clientTelephone}
            keyboardType="phone-pad"
          />
          <Champ
            libelle="Email (facultatif)"
            value={saisie.clientEmail}
            onChangeText={(t) => maj('clientEmail', t)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </VenteSection>

        <VenteSection>
          <Champ
            libelle="Gâteau"
            value={saisie.gateau}
            onChangeText={(t) => maj('gateau', t)}
            erreur={erreurs.gateau}
            placeholder="Ex. Fraisier"
          />
          <Text style={styles.label}>Nombre de parts</Text>
          <Compteur
            valeur={saisie.nbParts}
            onChange={(n) => maj('nbParts', n)}
            libelle="Nombre de parts"
          />
          {erreurs.nbParts ? <Text style={styles.erreur}>{erreurs.nbParts}</Text> : null}
          <Champ
            libelle="Demandes spécifiques (facultatif)"
            value={saisie.demandes}
            onChangeText={(t) => maj('demandes', t)}
            placeholder="Ex. sans gluten, décor fraises"
            multiline
          />
          <Champ
            libelle="Inscription / nom d'anniversaire"
            value={saisie.inscription}
            onChangeText={(t) => maj('inscription', t)}
            placeholder="Ex. Joyeux anniversaire Léa"
          />
        </VenteSection>

        <VenteSection titre="Boutique qui fabrique">
          {erreurs.boutiqueFabricationId ? (
            <Text style={styles.erreur}>{erreurs.boutiqueFabricationId}</Text>
          ) : null}
          <PucesBoutique
            boutiques={boutiques}
            valeur={saisie.boutiqueFabricationId}
            onChange={(id) => maj('boutiqueFabricationId', id)}
          />

          <Text style={styles.sectionInterne}>Retrait — jour</Text>
          {erreurs.jourRetrait ? <Text style={styles.erreur}>{erreurs.jourRetrait}</Text> : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.frise}
            contentContainerStyle={styles.puces}
          >
            {jours.map((j) => {
              const actif = saisie.jourRetrait === j.jour;
              return (
                <Pressable
                  key={j.jour}
                  onPress={() => maj('jourRetrait', j.jour)}
                  style={[styles.puce, actif && styles.puceActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: actif }}
                >
                  <Text style={[styles.puceTexte, actif && styles.puceTexteActive]}>
                    {j.libelle}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionInterne}>Retrait — heure</Text>
          <ScrollView
            ref={friseHeuresRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.frise}
            contentContainerStyle={styles.puces}
            onLayout={onLayoutFriseHeures}
          >
            {heures.map((h) => {
              const actif = saisie.heureRetrait === h;
              return (
                <Pressable
                  key={h}
                  onPress={() => maj('heureRetrait', h)}
                  onLayout={(e) => memoriserLargeurHeure(h, e)}
                  style={[styles.puce, actif && styles.puceActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: actif }}
                >
                  <Text style={[styles.puceTexte, actif && styles.puceTexteActive]}>{h}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </VenteSection>

        <VenteSection>
          <Champ
            libelle="Prix total (facultatif)"
            value={saisie.prixEuros}
            onChangeText={(t) => maj('prixEuros', t)}
            erreur={erreurs.prixEuros}
            placeholder="35,00"
            keyboardType="decimal-pad"
          />
          <Champ
            libelle="Acompte versé (facultatif)"
            value={saisie.acompteEuros}
            onChangeText={(t) => maj('acompteEuros', t)}
            erreur={erreurs.acompteEuros}
            placeholder="10,00"
            keyboardType="decimal-pad"
          />
          {reste != null ? (
            <Text style={styles.reste}>Reste à payer : {formatEuros(reste)}</Text>
          ) : null}
        </VenteSection>

        <View style={[styles.recap, ombres.douce]}>
          {ligneRecap ? <Text style={styles.recapLigne}>{ligneRecap}</Text> : null}
          <View style={styles.recapLignes}>
            <View style={styles.recapRang}>
              <Text style={styles.recapLibelle}>Nombre de parts</Text>
              <Text style={styles.recapValeur}>{saisie.nbParts}</Text>
            </View>
            {nomBoutiqueFab ? (
              <View style={styles.recapRang}>
                <Text style={styles.recapValeur}>{nomBoutiqueFab}</Text>
              </View>
            ) : null}
            <View style={styles.recapRang}>
              <Text style={styles.recapValeur}>
                {libelleJour} · {saisie.heureRetrait}
              </Text>
            </View>
            {reste != null ? (
              <View style={styles.recapRang}>
                <Text style={styles.recapLibelle}>Reste à payer</Text>
                <Text style={styles.recapValeur}>{formatEuros(reste)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {!masquerBouton ? (
          <Bouton
            titre={titreBouton}
            onPress={() => void soumettre()}
            chargement={chargement}
            pleineLargeur
          />
        ) : null}
      </View>
    );
  },
);

function PucesBoutique({
  boutiques,
  valeur,
  onChange,
}: {
  boutiques: BoutiqueOption[];
  valeur: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.pucesWrap}>
      {boutiques.map((b) => {
        const actif = valeur === b.id;
        return (
          <Pressable
            key={b.id}
            onPress={() => onChange(b.id)}
            style={[styles.puce, actif && styles.puceActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: actif }}
          >
            <Text style={[styles.puceTexte, actif && styles.puceTexteActive]}>{b.nom}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
    paddingBottom: espacements.xxl,
  },
  label: {
    fontSize: tailles.legend,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  sectionInterne: {
    ...styleTitreSection,
    marginTop: espacements.xs,
    fontFamily: polices.sans,
  },
  frise: {
    backgroundColor: couleurs.fondSegment,
    borderRadius: rayonCarte,
    overflow: 'hidden',
  },
  puces: {
    flexDirection: 'row',
    gap: espacements.s,
    paddingVertical: espacements.s,
    paddingHorizontal: espacements.s,
  },
  pucesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  puce: {
    minHeight: tailleToucheMin,
    paddingHorizontal: 16,
    borderRadius: rayonPuce,
    backgroundColor: couleurs.fondPuce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puceActive: {
    backgroundColor: couleurs.principal,
  },
  puceTexte: {
    fontSize: tailles.petit,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  puceTexteActive: {
    color: couleurs.texteSurPrincipal,
    fontWeight: '600',
    fontFamily: polices.sans,
  },
  reste: {
    ...styleChiffre,
    fontSize: tailles.normal,
    fontFamily: polices.sans,
  },
  recap: {
    backgroundColor: couleurs.surface,
    borderRadius: rayonCarte,
    padding: espacements.m,
    gap: espacements.s,
  },
  recapLigne: {
    fontSize: tailles.grand,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
    letterSpacing: -0.3,
  },
  recapLignes: {
    gap: espacements.xs,
  },
  recapRang: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacements.s,
  },
  recapLibelle: {
    fontSize: tailles.petit,
    color: couleurs.texteMuet,
    fontFamily: polices.sans,
  },
  recapValeur: {
    flex: 1,
    fontSize: tailles.petit,
    color: couleurs.texte,
    fontFamily: polices.sans,
    textAlign: 'right',
  },
  erreur: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
});
