import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  detailCaLaboratoire,
  estBoutiqueLaboratoire,
  etiquetteLaboratoire,
  filtrerCommandesLabo,
  grouperParPatissierLabo,
  libelleJourCommandeLabo,
  libelleStatutCommandeLabo,
  planningLaboParJour,
  regrouperCommandesLaboParJour,
  statutCommandeLabo,
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

describe('statutCommandeLabo', () => {
  it('dérive le statut et ses libellés', () => {
    assert.equal(
      statutCommandeLabo({ annulee_le: null, prete_le: null, effectuee_le: null }),
      'a_faire',
    );
    assert.equal(
      statutCommandeLabo({
        annulee_le: null,
        prete_le: '2026-11-07T10:00:00Z',
        effectuee_le: null,
      }),
      'prete',
    );
    assert.equal(
      statutCommandeLabo({
        annulee_le: null,
        prete_le: '2026-11-07T10:00:00Z',
        effectuee_le: '2026-11-07T12:00:00Z',
      }),
      'effectuee',
    );
    assert.equal(
      statutCommandeLabo({
        annulee_le: '2026-11-07T09:00:00Z',
        prete_le: null,
        effectuee_le: null,
      }),
      'annulee',
    );
    assert.equal(libelleStatutCommandeLabo('a_faire'), 'À faire');
    assert.equal(libelleStatutCommandeLabo('prete'), 'Prête');
    assert.equal(libelleStatutCommandeLabo('effectuee'), 'Effectuée');
    assert.equal(libelleStatutCommandeLabo('annulee'), 'Annulée');
  });
});

describe('filtrerCommandesLabo', () => {
  const base = [
    { id: '1', pour_le: '2026-11-07', annulee_le: null, effectuee_le: null },
    { id: '2', pour_le: '2026-11-05', annulee_le: null, effectuee_le: null },
    { id: '3', pour_le: '2026-11-09', annulee_le: '2026-11-06T10:00:00Z', effectuee_le: null },
    {
      id: '4',
      pour_le: '2026-11-10',
      annulee_le: null,
      effectuee_le: '2026-11-07T12:00:00Z',
    },
  ];

  it('filtre à venir, passées et annulées', () => {
    assert.deepEqual(
      filtrerCommandesLabo(base, 'a_venir', '2026-11-07').map((c) => c.id),
      ['1'],
    );
    assert.deepEqual(
      filtrerCommandesLabo(base, 'passees', '2026-11-07').map((c) => c.id),
      ['2', '4'],
    );
    assert.deepEqual(
      filtrerCommandesLabo(base, 'annulees', '2026-11-07').map((c) => c.id),
      ['3'],
    );
  });

  it('place une commande effectuée future dans Passées', () => {
    assert.deepEqual(
      filtrerCommandesLabo(
        [
          {
            id: 'x',
            pour_le: '2026-11-20',
            annulee_le: null,
            effectuee_le: '2026-11-07T08:00:00Z',
          },
        ],
        'a_venir',
        '2026-11-07',
      ).map((c) => c.id),
      [],
    );
    assert.deepEqual(
      filtrerCommandesLabo(
        [
          {
            id: 'x',
            pour_le: '2026-11-20',
            annulee_le: null,
            effectuee_le: '2026-11-07T08:00:00Z',
          },
        ],
        'passees',
        '2026-11-07',
      ).map((c) => c.id),
      ['x'],
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

describe('planningLaboParJour', () => {
  const base = [
    {
      produit_id: 'pac',
      pour_le: '2026-11-08',
      quantite: 100,
      produit_nom: 'Pain au chocolat',
      fabricant_nom: 'Alice',
      client: 'Client A',
      note: 'Chaud',
      annulee_le: null,
    },
    {
      produit_id: 'pac',
      pour_le: '2026-11-08',
      quantite: 100,
      produit_nom: 'Pain au chocolat',
      fabricant_nom: 'Alice',
      client: 'Client B',
      note: null,
      annulee_le: null,
    },
    {
      produit_id: 'pac',
      pour_le: '2026-11-08',
      quantite: 50,
      produit_nom: 'Pain au chocolat',
      fabricant_nom: 'Alice',
      client: 'Client A',
      note: 'Chaud',
      annulee_le: null,
    },
    {
      produit_id: 'brioche',
      pour_le: '2026-11-08',
      quantite: 20,
      produit_nom: 'Brioche',
      fabricant_nom: 'Bob',
      client: null,
      note: 'Sans sucre',
      annulee_le: null,
    },
    {
      produit_id: 'pac',
      pour_le: '2026-11-08',
      quantite: 999,
      produit_nom: 'Pain au chocolat',
      fabricant_nom: 'Alice',
      client: 'Annulé',
      note: null,
      annulee_le: '2026-11-07T10:00:00Z',
    },
    {
      produit_id: 'croiss',
      pour_le: '2026-11-07',
      quantite: 10,
      produit_nom: 'Croissant',
      fabricant_nom: 'Alice',
      client: 'Café',
      note: null,
      annulee_le: null,
    },
    {
      produit_id: 'loin',
      pour_le: '2026-11-20',
      quantite: 5,
      produit_nom: 'Pain',
      fabricant_nom: 'Bob',
      client: 'Hôtel',
      note: null,
      annulee_le: null,
    },
  ];

  it('additionne par client, ignore les annulées et trie par quantité', () => {
    const jours = planningLaboParJour(base, '2026-11-08');
    assert.equal(jours.length, 2);

    const jour = jours[0]!;
    assert.equal(jour.jour, '2026-11-08');
    assert.equal(jour.libelle, "Aujourd'hui");
    assert.equal(jour.totalPieces, 270);
    assert.equal(jour.produits.length, 2);

    const pac = jour.produits[0]!;
    assert.equal(pac.produitNom, 'Pain au chocolat');
    assert.equal(pac.quantite, 250);
    assert.equal(pac.fabricantNom, 'Alice');
    assert.equal(pac.clients.length, 2);
    assert.equal(pac.clients[0]!.clientLibelle, 'Client A');
    assert.equal(pac.clients[0]!.quantite, 150);
    assert.deepEqual(pac.clients[0]!.notes, ['Chaud']);
    assert.equal(pac.clients[0]!.marqueStatut, null);
    assert.equal(pac.clients[1]!.clientLibelle, 'Client B');
    assert.equal(pac.clients[1]!.quantite, 100);
    assert.equal(pac.clients[1]!.marqueStatut, null);

    const brioche = jour.produits[1]!;
    assert.equal(brioche.produitNom, 'Brioche');
    assert.equal(brioche.clients[0]!.clientLibelle, 'Sans client');
    assert.deepEqual(brioche.clients[0]!.notes, ['Sans sucre']);

    assert.equal(jours[1]!.jour, '2026-11-20');
    assert.equal(jours[1]!.totalPieces, 5);
  });

  it('libellé Demain pour le lendemain', () => {
    const jours = planningLaboParJour(base, '2026-11-07');
    const demain = jours.find((j) => j.jour === '2026-11-08');
    assert.ok(demain);
    assert.equal(demain!.libelle, 'Demain');
  });

  it('n’inclut pas les jours sans commande active', () => {
    const jours = planningLaboParJour(
      [
        {
          produit_id: 'x',
          pour_le: '2026-11-09',
          quantite: 1,
          produit_nom: 'X',
          fabricant_nom: 'A',
          client: null,
          note: null,
          annulee_le: '2026-11-08T12:00:00Z',
        },
      ],
      '2026-11-08',
    );
    assert.equal(jours.length, 0);
  });

  it('ignore les commandes avant aujourd’hui', () => {
    const jours = planningLaboParJour(base, '2026-11-08');
    assert.ok(!jours.some((j) => j.jour === '2026-11-07'));
  });

  it('marque le client seulement si toutes les commandes ont le même statut', () => {
    const jours = planningLaboParJour(
      [
        {
          produit_id: 'pac',
          pour_le: '2026-11-08',
          quantite: 10,
          produit_nom: 'Pain',
          fabricant_nom: 'Alice',
          client: 'Hôtel',
          note: null,
          annulee_le: null,
          prete_le: '2026-11-07T10:00:00Z',
          effectuee_le: null,
        },
        {
          produit_id: 'pac',
          pour_le: '2026-11-08',
          quantite: 5,
          produit_nom: 'Pain',
          fabricant_nom: 'Alice',
          client: 'Hôtel',
          note: null,
          annulee_le: null,
          prete_le: '2026-11-07T11:00:00Z',
          effectuee_le: null,
        },
        {
          produit_id: 'pac',
          pour_le: '2026-11-08',
          quantite: 3,
          produit_nom: 'Pain',
          fabricant_nom: 'Alice',
          client: 'Café',
          note: null,
          annulee_le: null,
          prete_le: '2026-11-07T10:00:00Z',
          effectuee_le: null,
        },
        {
          produit_id: 'pac',
          pour_le: '2026-11-08',
          quantite: 2,
          produit_nom: 'Pain',
          fabricant_nom: 'Alice',
          client: 'Café',
          note: null,
          annulee_le: null,
          prete_le: null,
          effectuee_le: null,
        },
        {
          produit_id: 'pac',
          pour_le: '2026-11-08',
          quantite: 4,
          produit_nom: 'Pain',
          fabricant_nom: 'Alice',
          client: 'Boulangerie',
          note: null,
          annulee_le: null,
          prete_le: '2026-11-07T09:00:00Z',
          effectuee_le: '2026-11-07T12:00:00Z',
        },
      ],
      '2026-11-08',
    );
    const clients = jours[0]!.produits[0]!.clients;
    const hotel = clients.find((c) => c.clientLibelle === 'Hôtel');
    const cafe = clients.find((c) => c.clientLibelle === 'Café');
    const boulangerie = clients.find((c) => c.clientLibelle === 'Boulangerie');
    assert.equal(hotel?.marqueStatut, 'prete');
    assert.equal(cafe?.marqueStatut, null);
    assert.equal(boulangerie?.marqueStatut, 'effectuee');
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
