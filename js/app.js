import { analisar, textoParaFalar } from './motor.js';
import { desarmar } from './links.js';

const $ = (id) => document.getElementById(id);
const campo = $('mensagem');
const form = $('form');
const aviso = $('aviso-entrada');
const progresso = $('progresso-ocr');
const secaoResultado = $('resultado');
const socorro = $('socorro');
const botaoPrint = $('botao-print');
const entradaPrint = $('print');

const EXEMPLOS = [
  {
    rotulo: 'Filho trocou de número',
    texto: 'Oi mãe, tudo bem? Troquei de número, salva esse aqui. Tô precisando de uma ajuda urgente, consegue fazer um pix pra mim? Te devolvo amanhã. Não posso falar agora',
  },
  {
    rotulo: 'Taxa dos Correios',
    texto: 'CORREIOS: Sua encomenda está retida por falta de pagamento da taxa de importação. Regularize em até 24 horas: https://correios-rastreio.xyz/pagar',
  },
  {
    rotulo: 'Ligação do "banco"',
    texto: 'Me ligaram dizendo que eram da central do banco. Falaram que meu cartão foi clonado, pediram para eu digitar a senha no telefone e disseram que um motoboy vem buscar o cartão.',
  },
  {
    rotulo: 'Código do WhatsApp',
    texto: 'Oi! Desculpa, te enviei um código de 6 dígitos por engano. Me passa o código que chegou aí por favor?',
  },
  {
    rotulo: 'Valores do INSS',
    texto: 'INSS: Você tem valores a receber! Seu benefício será bloqueado se não atualizar seus dados hoje. Acesse inss-beneficio.online',
  },
  {
    rotulo: 'Mensagem normal',
    texto: 'Oi vó! Amanhã eu passo aí pra almoçar, quer que eu leve pão?',
  },
];

// Ícones fixos (nunca recebem texto do usuário)
const ICONES = {
  alto: '<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="currentColor"/><path class="glifo" d="M19 19l18 18M37 19 19 37" stroke-width="5" stroke-linecap="round"/></svg>',
  medio: '<svg viewBox="0 0 56 56"><path d="M28 4 53 50H3L28 4z" fill="currentColor"/><path class="glifo" d="M28 20v14" stroke-width="5" stroke-linecap="round"/><circle class="glifo-cheio" cx="28" cy="42" r="3"/></svg>',
  baixo: '<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="currentColor"/><circle class="glifo-cheio" cx="28" cy="17" r="3.5"/><path class="glifo" d="M28 26v15" stroke-width="5" stroke-linecap="round"/></svg>',
  indefinido: '<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="currentColor"/><path class="glifo" d="M21 21a7 7 0 1 1 10 6.3c-2 1-3 2.4-3 4.7v1.5" fill="none" stroke-width="5" stroke-linecap="round"/><circle class="glifo-cheio" cx="28" cy="42" r="3.2"/></svg>',
};

const CHAVE_LETRA = 'ta-seguro-letra';
const CHAVE_CONTATO = 'ta-seguro-contato';
const CHAVE_OCR = 'ta-seguro-ocr-usado';
const CHAVE_INSTALAR = 'ta-seguro-instalar-depois';

const guardado = {
  ler(chave) { try { return localStorage.getItem(chave); } catch { return null; } },
  gravar(chave, valor) { try { localStorage.setItem(chave, valor); return true; } catch { return false; } },
  apagar(chave) { try { localStorage.removeItem(chave); } catch {} },
};

let ultimo = null;
let ultimoTexto = '';
let ultimaImagem = null;
let textoAjudaAtual = '';

function el(tag, props = {}, ...filhos) {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...filhos);
  return n;
}

function icone(d) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', d);
  p.setAttribute('fill', 'currentColor');
  s.append(p);
  return s;
}
const D_TELEFONE = 'M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z';
const D_WHATS = 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 0 1 12 4zm-3.2 4.3c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5 0 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4l-.5-.3-1.8-.9c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.3-.8-.7-1.3-1.5-1.4-1.8-.2-.2 0-.4.1-.5l.4-.5.3-.4v-.5l-.8-2c-.2-.5-.4-.4-.6-.4h-.5z';

// ---- Mensagens curtas (região aria-live discreta) ----
function avisar(texto) {
  if (aviso.textContent === texto && texto) {
    aviso.textContent = '';
    setTimeout(() => { aviso.textContent = texto; }, 60);
  } else {
    aviso.textContent = texto;
  }
}

// ---- Tamanho da letra (preferência só deste aparelho) ----
const LETRA_MAX = 2;
let letra = 0;
function aplicarLetra(n, salvar = true) {
  letra = Math.min(LETRA_MAX, Math.max(0, Number(n) || 0));
  if (letra) document.documentElement.dataset.letra = String(letra);
  else delete document.documentElement.dataset.letra;
  $('letra-menor').setAttribute('aria-disabled', String(letra === 0));
  $('letra-maior').setAttribute('aria-disabled', String(letra === LETRA_MAX));
  if (salvar) guardado.gravar(CHAVE_LETRA, String(letra));
}
aplicarLetra(guardado.ler(CHAVE_LETRA), false);
$('letra-maior').addEventListener('click', () => aplicarLetra(letra + 1));
$('letra-menor').addEventListener('click', () => aplicarLetra(letra - 1));

// ---- Entrada: colar ----
$('colar').addEventListener('click', async () => {
  avisar('Se o celular perguntar, toque em Permitir.');
  if (navigator.clipboard?.read) {
    try {
      const itens = await navigator.clipboard.read();
      for (const item of itens) {
        const tipo = item.types.find((t) => t.startsWith('image/'));
        if (tipo) return processarImagem(await item.getType(tipo));
      }
    } catch {}
  }
  try {
    const texto = await navigator.clipboard.readText();
    if (!texto.trim()) {
      avisar('Não tem nenhuma mensagem copiada. Copie a mensagem no WhatsApp primeiro (veja como logo abaixo).');
      return;
    }
    campo.value = texto;
    ultimaImagem = null;
    verificar({ origem: 'colar' });
    avisar('Mensagem colada.');
  } catch {
    avisar('Não consegui colar. Copie a mensagem no WhatsApp primeiro (veja como logo abaixo) ou toque e segure dentro da caixa e escolha Colar.');
    campo.focus();
  }
});

campo.addEventListener('input', () => {
  campo.removeAttribute('aria-invalid');
  if (!secaoResultado.hidden) esconderResultado();
});

// Imagem colada em qualquer lugar; texto colado fora da caixa vai para a caixa
document.addEventListener('paste', (e) => {
  if ($('dialogo-contato').open) return;
  const itens = [...(e.clipboardData?.items ?? [])];
  const img = itens.find((i) => i.kind === 'file' && i.type.startsWith('image/'));
  if (img) {
    const arquivo = img.getAsFile();
    if (arquivo) {
      e.preventDefault();
      processarImagem(arquivo);
    }
    return;
  }
  const alvo = e.target;
  if (alvo instanceof HTMLTextAreaElement || alvo instanceof HTMLInputElement) return;
  const texto = e.clipboardData?.getData('text/plain') ?? '';
  if (texto.trim()) {
    e.preventDefault();
    campo.value = texto;
    verificar({ origem: 'colar' });
  }
});

form.addEventListener('dragover', (e) => e.preventDefault());
form.addEventListener('drop', (e) => {
  const arquivo = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (arquivo) {
    e.preventDefault();
    processarImagem(arquivo);
  }
});

// ---- Entrada: foto da tela (lida no próprio aparelho) ----
botaoPrint.addEventListener('click', () => {
  botaoPrint.classList.remove('destaque');
  entradaPrint.click();
});
entradaPrint.addEventListener('change', () => {
  const arquivo = entradaPrint.files?.[0];
  entradaPrint.value = '';
  if (arquivo) processarImagem(arquivo);
});

// O leitor só carrega quando alguém usa um print
let moduloOCR = null;
function carregarOCR() {
  moduloOCR ??= import('./ocr.js').catch(() => {
    moduloOCR = null;
    throw Object.assign(new Error('não carregou o leitor'), { tipo: 'rede' });
  });
  return moduloOCR;
}

let timerEncerrar = 0;
function agendarEncerrarOCR() {
  clearTimeout(timerEncerrar);
  timerEncerrar = setTimeout(encerrarLeitor, 60000);
}
function encerrarLeitor() {
  moduloOCR?.then((m) => m.encerrarOCR()).catch(() => {});
}
addEventListener('pagehide', encerrarLeitor);

const MSG_ILEGIVEL = 'Não consegui ler o texto desse print. Tente um print mais nítido, ou cole ou escreva a mensagem.';
function mensagemErroOCR(e) {
  switch (e?.tipo) {
    case 'imagem': return 'Não consegui abrir essa imagem. Tire um print da tela e tente de novo.';
    case 'rede': return 'Para ler prints pela primeira vez preciso de internet. Conecte o celular à internet e tente de novo, ou cole ou escreva a mensagem.';
    case 'vazio': return MSG_ILEGIVEL;
    default: return 'Não consegui ler essa imagem. Tente outro print, ou cole ou escreva a mensagem.';
  }
}

let leituraAtual = 0;
async function processarImagem(imagem, { extra = '' } = {}) {
  const vez = ++leituraAtual;
  clearTimeout(timerEncerrar);
  esconderResultado();
  ultimaImagem = imagem;
  form.setAttribute('aria-busy', 'true');
  progresso.value = 0;
  progresso.hidden = false;
  const jaUsou = guardado.ler(CHAVE_OCR) === '1';
  avisar(jaUsou ? 'Lendo a foto da tela…' : 'Lendo a foto da tela… Na primeira vez, isso usa um pouco de internet.');

  const semTexto = (msg) => {
    if (extra) {
      campo.value = extra;
      verificar({ origem: 'colar' });
    }
    avisar(msg);
  };

  let quarto = 0;
  try {
    const { lerImagem } = await carregarOCR();
    const r = await lerImagem(imagem, {
      aoProgresso: (f) => {
        if (vez !== leituraAtual) return;
        progresso.value = Math.round(Math.min(1, Math.max(0, f)) * 100);
        const q = Math.floor(f * 4);
        if (q > quarto && q < 4) {
          quarto = q;
          avisar(`Lendo a foto da tela… ${q * 25}%`);
        }
      },
    });
    if (vez !== leituraAtual) return;
    guardado.gravar(CHAVE_OCR, '1');
    const texto = (r?.texto ?? '').trim();
    if (!texto || r.legivel === false) return semTexto(MSG_ILEGIVEL);
    campo.value = extra ? `${texto}\n\n${extra}` : texto;
    verificar({ origem: 'print' });
    avisar('Li o texto do print. Se algo estiver diferente, corrija na caixa e toque em Verificar mensagem.');
  } catch (e) {
    if (vez !== leituraAtual) return;
    semTexto(mensagemErroOCR(e));
  } finally {
    if (vez === leituraAtual) {
      progresso.hidden = true;
      form.removeAttribute('aria-busy');
      agendarEncerrarOCR();
    }
  }
}

// ---- Verificar e mostrar o resultado ----
function verificar({ origem = 'caixa', texto = campo.value } = {}) {
  let r;
  try {
    r = analisar(texto);
  } catch (e) {
    console.error(e);
    avisar('Algo deu errado ao verificar. Tente de novo.');
    return;
  }
  if (!r) {
    avisar('A caixa está vazia. Cole ou escreva a mensagem primeiro.');
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
    return;
  }
  if (origem === 'caixa' || origem === 'exemplo') avisar('');
  mostrar(r, texto.trim(), origem);
}

function cortar(s, max) {
  const cps = [...s];
  return cps.length > max ? cps.slice(0, max).join('') + '…' : s;
}

const NEUTRO = {
  link: 'Não vi nada de errado neste endereço, mas só abra se você confia em quem mandou.',
  email: 'Não vi nada de errado neste endereço, mas nunca mande senha ou dados por e-mail.',
  conversa: 'Só continue a conversa se você conhece essa pessoa.',
};

function itemLink(l) {
  const tipo = l.tipo || 'link';
  const rotulo = tipo === 'email' ? 'Endereço de e-mail:' : tipo === 'conversa' ? 'Este link abre uma conversa:' : 'Este link leva para:';
  const mostrarHost = tipo === 'email' ? l.texto : l.hostExibicao || l.host || l.texto;
  const li = el('li', {}, el('p', { className: 'link-rotulo', textContent: rotulo }), el('p', { className: 'link-host', textContent: mostrarHost || '' }));
  if (l.descricao) li.append(el('p', { className: 'link-descricao', textContent: l.descricao }));
  const problemas = Array.isArray(l.problemas) ? l.problemas : [];
  if (problemas.length) li.append(el('ul', {}, ...problemas.map((p) => el('li', { textContent: p }))));
  else if (l.oficialDe) li.append(el('p', { className: 'selo-oficial', textContent: `Site oficial de ${l.oficialDe}` }));
  else li.append(el('p', { className: 'link-neutro', textContent: NEUTRO[tipo] || NEUTRO.link }));
  return li;
}

function mostrar(r, original, origem) {
  pararFala();
  ultimo = r;
  ultimoTexto = original;
  const nivel = ICONES[r.nivel] ? r.nivel : 'indefinido';

  secaoResultado.className = `resultado ${nivel}`;
  const v = $('veredito');
  v.className = `veredito ${nivel}`;
  v.querySelector('.veredito-icone').innerHTML = ICONES[nivel];
  $('veredito-titulo').textContent = r.titulo;
  $('veredito-resumo').textContent = r.resumo;

  $('trecho').textContent = `“${cortar(original, 160)}”`;
  $('aviso-exemplo').hidden = origem !== 'exemplo';
  $('aviso-print').hidden = origem !== 'print';
  $('aviso-truncado').hidden = !r.truncado;

  const passos = r.oQueFazer ?? [];
  $('o-que-fazer').replaceChildren(...passos.map((p) => el('li', { textContent: p })));
  const motivos = r.motivos ?? [];
  $('ligar-190').hidden = !motivos.some((m) => m.id === 'sequestro');

  $('motivos').replaceChildren(
    ...motivos.map((m) => el('li', {}, el('strong', { textContent: m.titulo }), el('span', { textContent: m.explicacao })))
  );
  $('bloco-motivos').hidden = motivos.length === 0;

  const links = r.links ?? [];
  $('links').replaceChildren(...links.map(itemLink));
  $('bloco-links').hidden = links.length === 0;

  textoAjudaAtual = '';
  renderContato();
  secaoResultado.hidden = false;
  const titulo = $('veredito-titulo');
  titulo.focus({ preventScroll: true });
  titulo.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

  // Montar os links de ajuda nunca pode impedir o veredito
  try {
    atualizarAjuda();
  } catch {
    $('avisar').href = 'https://wa.me/';
  }
}

function montarTextoAjuda() {
  let trecho = '';
  try {
    trecho = cortar(desarmar(ultimoTexto), 600);
  } catch {
    trecho = '';
  }
  const inicio = `Oi! Recebi esta mensagem e o Tá Seguro? disse: "${ultimo.titulo}". Você pode me ajudar a conferir?`;
  return trecho ? `${inicio}\n\n"${trecho}"` : inicio;
}

function atualizarAjuda() {
  if (!ultimo) return;
  textoAjudaAtual = montarTextoAjuda();
  const texto = encodeURIComponent(textoAjudaAtual);
  $('avisar').href = `https://wa.me/?text=${texto}`;
  if (contato) $('whats-contato').href = `https://wa.me/55${contato.telefone}?text=${texto}`;
}

function esconderResultado() {
  pararFala();
  secaoResultado.hidden = true;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  verificar();
});

$('outra').addEventListener('click', () => {
  esconderResultado();
  campo.value = '';
  ultimaImagem = null;
  avisar('');
  window.scrollTo({ top: 0 });
  campo.focus();
});

function abrirSocorro() {
  socorro.open = true;
  socorro.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  socorro.querySelector('summary').focus({ preventScroll: true });
}
$('ja-cai').addEventListener('click', abrirSocorro);

// Pedir ajuda: se a mensagem veio de um print, manda o print junto quando o celular deixa
$('avisar').addEventListener('click', (e) => {
  if (!ultimaImagem || !navigator.canShare || !textoAjudaAtual) return;
  let arquivo;
  try {
    arquivo = new File([ultimaImagem], 'mensagem.png', { type: ultimaImagem.type || 'image/png' });
    if (!navigator.canShare({ files: [arquivo] })) return;
  } catch {
    return;
  }
  e.preventDefault();
  const href = e.currentTarget.href;
  navigator.share({ text: textoAjudaAtual, files: [arquivo] }).catch((err) => {
    if (err?.name !== 'AbortError') window.open(href, '_blank', 'noopener');
  });
});

// ---- Pessoa de confiança (fica só neste aparelho; nunca vem de link) ----
function normalizarTelefone(s) {
  let d = String(s).replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 12 || d.length === 13) d = d.slice(2); // 55 do país ou código da operadora
  if (!/^[1-9]{2}/.test(d)) return null;
  if (d.length === 10 && /[6-9]/.test(d[2])) d = d.slice(0, 2) + '9' + d.slice(2);
  if (d.length === 11) return d[2] === '9' ? d : null;
  if (d.length === 10) return /[2-5]/.test(d[2]) ? d : null;
  return null;
}
function formatarTelefone(d) {
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}

let contato = null;
try {
  const c = JSON.parse(guardado.ler(CHAVE_CONTATO) || 'null');
  if (c && typeof c.nome === 'string' && c.nome.trim() && normalizarTelefone(c.telefone)) {
    contato = { nome: c.nome.trim().slice(0, 40), telefone: normalizarTelefone(c.telefone) };
  }
} catch {}

function preencherBotao(a, d, texto) {
  a.replaceChildren(icone(d), document.createTextNode(texto));
}

function renderContato() {
  const ligar = $('ligar-contato');
  const whats = $('whats-contato');
  ligar.hidden = !contato;
  whats.hidden = !contato || contato.telefone.length !== 11;
  $('cadastrar-contato').hidden = !!contato;
  const caixaSocorro = $('socorro-contato');
  if (!contato) {
    caixaSocorro.replaceChildren();
    return;
  }
  ligar.href = `tel:+55${contato.telefone}`;
  preencherBotao(ligar, D_TELEFONE, `Ligar para ${contato.nome}`);
  preencherBotao(whats, D_WHATS, `Mandar para ${contato.nome} no WhatsApp`);
  if (!textoAjudaAtual) whats.href = `https://wa.me/55${contato.telefone}`;
  const ligarSocorro = el('a', { className: 'botao principal', href: `tel:+55${contato.telefone}` });
  preencherBotao(ligarSocorro, D_TELEFONE, `Ligar para ${contato.nome}`);
  caixaSocorro.replaceChildren(ligarSocorro);
}

const dialogo = $('dialogo-contato');
const campoNome = $('contato-nome');
const campoTel = $('contato-telefone');
const erroContato = $('contato-erro');

function abrirDialogoContato() {
  campoNome.value = contato?.nome ?? '';
  campoTel.value = contato ? formatarTelefone(contato.telefone) : '';
  erroContato.textContent = '';
  campoTel.removeAttribute('aria-invalid');
  $('contato-apagar').hidden = !contato;
  if (typeof dialogo.showModal === 'function') dialogo.showModal();
  else dialogo.setAttribute('open', '');
  campoNome.focus();
}
function fecharDialogoContato() {
  if (typeof dialogo.close === 'function') dialogo.close();
  else dialogo.removeAttribute('open');
}

$('form-contato').addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = campoNome.value.trim().replace(/\s+/g, ' ').slice(0, 40);
  const telefone = normalizarTelefone(campoTel.value);
  if (!nome) {
    erroContato.textContent = 'Escreva o nome da pessoa.';
    campoNome.focus();
    return;
  }
  if (!telefone) {
    erroContato.textContent = 'Confira o número. Escreva o DDD e o celular, por exemplo: (11) 98765-4321.';
    campoTel.setAttribute('aria-invalid', 'true');
    campoTel.focus();
    return;
  }
  contato = { nome, telefone };
  const salvou = guardado.gravar(CHAVE_CONTATO, JSON.stringify(contato));
  fecharDialogoContato();
  renderContato();
  try { atualizarAjuda(); } catch {}
  avisar(salvou ? `Pronto! ${nome} é a sua pessoa de confiança.` : `Pronto! ${nome} ficou guardada só até fechar o app.`);
});
$('contato-cancelar').addEventListener('click', fecharDialogoContato);
$('contato-apagar').addEventListener('click', () => {
  contato = null;
  guardado.apagar(CHAVE_CONTATO);
  fecharDialogoContato();
  renderContato();
  if (ultimo) atualizarAjuda();
});
$('cadastrar-contato').addEventListener('click', abrirDialogoContato);
$('rodape-contato').addEventListener('click', abrirDialogoContato);
renderContato();

// ---- Ouvir a resposta ----
const botaoOuvir = $('ouvir');
const rotuloOuvir = botaoOuvir.querySelector('span');
const temVoz = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let vozPt = null;
let falando = false;
let falaId = 0;

function escolherVoz() {
  let vozes = [];
  try { vozes = speechSynthesis.getVoices(); } catch {}
  const lingua = (v) => (v.lang || '').replace('_', '-').toLowerCase();
  vozPt =
    vozes.find((v) => lingua(v) === 'pt-br' && v.localService) ||
    vozes.find((v) => lingua(v) === 'pt-br') ||
    vozes.find((v) => lingua(v).startsWith('pt')) ||
    null;
  botaoOuvir.hidden = !vozPt;
}
if (temVoz) {
  escolherVoz();
  if (typeof speechSynthesis.addEventListener === 'function') speechSynthesis.addEventListener('voiceschanged', escolherVoz);
  else speechSynthesis.onvoiceschanged = escolherVoz;
}

function marcarFalando(sim) {
  falando = sim;
  rotuloOuvir.textContent = sim ? 'Parar de falar' : 'Ouvir a resposta';
}

function pararFala() {
  falaId++;
  if (temVoz) try { speechSynthesis.cancel(); } catch {}
  marcarFalando(false);
}

// Siglas que devem ser soletradas; o resto em CAIXA ALTA vira minúscula
const SIGLAS = new Set(['INSS', 'CPF', 'CNPJ', 'SMS', 'CNH', 'RG', 'FGTS', 'IPVA', 'IPTU', 'CEP', 'SUS', 'MED', 'PM', 'DDD', 'SPC', 'BO']);
function frasesParaFalar(texto) {
  const limpo = texto.replace(/(?<!\p{L})\p{Lu}{2,}(?!\p{L})/gu, (p) => (SIGLAS.has(p) ? p : p.toLocaleLowerCase('pt-BR')));
  const frases = [];
  for (const f of limpo.split(/(?<=[.!?…:])\s+/u)) {
    if (f.length <= 220) frases.push(f);
    else frases.push(...f.split(/(?<=[,;])\s+/u));
  }
  return frases.map((f) => f.trim()).filter(Boolean);
}

function falar(r) {
  const frases = frasesParaFalar(textoParaFalar(r) || '');
  if (!frases.length || !vozPt) return;
  pararFala();
  const id = falaId;
  frases.forEach((f, i) => {
    const u = new SpeechSynthesisUtterance(f);
    u.lang = vozPt.lang || 'pt-BR';
    u.voice = vozPt;
    u.rate = 0.9;
    const fim = () => { if (id === falaId) marcarFalando(false); };
    if (i === frases.length - 1) u.onend = fim;
    u.onerror = (ev) => { if (ev.error !== 'interrupted' && ev.error !== 'canceled') fim(); };
    speechSynthesis.speak(u);
  });
  marcarFalando(true);
}

botaoOuvir.addEventListener('click', () => {
  if (falando) pararFala();
  else if (ultimo) falar(ultimo);
});

// ---- Exemplos (não apagam o que a pessoa escreveu) ----
$('exemplos').append(
  ...EXEMPLOS.map((ex) =>
    el('button', {
      type: 'button',
      textContent: ex.rotulo,
      onclick: () => {
        const atual = campo.value.trim();
        if (!atual || EXEMPLOS.some((e) => e.texto === atual)) {
          campo.value = ex.texto;
          verificar({ origem: 'exemplo' });
        } else {
          verificar({ origem: 'exemplo', texto: ex.texto });
        }
      },
    })
  )
);

// ---- Instalar o app ----
const cartaoInstalar = $('instalar');
const botaoInstalar = $('botao-instalar');
let pedidoInstalar = null;
const jaInstalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const dispensouInstalar = () => guardado.ler(CHAVE_INSTALAR) === '1';

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pedidoInstalar = e;
  if (jaInstalado() || dispensouInstalar()) return;
  botaoInstalar.hidden = false;
  cartaoInstalar.hidden = false;
});
botaoInstalar.addEventListener('click', async () => {
  if (!pedidoInstalar) return;
  const pedido = pedidoInstalar;
  pedidoInstalar = null;
  try {
    await pedido.prompt();
    await pedido.userChoice;
  } catch {}
  cartaoInstalar.hidden = true;
});
addEventListener('appinstalled', () => {
  pedidoInstalar = null;
  cartaoInstalar.hidden = true;
});
$('instalar-depois').addEventListener('click', () => {
  guardado.gravar(CHAVE_INSTALAR, '1');
  cartaoInstalar.hidden = true;
});
const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (ehIOS && !jaInstalado() && !dispensouInstalar()) {
  $('instalar-ios').hidden = false;
  cartaoInstalar.hidden = false;
}

// ---- Compartilhado pelo celular e atalhos do ícone ----
async function receberCompartilhado() {
  let texto = '';
  let imagem = null;
  try {
    const cache = await caches.open('ta-seguro-compartilhado');
    const chaveTexto = new URL('compartilhado/texto', location.href).href;
    const chaveImagem = new URL('compartilhado/imagem', location.href).href;
    const [rt, ri] = await Promise.all([cache.match(chaveTexto), cache.match(chaveImagem)]);
    if (rt) texto = (await rt.text()).trim();
    if (ri) imagem = await ri.blob();
    await Promise.all([cache.delete(chaveTexto), cache.delete(chaveImagem)]);
  } catch {}
  if (imagem?.size) {
    processarImagem(imagem, { extra: texto });
  } else if (texto) {
    campo.value = texto;
    verificar({ origem: 'colar' });
  } else {
    avisar('Não recebi a mensagem compartilhada. Tente de novo, ou cole a mensagem aqui.');
  }
}

async function tratarEndereco() {
  let params;
  try { params = new URLSearchParams(location.search); } catch { return; }
  const acao = params.get('acao');
  const compartilhado = params.has('compartilhado');
  if (acao || compartilhado) {
    try { history.replaceState(null, '', location.pathname + location.hash); } catch {}
  }
  if (compartilhado) await receberCompartilhado();
  else if (acao === 'colar') {
    campo.focus();
    avisar('Toque em Colar mensagem, ou toque e segure dentro da caixa e escolha Colar.');
  } else if (acao === 'print') {
    botaoPrint.classList.add('destaque');
    botaoPrint.focus();
    avisar('Toque em Usar foto da tela para escolher o print.');
  } else if (acao === 'socorro' || location.hash === '#socorro') {
    abrirSocorro();
  }
}
tratarEndereco();

// ---- Funciona sem internet depois da primeira visita ----
try {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
} catch {}
