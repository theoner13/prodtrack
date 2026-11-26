import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProductionBoutique } from '@/api/previsions';
import { couleurs, espacements, ombres, polices, rayonCarte, styleTitreSection } from '@/theme';

/** « Boutique Gare » → « Gare » pour tenir dans une colonne. */
function nomCourt(nom: string): string {
  return nom.replace(/^boutique\s+/i, '');
}

type Props = {
  /** Lignes du jour affiché. */
  lignes: ProductionBoutique[];
  /** Boutique du pâtissier : sa colonne vient en premier. */
  maBoutiqueId: string | null;
  /** Aujourd'hui : on affiche aussi ce qui est déjà produit. */
  estAujourdhui: boolean;
};

type LigneProduit = { nom: string; parBoutique: Map<string, ProductionBoutique> };

/** Tableau produits × boutiques ; une ligne s'ouvre pour le détail et la fiche produit. */
export function TableauProductionBoutiques({ lignes, maBoutiqueId, estAujourdhui }: Props) {
  const [ouvert, setOuvert] = useState<string | null>(null);

  const boutiques = new Map<string, string>();
  const parNom = new Map<string, LigneProduit>();
  for (const ligne of lignes) {
    boutiques.set(ligne.boutiqueId, ligne.boutiqueNom);
    const produit = parNom.get(ligne.nom) ?? { nom: ligne.nom, parBoutique: new Map() };
    produit.parBoutique.set(ligne.boutiqueId, ligne);
    parNom.set(ligne.nom, produit);
  }
  const colonnes = [...boutiques.entries()].sort(([a, nomA], [b, nomB]) => {
    if (a === maBoutiqueId) return -1;
    if (b === maBoutiqueId) return 1;
    return nomA.localeCompare(nomB, 'fr');
  });
  const produits = [...parNom.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  const totalColonne = (boutiqueId: string) =>
    produits.reduce((somme, p) => somme + (p.parBoutique.get(boutiqueId)?.quantite ?? 0), 0);

  return (
    <View style={[styles.tableau, ombres.douce]}>
      <View style={[styles.ligne, styles.ligneEntete]}>
        <Text style={[styles.entete, styles.colProduit]}>Produit</Text>
        {colonnes.map(([id, nom]) => (
          <Text key={id} style={[styles.entete, styles.colNombre]} numberOfLines={1}>
            {nomCourt(nom)}
          </Text>
        ))}
      </View>

      {produits.map((produit) => {
        const deplie = ouvert === produit.nom;
        return (
          <View key={produit.nom} style={styles.bloc}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: deplie }}
              accessibilityLabel={`${produit.nom} : ${colonnes
                .map(([id, nom]) => `${produit.parBoutique.get(id)?.quantite ?? 0} pour ${nom}`)
                .join(', ')}`}
              onPress={() => setOuvert(deplie ? null : produit.nom)}
              style={({ pressed }) => [styles.ligne, pressed && styles.appuye]}
            >
              <View style={[styles.colProduit, styles.nomBloc]}>
                <Text style={styles.chevron}>{deplie ? '▾' : '▸'}</Text>
                <Text style={styles.nom} numberOfLines={2}>
                  {produit.nom}
                </Text>
              </View>
              {colonnes.map(([id]) => (
                <Cellule key={id} ligne={produit.parBoutique.get(id)} estAujourdhui={estAujourdhui} />
              ))}
            </Pressable>

            {deplie ? (
              <View style={styles.detail}>
                {colonnes.map(([id, nom]) => {
                  const ligne = produit.parBoutique.get(id);
                  if (!ligne) return null;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="link"
                      accessibilityLabel={`Ouvrir la fiche de ${produit.nom}, ${nom}`}
                      onPress={() => router.push(`/produits/${ligne.produitId}` as Href)}
                      style={({ pressed }) => [styles.detailLigne, pressed && styles.appuye]}
                    >
                      <View style={styles.detailTexte}>
                        <Text style={styles.detailBoutique}>{nom}</Text>
                        <Text style={styles.detailInfo}>
                          {ligne.quantite} à produire
                          {estAujourdhui ? ` · ${ligne.dejaProduit} déjà produit${ligne.dejaProduit > 1 ? 's' : ''}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.lien}>Fiche ›</Text>
                    </Pressable>
                  );
                })}
                <Text style={styles.repere}>Moyenne vendue les 4 derniers mêmes jours de semaine.</Text>
              </View>
            ) : null}
          </View>
        );
      })}

      <View style={[styles.ligne, styles.ligneTotal]}>
        <Text style={[styles.total, styles.colProduit]}>Total</Text>
        {colonnes.map(([id]) => (
          <Text key={id} style={[styles.total, styles.colNombre]}>
            {totalColonne(id)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Cellule({
  ligne,
  estAujourdhui,
}: {
  ligne: ProductionBoutique | undefined;
  estAujourdhui: boolean;
}) {
  if (!ligne) return <Text style={[styles.cellule, styles.colNombre, styles.vide]}>—</Text>;
  if (!estAujourdhui) {
    return <Text style={[styles.cellule, styles.colNombre]}>{ligne.quantite}</Text>;
  }
  const fait = ligne.dejaProduit >= ligne.quantite;
  return (
    <Text style={[styles.cellule, styles.colNombre, fait && styles.fait]}>
      {fait ? `✓ ${ligne.dejaProduit}` : `${ligne.dejaProduit}/${ligne.quantite}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  tableau: {
    backgroundColor: couleurs.surface,
    borderRadius: rayonCarte,
    paddingVertical: espacements.s,
    overflow: 'hidden',
  },
  bloc: {
    borderTopWidth: 1,
    borderTopColor: couleurs.bordureDouce,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    paddingHorizontal: espacements.m,
    minHeight: 48,
  },
  ligneEntete: {
    minHeight: 32,
  },
  ligneTotal: {
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    minHeight: 40,
  },
  colProduit: {
    flex: 2,
  },
  colNombre: {
    flex: 1,
    textAlign: 'right',
  },
  entete: {
    ...styleTitreSection,
    fontSize: 11,
  },
  nomBloc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevron: {
    fontSize: 12,
    color: couleurs.texteMuet,
    width: 12,
  },
  nom: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  cellule: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
  },
  vide: {
    color: couleurs.texteMuet,
    fontWeight: '400',
  },
  fait: {
    color: couleurs.succes,
  },
  total: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
    fontVariant: ['tabular-nums'],
  },
  detail: {
    backgroundColor: couleurs.fondGroupe,
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.s,
    gap: 2,
  },
  detailLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: espacements.s,
  },
  detailTexte: {
    flex: 1,
  },
  detailBoutique: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
    fontFamily: polices.sans,
  },
  detailInfo: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  lien: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.accentFonce,
    fontFamily: polices.sans,
  },
  repere: {
    fontSize: 12,
    color: couleurs.texteMuet,
    marginTop: 2,
    fontFamily: polices.sans,
  },
  appuye: {
    opacity: 0.85,
  },
});
