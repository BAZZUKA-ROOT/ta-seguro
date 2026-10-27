import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analisar, extrairLinks, analisarLink } from '../js/motor.js';

const ids = (r) => r.motivos.map((m) => m.id);

test('texto vazio retorna null', () => {
  assert.equal(analisar(''), null);
  assert.equal(analisar('   '), null);
});

test('mensagem normal da família não é golpe', () => {
  const r = analisar('Oi mãe, chego às 18h pro jantar. Beijo!');
  assert.equal(r.nivel, 'baixo');
  assert.equal(r.motivos.length, 0);
});

test('falso parente pedindo Pix é golpe', () => {
  const r = analisar(
    'Oi mãe, troquei de número, salva esse. Tô precisando de uma ajuda, faz um pix pra mim? Te devolvo amanhã'
  );
  assert.equal(r.nivel, 'alto');
  assert.ok(ids(r).includes('falso_parente'));
  assert.ok(ids(r).includes('pedido_dinheiro'));
  assert.ok(r.oQueFazer.some((p) => p.includes('número ANTIGO')));
});

test('pedido de código do WhatsApp é golpe', () => {
  const r = analisar('Oi, te enviei um código de 6 dígitos por engano, me passa o código por favor?');
  assert.equal(r.nivel, 'alto');
  assert.ok(ids(r).includes('codigo'));
});

test('taxa dos Correios com site falso é golpe', () => {
  const r = analisar(
    'CORREIOS: Sua encomenda está retida. Pague a taxa de importação de R$ 39,90 em https://correios-rastreio.xyz/pagar'
  );
  assert.equal(r.nivel, 'alto');
  assert.ok(r.links[0].problemas.some((p) => p.includes('Finge ser site dos Correios')));
});

test('falsa central do banco com telefone é golpe', () => {
  const r = analisar(
    'Bradesco informa: compra suspeita de R$ 2.890,00 no seu cartão. Se não reconhece, ligue para (11) 4002-8922'
  );
  assert.equal(r.nivel, 'alto');
  assert.ok(ids(r).includes('falsa_central'));
  assert.ok(ids(r).includes('ligar'));
});

test('falso sequestro é golpe', () => {
  assert.equal(analisar('Estamos com o seu filho. Se chamar a polícia ele morre.').nivel, 'alto');
});

test('AnyDesk é golpe', () => {
  assert.equal(analisar('Para cancelar a compra instale o AnyDesk e me passe o número.').nivel, 'alto');
});

test('link oficial gov.br não é marcado como falso', () => {
  const [l] = extrairLinks('Consulte em https://meu.inss.gov.br/');
  const a = analisarLink(l);
  assert.equal(a.oficialDe, 'Governo (gov.br)');
  assert.equal(a.problemas.length, 0);
});

test('link com número no lugar de letra imitando banco é falso', () => {
  const [l] = extrairLinks('acesse nub4nk-seguranca.com/login');
  assert.ok(analisarLink(l).problemas.some((p) => p.includes('Nubank')));
});

test('link encurtado é suspeito', () => {
  const r = analisar('Olha que legal bit.ly/3xYz12');
  assert.notEqual(r.nivel, 'baixo');
});

test('e-mail não é tratado como link', () => {
  assert.equal(extrairLinks('meu email é joao@gmail.com').length, 0);
});

test('prêmio com link é golpe', () => {
  const r = analisar('Parabéns! Você foi sorteado e ganhou um prêmio. Resgate seu prêmio em premiosbrasil.online');
  assert.equal(r.nivel, 'alto');
});

test('emprego fácil é pelo menos suspeito', () => {
  const r = analisar('Vaga de renda extra: ganhe R$ 300 por dia curtindo vídeos no YouTube, sem experiência');
  assert.notEqual(r.nivel, 'baixo');
});

test('desconto absurdo é suspeito', () => {
  assert.notEqual(analisar('Air Fryer com 90% de desconto só hoje!').nivel, 'baixo');
});

test('SMS legítimo de código não é golpe, mas avisa para não repassar', () => {
  const r = analisar('Seu código de verificação Nubank é 482913. Não compartilhe com ninguém.');
  assert.equal(r.nivel, 'baixo');
  assert.ok(r.oQueFazer.some((p) => p.includes('código é só seu')));
});

test('mensagens do dia a dia com "senha" ou "empresta" não são golpe', () => {
  assert.equal(analisar('Sua senha do wi-fi da casa é casa1234').nivel, 'baixo');
  assert.equal(analisar('Oi, me empresta a furadeira amanhã?').nivel, 'baixo');
});

test('variações do falso parente e emergência inventada são golpe', () => {
  assert.equal(analisar('oi tia sou eu, perdi meu celular, to com o do amigo. consegue me mandar 500 reais?').nivel, 'alto');
  assert.equal(analisar('Vovó, é seu neto! Fui preso e preciso de dinheiro pra fiança, não conta pra ninguém').nivel, 'alto');
});

test('falso gerente pedindo para instalar app é golpe', () => {
  assert.equal(analisar('Aqui é o gerente do seu banco, preciso que você instale um aplicativo').nivel, 'alto');
});

test('dica do gov.br só aparece quando o golpe usa o governo', () => {
  const correios = analisar('CORREIOS: encomenda retida, pague a taxa de importação em correios-rastreio.xyz');
  assert.ok(!correios.oQueFazer.some((p) => p.includes('gov.br')));
  const inss = analisar('INSS: seu benefício será bloqueado, atualize seus dados em inss-beneficio.online');
  assert.equal(inss.nivel, 'alto');
  assert.ok(inss.oQueFazer.some((p) => p.includes('gov.br')));
});

test('aviso de segurança com "não" não vira golpe (negação)', () => {
  const r = analisar('Dica do banco: nunca passe seu código para ninguém e não clique em links estranhos.');
  assert.equal(r.nivel, 'baixo');
});

test('texto que não parece mensagem em português fica indefinido', () => {
  assert.equal(analisar('Hello, how are you today my friend?').nivel, 'indefinido');
});

test('normalização: caractere invisível, letra cirílica e emoji entre letras', () => {
  for (const t of [
    'me passa o có​digo que chegou',
    'me passa o сódigo que chegou no seu celular',
    'me passa o c😀ó😀d😀i😀g😀o que chegou',
  ]) {
    const r = analisar(t);
    assert.equal(r.nivel, 'alto', t);
    assert.ok(ids(r).includes('codigo'), t);
  }
});

test('Pix para chave de outra pessoa é golpe', () => {
  const r = analisar('Faz um pix pra essa chave: maria.silva@gmail.com, é da minha amiga');
  assert.equal(r.nivel, 'alto');
  assert.ok(ids(r).includes('pix_terceiro'));
});

test('taxa antecipada para liberar empréstimo é golpe', () => {
  const r = analisar('Seu empréstimo foi aprovado! Para liberar, pague antes a taxa de R$ 200');
  assert.equal(r.nivel, 'alto');
  assert.ok(ids(r).includes('taxa_antecipada'));
});

test('texto muito longo é cortado e marcado como truncado', () => {
  const r = analisar('Oi mãe, tudo bem? '.repeat(400));
  assert.equal(r.truncado, true);
  assert.equal(analisar('Oi mãe, tudo bem?').truncado, false);
});

test('textos enormes e repetitivos não travam (ReDoS)', () => {
  for (const t of ['pix '.repeat(5000), '1'.repeat(20000), 'R$ 1,00 '.repeat(2500), 'ligue '.repeat(3400), '@a'.repeat(10000)]) {
    const ini = performance.now();
    analisar(t);
    assert.ok(performance.now() - ini < 100, `lento: ${t.slice(0, 10)}`);
  }
});
