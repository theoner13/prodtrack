import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  centimesVersEuros,
  dateExport,
  dateNomFichier,
  echapperHtml,
  genererHtmlRapport,
  heureExport,
  libelleMotifPerte,
  libelleTypeMouvement,
  nomFichierExport,
  preparerCaEmployes,
  preparerMouvements,
  preparerPertes,
  preparerVentes,
  quantiteMouvementExport,
  titreRapport,
} from './exports.ts';

describe('exports — libellés et formats', () => {
  it('formate les dates JJ/MM/AAAA et pour le nom de fichier', () => {
    assert.equal(dateExport('2026-10-28'), '28/10/2026');
    assert.equal(dateNomFichier('2026-10-01'), '01-10-2026');
  });

  it('convertit les centimes en euros nombre', () => {
    assert.equal(centimesVersEuros(1500), 15);
    assert.equal(centimesVersEuros(5), 0.05);
    assert.equal(centimesVersEuros(0), 0);
  });

  it('libellés type mouvement et motif en français clair', () => {
    assert.equal(libelleTypeMouvement('production'), 'Production');
    assert.equal(libelleTypeMouvement('sortie'), 'Sortie');
    assert.equal(libelleTypeMouvement('ajustement'), 'Correction');
    assert.equal(libelleMotifPerte('brule'), 'Brûlé');
    assert.equal(libelleMotifPerte('tombe'), 'Tombé ou abîmé');
  });

  it('quantité positive sauf correction signée', () => {
    assert.equal(quantiteMouvementExport('production', 5), 5);
    assert.equal(quantiteMouvementExport('sortie', 3), 3);
    assert.equal(quantiteMouvementExport('ajustement', -2), -2);
    assert.equal(quantiteMouvementExport('ajustement', 3), 3);
  });

  it('échappe le HTML', () => {
    assert.equal(echapperHtml('A <B> & "x"'), 'A &lt;B&gt; &amp; &quot;x&quot;');
  });

  it('construit titre et nom de fichier', () => {
    assert.equal(
      titreRapport('Ventes', '2026-10-01', '2026-10-30', 'Boulangerie Test'),
      'Ventes du 01/10/2026 au 30/10/2026 — Boulangerie Test',
    );
    assert.equal(
      nomFichierExport('Ventes', '2026-10-01', '2026-10-30', 'xlsx'),
      'ProdTrack - Ventes - 01-10-2026 au 30-10-2026.xlsx',
    );
  });

  it('formate une heure en fuseau Paris', () => {
    // 14:30 UTC en hiver = 15:30 Paris
    assert.equal(heureExport('2026-01-15T14:30:00.000Z'), '15:30');
  });
});

describe('exports — préparation des tableaux', () => {
  it('trie les ventes et calcule les totaux', () => {
    const { tableau } = preparerVentes(
      [
        {
          jour: '2026-10-02',
          boutique_nom: 'Centre',
          produit_nom: 'Cookie',
          fabricant_nom: 'Alice',
          vendu: 2,
          jete: 1,
          reste: 0,
          prix_unitaire_centimes: 250,
          ca_centimes: 500,
        },
        {
          jour: '2026-10-01',
          boutique_nom: 'Nord',
          produit_nom: 'Tarte',
          fabricant_nom: 'Bob',
          vendu: 1,
          jete: 0,
          reste: 3,
          prix_unitaire_centimes: 1000,
          ca_centimes: 1000,
        },
      ],
      '2026-10-01',
      '2026-10-02',
      'Toutes',
    );

    assert.equal(tableau.lignes[0]?.[0], '01/10/2026');
    assert.equal(tableau.lignes[0]?.[2], 'Tarte');
    assert.equal(tableau.lignes[1]?.[0], '02/10/2026');
    assert.deepEqual(tableau.enTetes, [
      'Date',
      'Boutique',
      'Produit',
      'Pâtissier',
      'Prix unitaire',
      'Vendus',
      'Jetés',
      'Restes',
      'CA',
    ]);
    assert.equal(tableau.totaux[0]?.[5], 3);
    assert.equal(tableau.totaux[0]?.[6], 1);
    assert.equal(tableau.totaux[0]?.[7], 3);
    assert.equal(tableau.totaux[0]?.[8], 15);
    assert.equal(tableau.paysage, true);
  });

  it('prépare les mouvements avec Correction et heure', () => {
    const { tableau } = preparerMouvements(
      [
        {
          jour: '2026-10-01',
          created_at: '2026-10-01T08:05:00.000Z',
          boutique_nom: 'Centre',
          produit_nom: 'Cookie',
          type: 'ajustement',
          quantite: -2,
          saisi_par_nom: 'Patron',
        },
        {
          jour: '2026-10-01',
          created_at: '2026-10-01T07:00:00.000Z',
          boutique_nom: 'Centre',
          produit_nom: 'Cookie',
          type: 'production',
          quantite: 10,
          saisi_par_nom: 'Alice',
        },
        {
          jour: '2026-10-01',
          created_at: '2026-10-01T09:00:00.000Z',
          boutique_nom: 'Centre',
          produit_nom: 'Cookie',
          type: 'sortie',
          quantite: 3,
          saisi_par_nom: 'Alice',
        },
      ],
      '2026-10-01',
      '2026-10-01',
      'Centre',
    );

    assert.equal(tableau.lignes[0]?.[4], 'Production');
    assert.equal(tableau.lignes[0]?.[5], 10);
    assert.equal(tableau.lignes[1]?.[4], 'Correction');
    assert.equal(tableau.lignes[1]?.[5], -2);
    assert.equal(tableau.lignes[2]?.[4], 'Sortie');
    assert.equal(tableau.lignes[2]?.[5], 3);
    assert.deepEqual(tableau.totaux, [
      ['Total production', null, null, null, null, 10, null],
      ['Total sorties', null, null, null, null, 3, null],
      ['Total corrections', null, null, null, null, -2, null],
    ]);
  });

  it('agrège le CA par employé, boutique et jour', () => {
    const { tableau } = preparerCaEmployes(
      [
        {
          jour: '2026-10-01',
          fabricant_id: 'e1',
          fabricant_nom: 'Alice',
          boutique_id: 'b1',
          vendu: 2,
          jete: 0,
          ca_centimes: 500,
        },
        {
          jour: '2026-10-01',
          fabricant_id: 'e1',
          fabricant_nom: 'Alice',
          boutique_id: 'b1',
          vendu: 1,
          jete: 1,
          ca_centimes: 250,
        },
        {
          jour: '2026-10-01',
          fabricant_id: 'e1',
          fabricant_nom: 'Alice',
          boutique_id: 'b2',
          vendu: 4,
          jete: 0,
          ca_centimes: 800,
        },
      ],
      (id) => (id === 'b1' ? 'Centre' : id === 'b2' ? 'Nord' : '—'),
      '2026-10-01',
      '2026-10-01',
      'Toutes',
    );

    assert.equal(tableau.lignes.length, 2);
    assert.deepEqual(tableau.enTetes, [
      'Date',
      'Employé',
      'Boutique',
      'Vendus',
      'Jetés',
      'CA',
    ]);
    assert.equal(tableau.lignes[0]?.[2], 'Centre');
    assert.equal(tableau.lignes[0]?.[3], 3);
    assert.equal(tableau.lignes[0]?.[5], 7.5);
    assert.equal(tableau.lignes[1]?.[2], 'Nord');
    assert.equal(tableau.totaux[0]?.[5], 15.5);
  });

  it('prépare les pertes avec Oui/Non', () => {
    const { tableau } = preparerPertes(
      [
        {
          jour: '2026-10-02',
          boutique_nom: 'Nord',
          produit_nom: 'Cookie',
          quantite: 8,
          motif: 'brule',
          dans_le_stock: false,
          saisi_par_nom: 'Alice',
        },
        {
          jour: '2026-10-01',
          boutique_nom: 'Centre',
          produit_nom: 'Tarte',
          quantite: 1,
          motif: 'tombe',
          dans_le_stock: true,
          saisi_par_nom: 'Bob',
        },
      ],
      '2026-10-01',
      '2026-10-02',
      'Toutes',
    );

    assert.equal(tableau.lignes[0]?.[0], '01/10/2026');
    assert.equal(tableau.lignes[0]?.[4], 'Tombé ou abîmé');
    assert.equal(tableau.lignes[0]?.[5], 'Oui');
    assert.equal(tableau.lignes[1]?.[5], 'Non');
    assert.equal(tableau.totaux[0]?.[3], 9);
  });

  it('génère un HTML échappé avec ligne Total', () => {
    const { tableau } = preparerPertes(
      [
        {
          jour: '2026-10-01',
          boutique_nom: 'A <B>',
          produit_nom: 'Cookie',
          quantite: 2,
          motif: 'autre',
          dans_le_stock: true,
          saisi_par_nom: 'Alice',
        },
      ],
      '2026-10-01',
      '2026-10-01',
      'Test',
    );
    const html = genererHtmlRapport(tableau, new Date('2026-10-30T10:00:00Z'));
    assert.ok(html.includes('ProdTrack'));
    assert.ok(html.includes('A &lt;B&gt;'));
    assert.ok(html.includes('class="total"'));
    assert.ok(html.includes('Total'));
    assert.ok(!html.includes('A <B>'));
  });
});
