import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  estBoutiqueLaboratoire,
  etiquetteLaboratoire,
  grouperParPatissierLabo,
} from './laboratoire.ts';

describe('etiquetteLaboratoire', () => {
  it('renvoie Laboratoire', () => {
    assert.equal(etiquetteLaboratoire(), 'Laboratoire');
  });
});

describe('estBoutiqueLaboratoire', () => {
  it('détecte un id présent dans l’ensemble', () => {
    const labs = new Set(['lab-1']);
    assert.equal(estBoutiqueLaboratoire('lab-1', labs), true);
    assert.equal(estBoutiqueLaboratoire('boutique', labs), false);
  });
});

describe('grouperParPatissierLabo', () => {
  it('regroupe et trie par pâtissier puis produit', () => {
    const groupes = grouperParPatissierLabo([
      {
        id: '1',
        nom: 'Brioche',
        fabricant_id: 'b',
        fabricantNom: 'Bob',
        provenance_boutique_id: 'g',
        provenanceBoutiqueNom: 'Gare',
      },
      {
        id: '2',
        nom: 'Pain',
        fabricant_id: 'a',
        fabricantNom: 'Alice',
        provenance_boutique_id: 'c',
        provenanceBoutiqueNom: 'Centre',
      },
      {
        id: '3',
        nom: 'Croissant',
        fabricant_id: 'a',
        fabricantNom: 'Alice',
        provenance_boutique_id: 'c',
        provenanceBoutiqueNom: 'Centre',
      },
    ]);
    assert.equal(groupes.length, 2);
    assert.equal(groupes[0]!.fabricantNom, 'Alice');
    assert.deepEqual(
      groupes[0]!.produits.map((p) => p.nom),
      ['Croissant', 'Pain'],
    );
    assert.equal(groupes[1]!.fabricantNom, 'Bob');
  });
});
