import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useEmployes } from '@/api/employes';
import { useUrlsSignees } from '@/api/photos';
import { messageErreur } from '@/auth/erreurs';
import { CarteProduit } from '@/components/carte-produit';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { couleurs, espacements, polices, styleTitreSection, tailles } from '@/theme';
import type { Profil } from '@/types/database';

function description(employe: Profil): string {
  const role =
    employe.role === 'admin'
      ? 'Admin'
      : employe.role === 'patissier'
        ? 'Pâtissier'
        : employe.role === 'laboratoire'
          ? 'Laboratoire'
          : 'Vente';
  const equipe = employe.equipe === 'jour' ? 'Jour' : employe.equipe === 'nuit' ? 'Nuit' : null;
  const archive = employe.archive_le ? 'Archivé' : null;
  return [role, equipe, archive].filter((partie) => partie !== null).join(' · ');
}

export default function EcranEmployes() {
  const [avecArchives, setAvecArchives] = useState(false);
  const boutiques = useBoutiques();
  const employes = useEmployes(avecArchives);
  const chemins = useMemo(
    () =>
      (employes.data ?? [])
        .map((employe) => employe.photo_url)
        .filter((chemin): chemin is string => Boolean(chemin)),
    [employes.data],
  );
  const photos = useUrlsSignees(chemins);

  function reessayer() {
    void boutiques.refetch();
    void employes.refetch();
  }

  const chargement = boutiques.isLoading || employes.isLoading;
  const erreurChargement = boutiques.error ?? employes.error;

  return (
    <Ecran defilement>
      <View style={styles.entete}>
        <Pressable
          onPress={() => setAvecArchives((valeur) => !valeur)}
          style={styles.lien}
          accessibilityRole="button"
          accessibilityLabel={
            avecArchives ? 'Masquer les comptes archivés' : 'Afficher les comptes archivés'
          }
        >
          <Text style={styles.lienTexte}>
            {avecArchives ? 'Masquer les comptes archivés' : 'Afficher les comptes archivés'}
          </Text>
        </Pressable>
      </View>
      {chargement ? <EtatChargement /> : null}
      {erreurChargement ? (
        <EtatErreur message={messageErreur(erreurChargement)} onReessayer={reessayer} />
      ) : null}
      {!chargement && !erreurChargement && boutiques.data?.length === 0 ? (
        <EtatVide message="Créez d’abord une boutique, puis partagez son code pour inviter des employés." />
      ) : null}
      {boutiques.data?.map((boutique) => {
        const liste = (employes.data ?? []).filter((employe) => employe.boutique_id === boutique.id);
        return (
          <View key={boutique.id} style={styles.section}>
            <Text style={styles.titreSection}>{boutique.nom}</Text>
            {liste.length === 0 ? (
              <Text style={styles.vide}>
                Aucun employé. Partagez le code de la boutique pour inviter un pâtissier ou un compte vente.
              </Text>
            ) : (
              liste.map((employe) => (
                <Pressable
                  key={employe.id}
                  onPress={() =>
                    router.push({ pathname: '/employes/[id]', params: { id: employe.id } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir la fiche de ${employe.prenom} ${employe.nom}`}
                >
                  <CarteProduit
                    nom={`${employe.prenom} ${employe.nom}`}
                    photoUrl={
                      employe.photo_url
                        ? (photos.data?.[employe.photo_url] ?? undefined)
                        : undefined
                    }
                    sousTitre={description(employe)}
                  />
                </Pressable>
              ))
            )}
          </View>
        );
      })}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  lien: {
    paddingVertical: espacements.xs,
  },
  lienTexte: {
    fontSize: tailles.petit,
    fontWeight: '500',
    color: couleurs.principal,
    fontFamily: polices.sans,
  },
  section: {
    gap: espacements.s,
  },
  titreSection: {
    ...styleTitreSection,
    marginTop: espacements.s,
  },
  vide: {
    fontSize: tailles.normal,
    color: couleurs.texteSecondaire,
  },
});
