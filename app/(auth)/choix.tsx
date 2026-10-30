import { router } from 'expo-router';

import { Bouton } from '@/components/bouton';
import { Ecran } from '@/components/ecran';

export default function EcranChoix() {
  return (
    <Ecran titre="Bienvenue">
      <Bouton titre="Je crée mon entreprise (compte admin)" onPress={() => router.push('/creer-entreprise')} />
      <Bouton
        titre="J'ai un code boutique"
        variante="secondaire"
        onPress={() => router.push('/rejoindre')}
      />
    </Ecran>
  );
}
