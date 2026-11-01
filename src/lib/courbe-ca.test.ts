import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  indicesLibellesVisibles,
  joursDeLaPlage,
  libelleBulleCourbe,
  libelleJourCourbe,
  maxRepereCourbe,
  plageCourbeSeptJours,
  pointsCourbeCa,
  reperesCourbe,
  segmentEntrePoints,
  styleLibellePourPlage,
} from './courbe-ca.ts';

describe('courbe-ca — plages', () => {
  it('liste les jours inclus de debut à fin', () => {
    assert.deepEqual(joursDeLaPlage('2026-10-27', '2026-10-29'), [
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
    ]);
  });

  it('plage de 7 jours se terminant par le jour choisi', () => {
    assert.deepEqual(plageCourbeSeptJours('2026-11-01'), {
      debut: '2026-10-26',
      fin: '2026-11-01',
    });
  });
});

describe('courbe-ca — points', () => {
  it('regroupe le CA et met 0 les jours sans vente', () => {
    const points = pointsCourbeCa(
      [
        { jour: '2026-10-27', ca_centimes: 500 },
        { jour: '2026-10-27', ca_centimes: 300 },
        { jour: '2026-10-29', ca_centimes: 1200 },
      ],
      '2026-10-27',
      '2026-10-29',
    );
    assert.deepEqual(points, [
      { jour: '2026-10-27', caCentimes: 800, index: 0 },
      { jour: '2026-10-28', caCentimes: 0, index: 1 },
      { jour: '2026-10-29', caCentimes: 1200, index: 2 },
    ]);
  });

  it('ignore les lignes sans jour', () => {
    const points = pointsCourbeCa(
      [{ jour: null, ca_centimes: 999 }],
      '2026-10-28',
      '2026-10-28',
    );
    assert.deepEqual(points, [{ jour: '2026-10-28', caCentimes: 0, index: 0 }]);
  });
});

describe('courbe-ca — repères et libellés', () => {
  it('arrondit le max à une valeur lisible', () => {
    assert.equal(maxRepereCourbe(0), 10_000);
    assert.equal(maxRepereCourbe(12_345), 20_000); // 123,45 € → 200 €
    assert.equal(maxRepereCourbe(123_450), 200_000); // 1 234,50 € → 2 000 €
    assert.equal(maxRepereCourbe(450_000), 500_000); // 4 500 € → 5 000 €
  });

  it('donne 0, moitié et max', () => {
    const r = reperesCourbe(12_000);
    assert.equal(r.length, 3);
    assert.equal(r[2]!.valeur, 0);
    assert.equal(r[0]!.valeur, maxRepereCourbe(12_000));
    assert.equal(r[1]!.valeur, Math.round(r[0]!.valeur / 2));
  });

  it('libellé semaine et mois', () => {
    assert.equal(libelleJourCourbe('2026-10-26', 'semaine'), 'lun 26');
    assert.equal(libelleJourCourbe('2026-10-26', 'mois'), '26/10');
  });

  it('libellé bulle avec montant', () => {
    assert.equal(libelleBulleCourbe('2026-10-26', 123450), 'lun 26/10 · 1 234,50 €');
  });

  it('style mois au-delà de 10 jours', () => {
    assert.equal(styleLibellePourPlage('2026-10-01', '2026-10-07'), 'semaine');
    assert.equal(styleLibellePourPlage('2026-10-01', '2026-10-31'), 'mois');
  });
});

describe('courbe-ca — géométrie', () => {
  it('calibre les libellés visibles selon la largeur', () => {
    assert.deepEqual(indicesLibellesVisibles(7, 400), [0, 1, 2, 3, 4, 5, 6]);
    const indices = indicesLibellesVisibles(31, 360);
    assert.equal(indices[0], 0);
    assert.equal(indices[indices.length - 1], 30);
    assert.ok(indices.length < 31);
  });

  it('calcule un segment horizontal', () => {
    const s = segmentEntrePoints(0, 10, 100, 10);
    assert.equal(s.longueur, 100);
    assert.equal(s.angleDeg, 0);
    assert.equal(s.x, 0);
    assert.equal(s.y, 10);
  });
});
