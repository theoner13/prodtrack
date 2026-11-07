import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  detailCaLaboratoire,
  estBoutiqueLaboratoire,
  etiquetteLaboratoire,
  filtrerCommandesLabo,
  grouperParPatissierLabo,
  libelleJourCommandeLabo,
  regrouperCommandesLaboParJour,
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

describe('libelleJourCommandeLabo', () => {
  it('distingue aujourd’hui, demain et un autre jour', () => {
    assert.equal(libelleJourCommandeLabo('2026-11-07', '2026-11-07'), "Aujourd'hui");
    assert.equal(libelleJourCommandeLabo('2026-11-08', '2026-11-07'), 'Demain');
    assert.match(libelleJourCommandeLabo('2026-11-10', '2026-11-07'), /10\/11/);
  });
});

describe('filtrerCommandesLabo', () => {
  const base = [
    { id: '1', pour_le: '2026-11-07', annulee_le: null },
    { id: '2', pour_le: '2026-11-05', annulee_le: null },
    { id: '3', pour_le: '2026-11-09', annulee_le: '2026-11-06T10:00:00Z' },
  ];

  it('filtre à venir, passées et annulées', () => {
    assert.deepEqual(
      filtrerCommandesLabo(base, 'a_venir', '2026-11-07').map((c) => c.id),
      ['1'],
    );
    assert.deepEqual(
      filtrerCommandesLabo(base, 'passees', '2026-11-07').map((c) => c.id),
      ['2'],
    );
    assert.deepEqual(
      filtrerCommandesLabo(base, 'annulees', '2026-11-07').map((c) => c.id),
      ['3'],
    );
  });
});

describe('regrouperCommandesLaboParJour', () => {
  it('groupe par jour avec libellés et tri', () => {
    const groupes = regrouperCommandesLaboParJour(
      [
        {
          id: 'a',
          pour_le: '2026-11-08',
          quantite: 10,
          produit_nom: 'Pain',
          fabricant_nom: 'Alice',
          client: 'Hôtel',
          annulee_le: null,
        },
        {
          id: 'b',
          pour_le: '2026-11-07',
          quantite: 200,
          produit_nom: 'Croissant',
          fabricant_nom: 'Bob',
          client: null,
          annulee_le: null,
        },
        {
          id: 'c',
          pour_le: '2026-11-07',
          quantite: 50,
          produit_nom: 'Brioche',
          fabricant_nom: 'Alice',
          client: 'Café',
          annulee_le: null,
        },
      ],
      '2026-11-07',
    );
    assert.equal(groupes.length, 2);
    assert.equal(groupes[0]!.libelle, "Aujourd'hui");
    assert.deepEqual(
      groupes[0]!.commandes.map((c) => c.produit_nom),
      ['Brioche', 'Croissant'],
    );
    assert.equal(groupes[1]!.libelle, 'Demain');
  });
});

describe('detailCaLaboratoire', () => {
  it('calcule total, par produit et par jour', () => {
    const detail = detailCaLaboratoire(
      [
        {
          jour: '2026-11-07',
          fabricant_id: 'fab',
          produit_id: 'p1',
          produit_nom: 'Croissant',
          quantite: 10,
          prix_unitaire_centimes: 100,
          ca_centimes: 1000,
        },
        {
          jour: '2026-11-07',
          fabricant_id: 'fab',
          produit_id: 'p2',
          produit_nom: 'Pain',
          quantite: 2,
          prix_unitaire_centimes: 250,
          ca_centimes: 500,
        },
        {
          jour: '2026-11-08',
          fabricant_id: 'fab',
          produit_id: 'p1',
          produit_nom: 'Croissant',
          quantite: 5,
          prix_unitaire_centimes: 100,
          ca_centimes: 500,
        },
        {
          jour: '2026-11-07',
          fabricant_id: 'autre',
          produit_id: 'p1',
          produit_nom: 'Croissant',
          quantite: 99,
          prix_unitaire_centimes: 100,
          ca_centimes: 9900,
        },
      ],
      'fab',
    );
    assert.equal(detail.totalCentimes, 2000);
    assert.equal(detail.produits.length, 2);
    assert.equal(detail.produits[0]!.nom, 'Croissant');
    assert.equal(detail.produits[0]!.quantite, 15);
    assert.equal(detail.produits[0]!.caCentimes, 1500);
    assert.equal(detail.jours.length, 2);
    assert.equal(detail.jours[0]!.cle, '2026-11-07');
    assert.equal(detail.jours[0]!.caCentimes, 1500);
  });
});
