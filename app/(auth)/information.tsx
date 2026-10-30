import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { EcranAuth } from '@/components/ecran-auth';
import { supabase } from '@/lib/supabase';
import { couleurs, tailles } from '@/theme';

export default function EcranInformation() {
  const { session, rechargerProfil } = useAuth();
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function accepter() {
    if (!supabase || !session) return;
    setChargement(true);
    setErreur(null);
    const { error } = await supabase
      .from('profils')
      .update({ information_rgpd_acceptee_le: new Date().toISOString() })
      .eq('id', session.user.id);
    if (error) {
      setErreur(messageErreur(error));
      setChargement(false);
      return;
    }
    await rechargerProfil();
    setChargement(false);
  }

  return (
    <EcranAuth titre="Information" largeurMax={600} centrerVerticalement={false} avecLogo={false}>
      <Text style={styles.texte}>
        ProdTrack suit le travail de chaque employé pour organiser la production et calculer le
        chiffre d’affaires.
      </Text>
      <Text style={styles.texte}>
        Données collectées : nom, prénom, email, rôle, boutique, équipe (jour ou nuit), photo
        facultative, quantités produites ou sorties, et le chiffre d’affaires des produits que vous
        fabriquez.
      </Text>
      <Text style={styles.texte}>
        L’admin voit le chiffre d’affaires de chaque employé, par produit et par jour. L’équipe
        vente voit les saisies de sa boutique. Un pâtissier ne voit que son propre chiffre
        d’affaires.
      </Text>
      <Text style={styles.texte}>
        Ces données sont conservées tant que le compte existe. Si le compte est archivé, l’historique
        de production et de chiffre d’affaires est conservé.
      </Text>
      <Text style={styles.texte}>
        Vous pouvez demander l’accès à vos données et leur rectification. Le contact est l’admin
        de votre entreprise.
      </Text>
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
      <Bouton titre="J'ai lu et compris" chargement={chargement} onPress={accepter} />
    </EcranAuth>
  );
}

const styles = StyleSheet.create({
  texte: {
    fontSize: tailles.normal,
    color: couleurs.texte,
    lineHeight: 26,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
});
