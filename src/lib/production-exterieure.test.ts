import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  estProduitExterieur,
  etiquetteBoutique,
  etiquetteProvenanceAdmin,
  grouperParBoutiqueDestinataire,
  sousTitreExterieurFrais,
  sousTitreExterieurSurgele,
} from './production-exterieure.ts';

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
  it('formate frais et surgelé', () => {
    assert.equal(
      sousTitreExterieurFrais({
        disponible: 8,
        restesVeille: 2,
        jetes: 1,
        pertes: 0,
      }),
      "Disponible : 8 · Restes d'hier : 2 · Jetés : 1 · Pertes : 0",
    );
    assert.equal(
      sousTitreExterieurSurgele({ stock: 12, jetes: 0, pertes: 3 }),
      'Stock : 12 · Jetés : 0 · Pertes : 3',
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
