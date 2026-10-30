import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  construirePlanning,
  libelleAccessibiliteLigne,
  libelleJourPlanning,
  type EntreePlanning,
} from './planning.ts';

const AUJOURDHUI = '2026-10-30'; // vendredi

function entree(partiel: Partial<EntreePlanning> & Pick<EntreePlanning, 'produitId' | 'nom'>): EntreePlanning {
  return {
    intermediaire: false,
    stock: 10,
    seuil: 5,
    jourFabrication: null,
    quantiteSuggeree: null,
    fiable: true,
    calculeLe: '2026-10-30T02:00:00Z',
    ...partiel,
  };
}

describe('construirePlanning', () => {
  it('déduplique : sous le seuil + prévision plus tard → une seule ligne Aujourd’hui', () => {
    const groupes = construirePlanning(
      [
        entree({
          produitId: '1',
          nom: 'Brownie',
          stock: 2,
          seuil: 8,
          jourFabrication: '2026-11-02',
          quantiteSuggeree: 56,
        }),
      ],
      AUJOURDHUI,
    );
    assert.equal(groupes.length, 1);
    assert.equal(groupes[0]!.jour, AUJOURDHUI);
    assert.equal(groupes[0]!.lignes.length, 1);
    assert.equal(groupes[0]!.lignes[0]!.quantite, 56);
    assert.equal(groupes[0]!.lignes[0]!.sousSeuil, true);
  });

  it('sous le seuil sans prévision → Aujourd’hui, quantité null', () => {
    const groupes = construirePlanning(
      [
        entree({
          produitId: '1',
          nom: 'Cookies',
          stock: 1,
          seuil: 12,
          jourFabrication: null,
          quantiteSuggeree: null,
          calculeLe: null,
        }),
      ],
      AUJOURDHUI,
    );
    assert.equal(groupes[0]!.lignes[0]!.quantite, null);
    assert.equal(groupes[0]!.lignes[0]!.sousSeuil, true);
  });

  it('ignore un produit hors semaine et au-dessus du seuil', () => {
    const groupes = construirePlanning(
      [
        entree({
          produitId: '1',
          nom: 'Tarte',
          stock: 20,
          seuil: 5,
          jourFabrication: '2026-11-20',
          quantiteSuggeree: 10,
        }),
      ],
      AUJOURDHUI,
    );
    assert.deepEqual(groupes, []);
  });

  it('groupe par jour et trie : sous seuil d’abord, puis quantité décroissante', () => {
    const groupes = construirePlanning(
      [
        entree({
          produitId: 'a',
          nom: 'Opéra',
          stock: 10,
          seuil: 5,
          jourFabrication: AUJOURDHUI,
          quantiteSuggeree: 25,
        }),
        entree({
          produitId: 'b',
          nom: 'Brownie',
          stock: 2,
          seuil: 8,
          jourFabrication: AUJOURDHUI,
          quantiteSuggeree: 56,
        }),
        entree({
          produitId: 'c',
          nom: 'Éclair',
          stock: 5,
          seuil: 10,
          jourFabrication: AUJOURDHUI,
          quantiteSuggeree: 48,
        }),
        entree({
          produitId: 'd',
          nom: 'Biscuit opéra',
          stock: 20,
          seuil: 5,
          jourFabrication: '2026-10-31',
          quantiteSuggeree: 42,
        }),
      ],
      AUJOURDHUI,
    );

    assert.equal(groupes.length, 2);
    assert.equal(groupes[0]!.libelle, "Aujourd'hui");
    assert.deepEqual(
      groupes[0]!.lignes.map((l) => l.nom),
      ['Brownie', 'Éclair', 'Opéra'],
    );
    assert.equal(groupes[1]!.libelle, 'Demain');
    assert.equal(groupes[1]!.lignes[0]!.nom, 'Biscuit opéra');
  });

  it('libellés de jour : Aujourd’hui, Demain, puis jour daté', () => {
    assert.equal(libelleJourPlanning(AUJOURDHUI, AUJOURDHUI), "Aujourd'hui");
    assert.equal(libelleJourPlanning('2026-10-31', AUJOURDHUI), 'Demain');
    assert.equal(libelleJourPlanning('2026-11-01', AUJOURDHUI), 'Dimanche 01/11');
  });

  it('libellé d’accessibilité', () => {
    const sousSeuil = {
      produitId: '1',
      nom: 'Brownie',
      intermediaire: false,
      stock: 2,
      seuil: 8,
      sousSeuil: true,
      jour: AUJOURDHUI,
      quantite: 56,
      fiable: true,
    };
    assert.equal(
      libelleAccessibiliteLigne(sousSeuil, AUJOURDHUI),
      "Brownie : sous le seuil, stock 2, seuil 8, 56 à faire aujourd'hui",
    );
    const normal = {
      ...sousSeuil,
      nom: 'Biscuit opéra',
      sousSeuil: false,
      stock: 20,
      seuil: 5,
      jour: '2026-10-31',
      quantite: 42,
    };
    assert.equal(
      libelleAccessibiliteLigne(normal, AUJOURDHUI),
      'Biscuit opéra : 42 à faire demain',
    );
  });
});
