import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { Champ } from '@/components/champ';
import { Compteur } from '@/components/compteur';
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
  polices,
  rayonPuce,
  styleTitreSection,
  tailles,
} from '@/theme';

type BoutiqueOption = { id: string; nom: string };

type Props = {
  initial: SaisieCommande;
  boutiques: BoutiqueOption[];
  onEnregistrer: (saisie: SaisieCommande) => Promise<void>;
  titreBouton?: string;
  chargement?: boolean;
};

export function FormulaireCommande({
  initial,
  boutiques,
  onEnregistrer,
  titreBouton = 'Enregistrer la commande',
  chargement = false,
}: Props) {
  const [saisie, setSaisie] = useState<SaisieCommande>(initial);
  const [erreurs, setErreurs] = useState<ErreursCommande>({});
  const jours = useMemo(() => pucesJoursRetrait(), []);
  const heures = useMemo(() => creneauxHeure(), []);

  const prixCentimes = saisie.prixEuros.trim()
    ? eurosVersCentimes(saisie.prixEuros)
    : null;
  const acompteCentimes = saisie.acompteEuros.trim()
    ? eurosVersCentimes(saisie.acompteEuros)
    : null;
  const reste =
    prixCentimes != null ? resteAPayerCentimes(prixCentimes, acompteCentimes) : null;

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

  return (
    <View style={styles.form}>
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

      <Text style={styles.section}>Boutique qui fabrique</Text>
      {erreurs.boutiqueFabricationId ? (
        <Text style={styles.erreur}>{erreurs.boutiqueFabricationId}</Text>
      ) : null}
      <PucesBoutique
        boutiques={boutiques}
        valeur={saisie.boutiqueFabricationId}
        onChange={(id) => maj('boutiqueFabricationId', id)}
      />

      <Text style={styles.section}>Retrait — jour</Text>
      {erreurs.jourRetrait ? <Text style={styles.erreur}>{erreurs.jourRetrait}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.puces}>
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
              <Text style={[styles.puceTexte, actif && styles.puceTexteActive]}>{j.libelle}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.section}>Retrait — heure</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.puces}>
        {heures.map((h) => {
          const actif = saisie.heureRetrait === h;
          return (
            <Pressable
              key={h}
              onPress={() => maj('heureRetrait', h)}
              style={[styles.puce, actif && styles.puceActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: actif }}
            >
              <Text style={[styles.puceTexte, actif && styles.puceTexteActive]}>{h}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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

      <Bouton
        titre={titreBouton}
        onPress={() => void soumettre()}
        chargement={chargement}
        pleineLargeur
      />
    </View>
  );
}

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
    gap: espacements.m,
    paddingBottom: espacements.xxl,
  },
  label: {
    fontSize: tailles.legend,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  section: {
    ...styleTitreSection,
    marginTop: espacements.s,
  },
  puces: {
    flexDirection: 'row',
    gap: espacements.s,
    paddingVertical: 2,
  },
  pucesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  puce: {
    minHeight: 40,
    paddingHorizontal: 14,
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
    fontWeight: '500',
  },
  reste: {
    fontSize: tailles.normal,
    fontWeight: '500',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  erreur: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
    fontFamily: polices.sans,
  },
});
