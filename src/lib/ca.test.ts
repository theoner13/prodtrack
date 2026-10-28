import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  datesPeriode,
  parEmploye,
  parJour,
  parMois,
  parProduit,
  parSemaine,
  totaux,
  type LigneCa,
} from './ca.ts';

describe('ca — exemple cahier des charges 4.2', () => {
  // Muffin 3 €, fabricant A : vendu 5, jeté 1, reste 2 → CA A = 1500 cts, 1 jeté.
  // B n'a que fait la sortie → 0 € (aucune ligne dans ca_journalier pour B).
  const lignes: LigneCa[] = [
    {
      jour: '2026-10-28',
      fabricant_id: 'A',
      produit_id: 'muffin',
      produit_nom: 'Muffin',
      vendu: 5,
      jete: 1,
      reste: 2,
      prix_unitaire_centimes: 300,
      ca_centimes: 1500,
    },
  ];

  it('attribue le CA au fabricant A et 1 jeté', () => {
    const groupes = parEmploye(lignes);
    assert.equal(groupes.length, 1);
    assert.equal(groupes[0]!.cle, 'A');
    assert.equal(groupes[0]!.caCentimes, 1500);
    assert.equal(groupes[0]!.jete, 1);
    assert.equal(groupes[0]!.vendu, 5);
  });

  it('le pâtissier B (sortie seulement) a 0 €', () => {
    const groupes = parEmploye(lignes);
    const b = groupes.find((g) => g.cle === 'B');
    assert.equal(b, undefined);
    // B n'apparaît pas dans ca_journalier ; l'écran ajoute les actifs à 0 €.
    assert.equal(totaux(lignes.filter((l) => l.fabricant_id === 'B')).caCentimes, 0);
  });
});

describe('ca — changement de prix', () => {
  it('chaque ligne garde son prix (5×300 + 2×350 = 2200)', () => {
    const lignes: LigneCa[] = [
      {
        jour: '2026-10-01',
        fabricant_id: 'A',
        produit_id: 'muffin',
        vendu: 5,
        jete: 0,
        prix_unitaire_centimes: 300,
        ca_centimes: 1500,
      },
      {
        jour: '2026-10-15',
        fabricant_id: 'A',
        produit_id: 'muffin',
        vendu: 2,
        jete: 0,
        prix_unitaire_centimes: 350,
        ca_centimes: 700,
      },
    ];
    assert.equal(totaux(lignes).caCentimes, 2200);
    assert.equal(parEmploye(lignes)[0]!.caCentimes, 2200);
    assert.equal(parProduit(lignes)[0]!.caCentimes, 2200);
  });
});

describe('ca — semaine, mois, taux de perte', () => {
  it('un dimanche appartient à la semaine du lundi précédent', () => {
    // 2026-10-25 = dimanche → lundi 2026-10-19
    const lignes: LigneCa[] = [
      {
        jour: '2026-10-25',
        fabricant_id: 'A',
        produit_id: 'p1',
        vendu: 1,
        jete: 0,
        ca_centimes: 100,
      },
      {
        jour: '2026-10-26', // lundi suivant
        fabricant_id: 'A',
        produit_id: 'p1',
        vendu: 1,
        jete: 0,
        ca_centimes: 200,
      },
    ];
    const semaines = parSemaine(lignes);
    assert.equal(semaines.length, 2);
    assert.equal(semaines[0]!.cle, '2026-10-19');
    assert.equal(semaines[0]!.caCentimes, 100);
    assert.equal(semaines[1]!.cle, '2026-10-26');
    assert.equal(semaines[1]!.caCentimes, 200);
  });

  it('regroupe par mois (AAAA-MM)', () => {
    const lignes: LigneCa[] = [
      {
        jour: '2026-09-30',
        fabricant_id: 'A',
        produit_id: 'p1',
        vendu: 1,
        jete: 0,
        ca_centimes: 100,
      },
      {
        jour: '2026-10-01',
        fabricant_id: 'A',
        produit_id: 'p1',
        vendu: 2,
        jete: 0,
        ca_centimes: 200,
      },
    ];
    const mois = parMois(lignes);
    assert.equal(mois[0]!.cle, '2026-09');
    assert.equal(mois[1]!.cle, '2026-10');
  });

  it('taux de perte : 5 vendus, 1 jeté → 16,7 %', () => {
    const lignes: LigneCa[] = [
      {
        jour: '2026-10-28',
        fabricant_id: 'A',
        produit_id: 'muffin',
        vendu: 5,
        jete: 1,
        ca_centimes: 1500,
      },
    ];
    assert.equal(totaux(lignes).tauxPerte, 16.7);
  });

  it('taux de perte = 0 si aucun vendu ni jeté', () => {
    assert.equal(totaux([]).tauxPerte, 0);
  });

  it('par jour trie par date croissante', () => {
    const lignes: LigneCa[] = [
      {
        jour: '2026-10-28',
        fabricant_id: 'A',
        produit_id: 'p1',
        vendu: 1,
        jete: 0,
        ca_centimes: 50,
      },
      {
        jour: '2026-10-27',
        fabricant_id: 'A',
        produit_id: 'p1',
        vendu: 2,
        jete: 0,
        ca_centimes: 100,
      },
    ];
    const jours = parJour(lignes);
    assert.equal(jours[0]!.cle, '2026-10-27');
    assert.equal(jours[1]!.cle, '2026-10-28');
  });
});

describe('ca — périodes', () => {
  it('semaine d’un mercredi 2026-10-28 → du 2026-10-26 au 2026-10-28', () => {
    assert.deepEqual(datesPeriode('semaine', '2026-10-28'), {
      debut: '2026-10-26',
      fin: '2026-10-28',
    });
  });

  it('mois → du 1er du mois à aujourd’hui', () => {
    assert.deepEqual(datesPeriode('mois', '2026-10-28'), {
      debut: '2026-10-01',
      fin: '2026-10-28',
    });
  });

  it('hier du 2026-11-01 → 2026-10-31', () => {
    assert.deepEqual(datesPeriode('hier', '2026-11-01'), {
      debut: '2026-10-31',
      fin: '2026-10-31',
    });
  });

  it('aujourd’hui', () => {
    assert.deepEqual(datesPeriode('aujourdhui', '2026-10-28'), {
      debut: '2026-10-28',
      fin: '2026-10-28',
    });
  });
});
