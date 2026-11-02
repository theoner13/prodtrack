import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatHeureRetrait,
  formatRetraitComplet,
  libelleDansCombien,
  libelleGroupeJour,
  libelleJourFiche,
  peutSignalerNonRecue,
  regrouperParJour,
  resteAPayerCentimes,
  retraitVersIso,
  statutsDuFiltre,
  validerCommande,
  type SaisieCommande,
} from './commandes.ts';

function saisieBase(over: Partial<SaisieCommande> = {}): SaisieCommande {
  return {
    clientNom: 'Dupont',
    clientTelephone: '0601020304',
    clientEmail: '',
    gateau: 'Fraisier',
    nbParts: 8,
    demandes: '',
    inscription: 'Joyeux anniversaire Léa',
    boutiqueFabricationId: 'fab',
    boutiqueRetraitId: 'ret',
    jourRetrait: '2026-11-10',
    heureRetrait: '15:30',
    prixEuros: '35,00',
    acompteEuros: '10',
    ...over,
  };
}

describe('commandes — reste à payer', () => {
  it('calcule prix − acompte', () => {
    assert.equal(resteAPayerCentimes(3500, 1000), 2500);
  });
  it('retourne null sans prix', () => {
    assert.equal(resteAPayerCentimes(null, 1000), null);
  });
  it('traite un acompte absent comme 0', () => {
    assert.equal(resteAPayerCentimes(3500, null), 3500);
  });
});

describe('commandes — format retrait', () => {
  it('formate l’heure en HHhMM (Paris)', () => {
    // 14:30 UTC = 15:30 Paris (hiver)
    assert.equal(formatHeureRetrait('2026-01-15T14:30:00.000Z'), '15h30');
  });
  it('formate JJ/MM à HHhMM', () => {
    assert.equal(formatRetraitComplet('2026-01-15T14:30:00.000Z'), '15/01 à 15h30');
  });
  it('libellé Aujourd’hui / Demain / jour', () => {
    assert.equal(libelleGroupeJour('2026-11-02T10:00:00.000Z', '2026-11-02'), "Aujourd'hui");
    assert.equal(libelleGroupeJour('2026-11-03T10:00:00.000Z', '2026-11-02'), 'Demain');
    assert.match(libelleGroupeJour('2026-11-05T10:00:00.000Z', '2026-11-02'), /05\/11/);
  });
  it('libellé jour fiche : Aujourd’hui / Demain · … / jour', () => {
    assert.equal(libelleJourFiche('2026-11-02T10:00:00.000Z', '2026-11-02'), "Aujourd'hui");
    assert.match(libelleJourFiche('2026-11-03T10:00:00.000Z', '2026-11-02'), /^Demain · .+ 03\/11$/);
    assert.match(libelleJourFiche('2026-11-05T10:00:00.000Z', '2026-11-02'), /05\/11/);
  });
});

describe('commandes — délai avant retrait', () => {
  it('affiche les minutes si moins d’une heure', () => {
    assert.equal(
      libelleDansCombien(
        '2026-11-02T15:40:00.000Z',
        new Date('2026-11-02T15:00:00.000Z'),
        '2026-11-02',
      ),
      'dans 40 min',
    );
  });
  it('affiche heures et minutes', () => {
    assert.equal(
      libelleDansCombien(
        '2026-11-02T17:15:00.000Z',
        new Date('2026-11-02T15:00:00.000Z'),
        '2026-11-02',
      ),
      'dans 2 h 15',
    );
  });
  it('retourne null si autre jour ou déjà passé', () => {
    assert.equal(
      libelleDansCombien(
        '2026-11-03T15:00:00.000Z',
        new Date('2026-11-02T15:00:00.000Z'),
        '2026-11-02',
      ),
      null,
    );
    assert.equal(
      libelleDansCombien(
        '2026-11-02T14:00:00.000Z',
        new Date('2026-11-02T15:00:00.000Z'),
        '2026-11-02',
      ),
      null,
    );
  });
});

describe('commandes — regroupement par jour', () => {
  it('trie et regroupe', () => {
    const groupes = regrouperParJour(
      [
        { id: '2', retrait_le: '2026-11-03T15:00:00.000Z' },
        { id: '1', retrait_le: '2026-11-02T09:00:00.000Z' },
        { id: '3', retrait_le: '2026-11-02T18:00:00.000Z' },
      ],
      '2026-11-02',
    );
    assert.equal(groupes.length, 2);
    assert.equal(groupes[0]!.libelle, "Aujourd'hui");
    assert.deepEqual(
      groupes[0]!.commandes.map((c) => c.id),
      ['1', '3'],
    );
    assert.equal(groupes[1]!.libelle, 'Demain');
  });
});

describe('commandes — filtre statut', () => {
  it('À venir = à faire + prêtes + reçues', () => {
    assert.deepEqual(statutsDuFiltre('a_venir'), ['a_faire', 'prete', 'recue']);
  });
});

describe('commandes — signalement non reçu', () => {
  it('refuse trop tôt et indique l’heure', () => {
    const r = peutSignalerNonRecue(
      '2026-11-02T15:00:00.000Z',
      'a_faire',
      new Date('2026-11-02T12:00:00.000Z'),
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.aPartirDe, /h/);
  });
  it('accepte à partir d’une heure avant', () => {
    const r = peutSignalerNonRecue(
      '2026-11-02T15:00:00.000Z',
      'prete',
      new Date('2026-11-02T14:05:00.000Z'),
    );
    assert.equal(r.ok, true);
  });
  it('refuse si déjà reçue', () => {
    const r = peutSignalerNonRecue(
      '2026-11-02T15:00:00.000Z',
      'recue',
      new Date('2026-11-02T14:05:00.000Z'),
    );
    assert.equal(r.ok, false);
  });
});

describe('commandes — retraitVersIso', () => {
  it('convertit jour + heure Paris en ISO', () => {
    const iso = retraitVersIso('2026-01-15', '15:30');
    assert.ok(iso);
    assert.equal(formatHeureRetrait(iso!), '15h30');
    assert.equal(iso!.startsWith('2026-01-15T'), true);
  });
});

describe('commandes — validation formulaire', () => {
  it('accepte une saisie complète', () => {
    const r = validerCommande(saisieBase(), {
      maintenant: new Date('2026-11-01T10:00:00.000Z'),
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.gateau, 'Fraisier');
      assert.equal(r.data.prix_centimes, 3500);
      assert.equal(r.data.acompte_centimes, 1000);
      assert.equal(r.data.inscription, 'Joyeux anniversaire Léa');
    }
  });

  it('refuse un acompte supérieur au prix', () => {
    const r = validerCommande(saisieBase({ acompteEuros: '40' }), {
      maintenant: new Date('2026-11-01T10:00:00.000Z'),
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.erreurs.acompteEuros ?? '', /acompte/i);
  });

  it('refuse un retrait dans le passé', () => {
    const r = validerCommande(saisieBase({ jourRetrait: '2026-10-01', heureRetrait: '10:00' }), {
      maintenant: new Date('2026-11-01T10:00:00.000Z'),
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.erreurs.jourRetrait ?? '', /passé/);
  });

  it('exige le nom et le téléphone', () => {
    const r = validerCommande(saisieBase({ clientNom: '  ', clientTelephone: '' }), {
      maintenant: new Date('2026-11-01T10:00:00.000Z'),
    });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.erreurs.clientNom);
      assert.ok(r.erreurs.clientTelephone);
    }
  });

  it('refuse nb_parts ≤ 0', () => {
    const r = validerCommande(saisieBase({ nbParts: 0 }), {
      maintenant: new Date('2026-11-01T10:00:00.000Z'),
    });
    assert.equal(r.ok, false);
  });
});
