import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  depassementMisEnVente,
  messageDepassementEnregistrement,
  messageDepassementLigne,
  texteMisEnVente,
} from './mis-en-vente.ts';

describe('mis en vente', () => {
  it('accepte 0/0/0 même si le total est 0', () => {
    assert.equal(depassementMisEnVente(0, 0, 0, 0), false);
  });

  it('détecte le dépassement et ignore l’égalité', () => {
    assert.equal(depassementMisEnVente(5, 3, 2, 10), false);
    assert.equal(depassementMisEnVente(5, 3, 3, 10), true);
    assert.equal(depassementMisEnVente(1, 0, 0, 0), true);
  });

  it('formate le sous-titre surgelé, frais et vide', () => {
    assert.equal(texteMisEnVente('surgele', 0, 0), 'Mis en vente : 0');
    assert.equal(
      texteMisEnVente('surgele', 8, 2),
      'Mis en vente : 10 (8 sortis · 2 restes d\'hier)',
    );
    assert.equal(
      texteMisEnVente('frais', 28, 2),
      'Mis en vente : 30 (28 produits · 2 restes d\'hier)',
    );
  });

  it('rédige les messages d’erreur de saisie', () => {
    assert.equal(
      messageDepassementLigne(10),
      'Dépasse la quantité mise en vente (10).',
    );
    assert.equal(
      messageDepassementEnregistrement(['Muffins', 'Cookies']),
      'Vendu + jeté + reste dépasse la quantité mise en vente pour : Muffins, Cookies.',
    );
  });
});
