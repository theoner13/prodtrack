import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { couleurs, espacements, hauteurBouton, rayon, tailles } from '@/theme';

export const UNITES = ['g', 'kg', 'ml', 'l', 'pièce', 'cuillère'] as const;
export type Unite = (typeof UNITES)[number];

export type LigneSaisie = {
  ingredient: string;
  quantite: string; // texte saisi, ex. "0,5"
  unite: Unite;
};

export const ligneVide = (): LigneSaisie => ({ ingredient: '', quantite: '', unite: 'g' });

export function estVide(ligne: LigneSaisie): boolean {
  return ligne.ingredient.trim() === '' && ligne.quantite.trim() === '';
}

type Props = {
  lignes: LigneSaisie[];
  onChange: (lignes: LigneSaisie[]) => void;
  erreurs?: (string | undefined)[]; // une erreur par ligne
};

// Recette compacte : une ligne par ingrédient (nom, quantité, unité, retirer).
// Une ligne vide est toujours gardée à la fin : on tape, la suivante apparaît.
export function EditeurRecette({ lignes, onChange, erreurs = [] }: Props) {
  const [uniteOuverte, setUniteOuverte] = useState<number | null>(null);
  const champsNom = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);
  const champsQuantite = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);

  // Toujours une ligne vide en dernier.
  const affichees = lignes.length === 0 || !estVide(lignes[lignes.length - 1]) ? [...lignes, ligneVide()] : lignes;

  function modifier(index: number, champ: Partial<LigneSaisie>) {
    const copie = affichees.map((ligne, i) => (i === index ? { ...ligne, ...champ } : ligne));
    onChange(copie);
  }

  function retirer(index: number) {
    setUniteOuverte(null);
    onChange(affichees.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.bloc}>
      <View style={styles.entete}>
        <Text style={[styles.titreColonne, styles.colNom]}>Ingrédient</Text>
        <Text style={[styles.titreColonne, styles.colQuantite]}>Qté</Text>
        <Text style={[styles.titreColonne, styles.colUnite]}>Unité</Text>
        <View style={styles.colRetirer} />
      </View>

      {affichees.map((ligne, index) => {
        const derniere = index === affichees.length - 1;
        const erreur = derniere ? undefined : erreurs[index];
        return (
          <View key={index} style={styles.ligneBloc}>
            <View style={styles.ligne}>
              <TextInput
                ref={(champ) => {
                  champsNom.current[index] = champ;
                }}
                accessibilityLabel={`Ingrédient ${index + 1}`}
                placeholder={derniere ? (index === 0 ? 'Ex. Farine' : '+ Ingrédient') : undefined}
                placeholderTextColor={couleurs.texteSecondaire}
                value={ligne.ingredient}
                onChangeText={(ingredient) => modifier(index, { ingredient })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => champsQuantite.current[index]?.focus()}
                style={[styles.champ, styles.colNom, erreur ? styles.champErreur : null]}
              />
              <TextInput
                ref={(champ) => {
                  champsQuantite.current[index] = champ;
                }}
                accessibilityLabel={`Quantité ${index + 1}`}
                keyboardType="decimal-pad"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => champsNom.current[index + 1]?.focus()}
                value={ligne.quantite}
                onChangeText={(quantite) => modifier(index, { quantite })}
                style={[styles.champ, styles.colQuantite, styles.centre, erreur ? styles.champErreur : null]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Unité ${index + 1} : ${ligne.unite}`}
                onPress={() => setUniteOuverte(uniteOuverte === index ? null : index)}
                style={[styles.champ, styles.colUnite, styles.unite]}
              >
                <Text style={styles.texteUnite} numberOfLines={1}>
                  {ligne.unite} ▾
                </Text>
              </Pressable>
              {derniere ? (
                <View style={styles.colRetirer} />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Retirer ${ligne.ingredient || 'cette ligne'}`}
                  onPress={() => retirer(index)}
                  hitSlop={8}
                  style={[styles.colRetirer, styles.retirer]}
                >
                  <Text style={styles.croix}>✕</Text>
                </Pressable>
              )}
            </View>

            {uniteOuverte === index ? (
              <View style={styles.choixUnites}>
                {UNITES.map((unite) => (
                  <Pressable
                    key={unite}
                    accessibilityRole="button"
                    onPress={() => {
                      modifier(index, { unite });
                      setUniteOuverte(null);
                    }}
                    style={[styles.puce, unite === ligne.unite && styles.puceChoisie]}
                  >
                    <Text style={[styles.textePuce, unite === ligne.unite && styles.textePuceChoisie]}>
                      {unite}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: {
    gap: espacements.s,
  },
  entete: {
    flexDirection: 'row',
    gap: espacements.s,
  },
  titreColonne: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  ligneBloc: {
    gap: espacements.xs,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
  },
  colNom: {
    flex: 1,
    minWidth: 0,
  },
  colQuantite: {
    width: 68,
  },
  colUnite: {
    width: 76,
  },
  colRetirer: {
    width: 32,
  },
  champ: {
    height: hauteurBouton,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espacements.s,
    fontSize: tailles.petit,
    color: couleurs.texte,
    backgroundColor: couleurs.surface,
  },
  champErreur: {
    borderColor: couleurs.erreur,
    borderWidth: 2,
  },
  centre: {
    textAlign: 'center',
  },
  unite: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.principalClair,
  },
  texteUnite: {
    fontSize: tailles.petit,
    fontWeight: '600',
    color: couleurs.principalFonce,
  },
  retirer: {
    height: hauteurBouton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  croix: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
    fontWeight: '700',
  },
  choixUnites: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
  },
  puce: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: espacements.m,
    borderRadius: rayon,
    borderWidth: 1,
    borderColor: couleurs.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puceChoisie: {
    backgroundColor: couleurs.principal,
  },
  textePuce: {
    fontSize: tailles.petit,
    color: couleurs.principalFonce,
  },
  textePuceChoisie: {
    color: couleurs.texteSurPrincipal,
    fontWeight: '700',
  },
  erreur: {
    fontSize: tailles.petit,
    color: couleurs.erreur,
  },
});
