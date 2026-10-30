import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dateCsv, montantEurosCsv } from './csv.ts';

describe('csv (helpers restants)', () => {
  it('1500 centimes → 15,00', () => {
    assert.equal(montantEurosCsv(1500), '15,00');
    assert.equal(montantEurosCsv(0), '0,00');
    assert.equal(montantEurosCsv(5), '0,05');
  });

  it('formate les dates en JJ/MM/AAAA', () => {
    assert.equal(dateCsv('2026-10-28'), '28/10/2026');
  });
});
