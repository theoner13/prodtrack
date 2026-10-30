import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBoutiques } from '@/api/boutiques';
import { useChangerArchivage, useEmployes } from '@/api/employes';
import { useUrlsSignees } from '@/api/photos';
import { useAuth } from '@/auth/AuthProvider';
import { messageErreur } from '@/auth/erreurs';
import { Bouton } from '@/components/bouton';
import { CarteProduit } from '@/components/carte-produit';
import { Ecran } from '@/components/ecran';
import { EtatChargement, EtatErreur, EtatVide } from '@/components/etats';
import { couleurs, espacements, styleTitreSection, tailles } from '@/theme';
import type { Profil } from '@/types/database';

function description(employe: Profil): string {
  const role =
    employe.role === 'admin' ? 'Admin' : employe.role === 'patissier' ? 'Pâtissier' : 'Vente';
  const equipe = employe.equipe === 'jour' ? 'Jour' : employe.equipe === 'nuit' ? 'Nuit' : null;
  const archive = employe.archive_le ? 'Archivé' : null;
  return [role, equipe, archive].filter((partie) => partie !== null).join(' · ');
}

export default function EcranEmployes() {
  const { profil } = useAuth();
  const [avecArchives, setAvecArchives] = useState(false);
  const [confirmation, setConfirmation] = useState<{ id: string; archiver: boolean } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const boutiques = useBoutiques();
  const employes = useEmployes(avecArchives);
  const archivage = useChangerArchivage();
  const chemins = useMemo(
    () =>
      (employes.data ?? [])
        .map((employe) => employe.photo_url)
        .filter((chemin): chemin is string => Boolean(chemin)),
    [employes.data],
  );
  const photos = useUrlsSignees(chemins);

  async function confirmer() {
    if (!confirmation) return;
    setErreur(null);
    try {
      await archivage.mutateAsync(confirmation);
      setConfirmation(null);
    } catch (probleme: unknown) {
      setErreur(messageErreur(probleme));
    }
  }

  function reessayer() {
    void boutiques.refetch();
    void employes.refetch();
  }

  const chargement = boutiques.isLoading || employes.isLoading;
  const erreurChargement = boutiques.error ?? employes.error;

  return (
    <Ecran titre="Employés" defilement>
      <Bouton
        titre={avecArchives ? 'Masquer les comptes archivés' : 'Afficher les comptes archivés'}
        variante="secondaire"
        onPress={() => setAvecArchives((valeur) => !valeur)}
      />
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
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
                <View key={employe.id} style={styles.bloc}>
                  <Pressable
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
                  {employe.id === profil?.id ? null : confirmation?.id === employe.id ? (
                    <View style={styles.confirmation}>
                      <Text style={styles.texte}>
                        {confirmation.archiver
                          ? 'Archiver ce compte ? L’historique de production et de chiffre d’affaires est conservé. La personne ne pourra plus se connecter.'
                          : 'Réactiver ce compte ? La personne pourra à nouveau se connecter.'}
                      </Text>
                      <Bouton
                        titre={confirmation.archiver ? 'Archiver ce compte' : 'Réactiver ce compte'}
                        variante={confirmation.archiver ? 'danger' : 'principal'}
                        chargement={archivage.isPending}
                        onPress={() => void confirmer()}
                      />
                      <Bouton
                        titre="Annuler"
                        variante="secondaire"
                        onPress={() => setConfirmation(null)}
                      />
                    </View>
                  ) : (
                    <Bouton
                      titre={employe.archive_le ? 'Réactiver ce compte' : 'Archiver ce compte'}
                      variante={employe.archive_le ? 'secondaire' : 'danger'}
                      onPress={() =>
                        setConfirmation({ id: employe.id, archiver: employe.archive_le === null })
                      }
                    />
                  )}
                </View>
              ))
            )}
          </View>
        );
      })}
    </Ecran>
  );
}

const styles = StyleSheet.create({
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
  bloc: {
    gap: espacements.s,
  },
  confirmation: {
    gap: espacements.s,
    padding: espacements.m,
    borderRadius: 10,
    backgroundColor: couleurs.erreurClair,
  },
  texte: {
    fontSize: tailles.normal,
    color: couleurs.texte,
  },
  erreur: {
    fontSize: tailles.normal,
    color: couleurs.erreur,
  },
});
