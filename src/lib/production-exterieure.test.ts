import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  avecPrefixeFabricant,
  estProduitExterieur,
  etiquetteBoutique,
  etiquetteProvenanceAdmin,
  grouperParBoutiqueDestinataire,
  sousTitreExterieurFrais,
  sousTitreExterieurSurgele,
} from './production-exterieure.ts';

describe('avecPrefixeFabricant', () => {
  it('omet le préfixe si le nom est vide (extérieur non lisible)', () => {
    assert.equal(avecPrefixeFabricant('', 'Stock : 8'), 'Stock : 8');
    assert.equal(avecPrefixeFabricant('   ', 'Stock : 8'), 'Stock : 8');
  });

  it('préfixe le nom quand il est connu', () => {
    assert.equal(avecPrefixeFabricant('Alice Martin', 'Stock : 8'), 'Alice Martin · Stock : 8');
  });
});

describe('estProduitExterieur', () => {
  it('détecte une provenance renseignée', () => {
    assert.equal(estProduitExterieur({ provenance_boutique_id: 'g' }), true);
    assert.equal(estProduitExterieur({ provenance_boutique_id: null }), false);
  });
});

describe('etiquetteBoutique', () => {
  it('préfixe Boutique si besoin', () => {
    assert.equal(etiquetteBoutique('Gare'), 'Boutique Gare');
    assert.equal(etiquetteBoutique('Boutique Centre'), 'Boutique Centre');
    assert.equal(etiquetteBoutique(null), 'Boutique');
  });
});

describe('etiquetteProvenanceAdmin', () => {
  it('préfixe De', () => {
    assert.equal(etiquetteProvenanceAdmin('Gare'), 'De Boutique Gare');
  });
});

describe('sousTitreExterieur', () => {
  it('formate frais avec saisie vendeuse (Jetés = vendeuse + pertes)', () => {
    assert.equal(
      sousTitreExterieurFrais({
        produits: 6,
        vendus: 3,
        jetes: 1,
        reste: 2,
        aSaisieVendeuse: true,
      }),
      'Produits : 6 · Vendus : 3 · Jetés : 1 · Reste : 2',
    );
  });

  it('signale l’absence de saisie vendeuse pour un frais', () => {
    assert.equal(
      sousTitreExterieurFrais({
        produits: 6,
        vendus: 0,
        jetes: 0,
        reste: 0,
        aSaisieVendeuse: false,
      }),
      'Produits : 6 · pas encore de saisie de la vendeuse',
    );
  });

  it('formate surgelé', () => {
    assert.equal(
      sousTitreExterieurSurgele({ stock: 12, vendus: 4, jetes: 3 }),
      'Stock : 12 · Vendus : 4 · Jetés : 3',
    );
  });
});

describe('grouperParBoutiqueDestinataire', () => {
  it('regroupe et trie par nom de boutique', () => {
    const noms = new Map([
      ['c', 'Centre'],
      ['n', 'Nord'],
    ]);
    const groupes = grouperParBoutiqueDestinataire(
      [
        {
          id: '1',
          nom: 'Éclair',
          boutique_id: 'n',
          provenance_boutique_id: 'g',
        },
        {
          id: '2',
          nom: 'Tarte',
          boutique_id: 'c',
          provenance_boutique_id: 'g',
        },
        {
          id: '3',
          nom: 'Cookie',
          boutique_id: 'c',
          provenance_boutique_id: 'g',
        },
      ],
      noms,
    );
    assert.equal(groupes.length, 2);
    assert.equal(groupes[0]!.nomBoutique, 'Boutique Centre');
    assert.deepEqual(
      groupes[0]!.produits.map((p) => p.nom),
      ['Cookie', 'Tarte'],
    );
    assert.equal(groupes[1]!.nomBoutique, 'Boutique Nord');
  });
});
