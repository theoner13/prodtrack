import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { champCsv, dateCsv, genererCsv, montantEurosCsv } from './csv.ts';

describe('csv', () => {
  it('commence par le BOM UTF-8', () => {
    const csv = genererCsv(['A'], [['1']]);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.ok(csv.startsWith('\uFEFF'));
  });

  it('utilise le séparateur ; et la fin de ligne \\r\\n', () => {
    const csv = genererCsv(['Jour', 'CA'], [['28/10/2026', '15,00']]);
    assert.ok(csv.includes(';'));
    assert.ok(csv.includes('\r\n'));
    assert.equal(csv, '\uFEFFJour;CA\r\n28/10/2026;15,00\r\n');
  });

  it('échappe les guillemets et les points-virgules', () => {
    assert.equal(champCsv('dit "bonjour"'), '"dit ""bonjour"""');
    assert.equal(champCsv('a;b'), '"a;b"');
    assert.equal(champCsv('ligne\nnormale'), '"ligne\nnormale"');
  });

  it('1500 centimes → 15,00', () => {
    assert.equal(montantEurosCsv(1500), '15,00');
    assert.equal(montantEurosCsv(0), '0,00');
    assert.equal(montantEurosCsv(5), '0,05');
  });

  it('conserve les accents', () => {
    const csv = genererCsv(['Produit'], [['Pâtisserie']]);
    assert.ok(csv.includes('Pâtisserie'));
  });

  it('formate les dates en JJ/MM/AAAA', () => {
    assert.equal(dateCsv('2026-10-28'), '28/10/2026');
  });
});
