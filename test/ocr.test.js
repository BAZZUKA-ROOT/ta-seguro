import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limparTextoOCR, ErroOCR, lerImagem, encerrarOCR } from '../js/ocr.js';
import { analisar } from '../js/motor.js';

test('ocr.js importa no Node sem DOM e expõe o contrato', () => {
  assert.equal(typeof lerImagem, 'function');
  assert.equal(typeof encerrarOCR, 'function');
  const e = new ErroOCR('rede');
  assert.ok(e instanceof Error);
  assert.equal(e.tipo, 'rede');
});

test('junta link do Shopee quebrado em várias linhas e tira a hora lida como lixo', () => {
  const bruto = 'Olá! Seu pedido Shopee foi separado.\nAcompanhe a entrega aqui: https://\nshopee-entregas-rastreamento-\noficial.com/pedido/BR8273641 — nom';
  const t = limparTextoOCR(bruto);
  assert.match(t, /https:\/\/shopee-entregas-rastreamento-oficial\.com\/pedido\/BR8273641$/m);
  assert.doesNotMatch(t, /nom/);
  const r = analisar(t);
  assert.ok(r.links.some((l) => l.host === 'shopee-entregas-rastreamento-oficial.com'));
  assert.notEqual(r.nivel, 'baixo');
});

test('junta link quebrado em 2 linhas depois do hífen', () => {
  const t = limparTextoOCR('Acesse inss-\nbeneficio.online 09:12');
  assert.equal(t, 'Acesse inss-beneficio.online');
});

test('remove barra de status, cabeçalho, "online", chip de data e caixa de digitar', () => {
  const bruto = '14:32 Eh 8/%\n< O online = o º\nHOJE\nOi mãe, tudo bem? Troquei de número, salva esse aqui. 14:30\n1430\nTô precisando de uma ajuda urgente, consegue fazer um pix pra mim? 14:31\nO Digite uma mensagem O';
  assert.equal(
    limparTextoOCR(bruto),
    'Oi mãe, tudo bem? Troquei de número, salva esse aqui.\nTô precisando de uma ajuda urgente, consegue fazer um pix pra mim?'
  );
});

test('conserta "www ." e "https: //" e "site. xyz"', () => {
  assert.equal(limparTextoOCR('Regularize em www .receitafederal-cpf.site antes'), 'Regularize em www.receitafederal-cpf.site antes');
  assert.equal(limparTextoOCR('Pague em https: //pagamento.xyz/boleto'), 'Pague em https://pagamento.xyz/boleto');
  assert.equal(limparTextoOCR('Regularize: https://correlos-rastreio. xyz/pagar'), 'Regularize: https://correlos-rastreio.xyz/pagar');
});

test('não junta palavras normais com hífen nem frases em linhas separadas', () => {
  const bruto = 'Oi vó! Amanhã eu passo aí, quer que eu leve pão? Bem-\nvindo de volta.\nOk.\nCom certeza vou sim';
  assert.equal(limparTextoOCR(bruto), bruto);
  assert.equal(limparTextoOCR('Tudo certo por aqui.\nCom carinho, sua neta 14:30 ✓✓'), 'Tudo certo por aqui.\nCom carinho, sua neta');
});

test('mantém "Encaminhada com frequência" uma vez só, no começo', () => {
  const t = limparTextoOCR('Encaminhada com frequência\nGanhe 500 reais agora 10:02');
  assert.equal(t, 'Encaminhada com frequência\nGanhe 500 reais agora');
  assert.equal(limparTextoOCR('Encaminhada\nOi'), 'Oi');
});

test('entrada vazia ou estranha não quebra', () => {
  assert.equal(limparTextoOCR(''), '');
  assert.equal(limparTextoOCR(null), '');
  assert.equal(limparTextoOCR('🙂🙂\n%%%'), '');
});

test('lerImagem sem imagem dá ErroOCR do tipo imagem', async () => {
  await assert.rejects(lerImagem(null), (e) => e instanceof ErroOCR && e.tipo === 'imagem');
  await encerrarOCR();
});
