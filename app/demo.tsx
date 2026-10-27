// Écran temporaire de démonstration des composants (à supprimer en phase 12).
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banniere } from '@/components/banniere';
import { Bouton } from '@/components/bouton';
import { CarteProduit } from '@/components/carte-produit';
import { Champ } from '@/components/champ';
import { Compteur } from '@/components/compteur';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import {
  aujourdhuiParis,
  debutMois,
  debutSemaine,
  formatDate,
  formatEuros,
  formatJourComplet,
} from '@/lib/format';
import { couleurs, tailles } from '@/theme';

export default function Demo() {
  const [quantite, setQuantite] = useState(7);
  const [nom, setNom] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const fermer = useCallback(() => setMessage(null), []);
  const auj = aujourdhuiParis();

  return (
    <Ecran titre="Démo des composants" defilement>
      <Banniere message={message} onFermer={fermer} />

      <Text style={styles.section}>Boutons</Text>
      <Bouton titre="Enregistrer" onPress={() => setMessage('50 muffins ajoutés. Stock : 57')} />
      <Bouton titre="Annuler" variante="secondaire" onPress={() => setMessage('Annulé')} />
      <Bouton titre="Archiver ce compte" variante="danger" onPress={() => setMessage('Compte archivé')} />
      <Bouton titre="Chargement" chargement onPress={() => {}} />
      <Bouton titre="Désactivé" desactive onPress={() => {}} />

      <Text style={styles.section}>Champ</Text>
      <Champ libelle="Nom du produit" value={nom} onChangeText={setNom} placeholder="Ex. Muffin" />
      <Champ libelle="Prix (€)" value="abc" erreur="Le prix doit être un nombre" />

      <Text style={styles.section}>Compteur</Text>
      <Compteur valeur={quantite} onChange={setQuantite} libelle="Muffins" />
      <Text style={styles.texte}>Valeur : {quantite}</Text>

      <Text style={styles.section}>Carte produit</Text>
      <CarteProduit nom="Muffin" prixCentimes={300} sousTitre="Stock : 57">
        <Compteur valeur={quantite} onChange={setQuantite} libelle="Muffins" />
      </CarteProduit>
      <CarteProduit nom="Pain au chocolat" prixCentimes={120} sousTitre="Fabricant : Pâtissier B" />

      <Text style={styles.section}>États</Text>
      <View style={styles.cadre}>
        <EtatChargement />
      </View>
      <View style={styles.cadre}>
        <EtatErreur onReessayer={() => setMessage('Nouvel essai…')} />
      </View>
      <View style={styles.cadre}>
        <EtatVide message="Aucun produit pour l'instant." />
      </View>

      <Text style={styles.section}>Formats</Text>
      <Text style={styles.texte}>formatEuros(1250) → {formatEuros(1250)}</Text>
      <Text style={styles.texte}>aujourdhuiParis() → {auj}</Text>
      <Text style={styles.texte}>formatDate → {formatDate(auj)}</Text>
      <Text style={styles.texte}>formatJourComplet → {formatJourComplet(auj)}</Text>
      <Text style={styles.texte}>debutSemaine → {debutSemaine(auj)}</Text>
      <Text style={styles.texte}>debutMois → {debutMois(auj)}</Text>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: tailles.grand,
    fontWeight: '700',
    color: couleurs.principalFonce,
    marginTop: 8,
  },
  texte: {
    fontSize: tailles.petit,
    color: couleurs.texte,
  },
  cadre: {
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: 12,
  },
});
