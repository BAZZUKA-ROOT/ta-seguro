import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extrairLinks, analisarLink, desarmar } from '../js/links.js';

const analisar = (texto) => extrairLinks(texto).map(analisarLink);
const hosts = (texto) => extrairLinks(texto).map((l) => analisarLink(l).host);
const um = (texto) => {
  const ls = analisar(texto);
  assert.equal(ls.length, 1, `esperava 1 link em ${JSON.stringify(texto)}, veio ${ls.map((l) => l.host)}`);
  return ls[0];
};
const finge = (l) => l.problemas[0]?.startsWith('Finge ser site d');

// ---------- extração ----------

test('junta link quebrado em duas linhas pelo print (OCR)', () => {
  const l = um('Acesse https://nubank-\nseguro.com/pagar agora');
  assert.equal(l.host, 'nubank-seguro.com');
});

test('entende link "desarmado" (hxxps, [.])', () => {
  assert.deepEqual(hosts('entre em hxxps://banco-falso[.]com/login'), ['banco-falso.com']);
});

test('pontuação do WhatsApp, aspas curvas, reticências e parênteses não grudam no link', () => {
  const t = 'Clique *www.itau-premio.com*! ou _nubank-bonus.xyz_ ~caixa-pix.top~ (bradesco-app.online)… “santander-premio.site”';
  assert.deepEqual(hosts(t), ['itau-premio.com', 'nubank-bonus.xyz', 'caixa-pix.top', 'bradesco-app.online', 'santander-premio.site']);
});

test('final de site comprido sai inteiro', () => {
  assert.deepEqual(hosts('Pegue em resgate-premio.today'), ['resgate-premio.today']);
});

test('frase com ponto sem espaço não vira link', () => {
  assert.deepEqual(hosts('Fui na caixa.com a minha irmã'), []);
  assert.deepEqual(hosts('Veja o site.Depois me liga'), []);
});

test('repetidos contam uma vez só', () => {
  assert.equal(extrairLinks('golpe-pix.top e de novo golpe-pix.top').length, 1);
});

test('e-mail comum não é link; e-mail que imita marca é tipo email', () => {
  const ls = analisar('Fale com joao.costa@gmail.com ou atendimento@nubank-seguro.com');
  assert.equal(ls.length, 1);
  assert.equal(ls[0].tipo, 'email');
  assert.equal(ls[0].imitaMarca, true);
  assert.equal(ls[0].marca, 'Nubank');
  assert.ok(finge(ls[0]));
  assert.ok(ls[0].pontos > 0);
});

test('e-mail de domínio qualquer não ganha pontos', () => {
  const ls = analisar('escreva para contato@padariadobairro.com.br');
  for (const l of ls) assert.equal(l.pontos, 0);
});

// ---------- imitação de marca ----------

test('erro de digitação no nome da marca', () => {
  for (const t of ['nubamk.com.br', 'bradescco.com.br']) {
    const l = um(t);
    assert.equal(l.imitaMarca, true, t);
    assert.equal(l.oficialDe, null, t);
    assert.ok(finge(l), t);
    assert.ok(l.pontos >= 40, t);
  }
});

test('letra de outro alfabeto (homógrafo)', () => {
  const l = um('acesse nubаnk.com.br'); // "а" cirílico
  assert.match(l.host, /^xn--/);
  assert.equal(l.hostExibicao, 'nubаnk.com.br');
  assert.equal(l.oficialDe, null);
  assert.ok(l.problemas.some((p) => /outro alfabeto/.test(p)));
});

test('marca dentro de endereço com final suspeito', () => {
  const l = um('caixa-pix.top');
  assert.equal(l.marca, 'Caixa');
  assert.ok(finge(l));
  assert.ok(l.pontos <= 70);
});

test('nomes parecidos que não são golpe', () => {
  for (const t of ['correiobraziliense.com.br', 'itaucultural.org.br', 'pitauba.com.br']) {
    const l = um(t);
    assert.equal(l.imitaMarca, false, t);
    assert.equal(l.problemas.length, 0, t);
  }
});

test('palavra de isca em site desconhecido dá alguns pontos', () => {
  const l = um('resgate-premio.today');
  assert.equal(l.imitaMarca, false);
  assert.ok(l.pontos > 0);
  assert.ok(l.problemas.length > 0);
});

// ---------- sites oficiais ----------

test('sites oficiais', () => {
  const casos = { 'banco.bradesco': 'Bradesco', 'itau.com.br': 'Itaú', 'caixa.gov.br': 'Caixa', 'https://www.gov.br.': 'Governo (gov.br)' };
  for (const [t, marca] of Object.entries(casos)) {
    const l = um(t);
    assert.equal(l.oficialDe, marca, t);
    assert.equal(l.problemas.length, 0, t);
    assert.equal(l.pontos, 0, t);
  }
});

// ---------- conversa ----------

test('wa.me e t.me abrem conversa, sem pontos', () => {
  const [wa, tg] = analisar('https://wa.me/5511999998888 e https://t.me/golpista123');
  assert.equal(wa.tipo, 'conversa');
  assert.equal(wa.pontos, 0);
  assert.equal(wa.descricao, 'Abre uma conversa no WhatsApp com +55 11 99999-8888');
  assert.equal(tg.tipo, 'conversa');
  assert.equal(tg.pontos, 0);
  assert.match(tg.descricao, /Telegram/);
});

test('formato do resultado', () => {
  const l = um('https://nubank-seguro.com/pagar');
  for (const k of ['texto', 'host', 'hostExibicao', 'dominio', 'tipo', 'oficialDe', 'imitaMarca', 'marca', 'problemas', 'pontos']) assert.ok(k in l, k);
  assert.equal(l.tipo, 'link');
  assert.ok(Array.isArray(l.problemas));
  assert.ok(l.pontos >= 0 && l.pontos <= 70);
});

// ---------- desarmar ----------

test('desarmar troca pontos e http só nos endereços', () => {
  assert.equal(
    desarmar('Veja https://nubank-seguro.com/x e contato@golpe.com, fim. Fui na caixa.com a minha irmã'),
    'Veja hxxps://nubank-seguro[.]com/x e contato@golpe[.]com, fim. Fui na caixa.com a minha irmã',
  );
  assert.equal(desarmar('Texto sem link nenhum.'), 'Texto sem link nenhum.');
});

// ---------- desempenho ----------

test('texto enorme de lixo não trava (sem ReDoS)', () => {
  const padroes = ['a-', 'a.', 'www.', 'http://', 'a@', 'www.a-\n', '[.]', 'a\\@', 'nubank.', 'a.com/', 'javascript:', 'a,com'];
  for (const p of padroes) {
    const t = p.repeat(Math.ceil(200000 / p.length)).slice(0, 200000);
    const t0 = performance.now();
    extrairLinks(t).map(analisarLink);
    desarmar(t);
    const dt = performance.now() - t0;
    assert.ok(dt < 400, `${JSON.stringify(p)} levou ${dt.toFixed(0)}ms`);
  }
});
