import { router } from 'expo-router';

import { Bouton } from '@/components/bouton';
import { EcranAuth } from '@/components/ecran-auth';

export default function EcranChoix() {
  return (
    <EcranAuth titre="Bienvenue">
      <Bouton titre="Je crée mon entreprise (compte admin)" onPress={() => router.push('/creer-entreprise')} />
      <Bouton
        titre="J'ai un code boutique"
        variante="secondaire"
        onPress={() => router.push('/rejoindre')}
      />
    </EcranAuth>
  );
}
