import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { couleurs } from '@/theme';

type NomIcone = ComponentProps<typeof Ionicons>['name'];

type Props = {
  nom: NomIcone;
  nomActif?: NomIcone;
  focused: boolean;
  /** Couleur forcée (ex. barre d'onglets). */
  color?: string;
};

/** Icône d'onglet : blanche sur pastille espresso active, discrète sinon. */
export function OngletIcone({ nom, nomActif, focused, color }: Props) {
  return (
    <Ionicons
      name={focused && nomActif ? nomActif : nom}
      size={20}
      color={
        color ??
        (focused ? couleurs.texteSurPrincipal : couleurs.ongletInactif)
      }
    />
  );
}
