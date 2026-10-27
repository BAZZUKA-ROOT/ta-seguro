import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analisar } from '../js/motor.js';

const corpus = JSON.parse(readFileSync(new URL('./corpus.json', import.meta.url), 'utf8'));
const ORDEM = { baixo: 0, indefinido: 0, medio: 1, alto: 2 };

test('corpus: golpes chegam ao nível mínimo esperado (>= 85%)', () => {
  const golpes = corpus.filter((c) => c.golpe);
  const falhas = golpes.filter((c) => ORDEM[analisar(c.texto).nivel] < ORDEM[c.minimo || 'medio']);
  const taxa = 1 - falhas.length / golpes.length;
  assert.ok(
    taxa >= 0.85,
    `só ${(taxa * 100).toFixed(1)}% dos golpes detectados. Ex.: ${falhas.slice(0, 3).map((f) => f.texto.slice(0, 60)).join(' | ')}`
  );
});

test('corpus: mensagens normais quase nunca viram alerta (<= 4%)', () => {
  const normais = corpus.filter((c) => !c.golpe);
  const fp = normais.filter((c) => ORDEM[analisar(c.texto).nivel] >= 1);
  const taxa = fp.length / normais.length;
  assert.ok(
    taxa <= 0.04,
    `${(taxa * 100).toFixed(1)}% de falsos positivos. Ex.: ${fp.slice(0, 3).map((f) => f.texto.slice(0, 60)).join(' | ')}`
  );
});
