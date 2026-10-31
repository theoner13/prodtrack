import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  messageConfirmationProductionFrais,
  sousTitreDisponibleFrais,
} from './disponible-frais.ts';

describe('messages production frais', () => {
  it('confirme au singulier et au pluriel sans parler de stock', () => {
    assert.equal(
      messageConfirmationProductionFrais(1, 'Croissant', 8),
      '1 Croissant produit aujourd\'hui. Disponible : 8',
    );
    assert.equal(
      messageConfirmationProductionFrais(12, 'Croissants', 30),
      '12 Croissants produits aujourd\'hui. Disponible : 30',
    );
  });

  it('détaille production et restes seulement s\'ils sont utiles', () => {
    assert.equal(sousTitreDisponibleFrais(5, 0, 0), 'Disponible : 5');
    assert.equal(
      sousTitreDisponibleFrais(30, 12, 18),
      'Disponible : 30 (produits aujourd\'hui 12 · restes d\'hier 18)',
    );
    assert.equal(
      sousTitreDisponibleFrais(3, 0, 3),
      'Disponible : 3 (produits aujourd\'hui 0 · restes d\'hier 3)',
    );
  });
});
