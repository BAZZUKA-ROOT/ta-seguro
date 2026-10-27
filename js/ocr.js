// Leitura de prints (OCR) no próprio aparelho, com o Tesseract guardado em vendor/tesseract/.
// Nada sai do celular: script, leitor e idioma vêm do próprio site (e ficam no cache do SW).
// Importável no Node (para testar limparTextoOCR): nada de window/document no topo.

const BASE = new URL('../vendor/tesseract/', import.meta.url).href;
const LADO_MAX = 1600;      // reduz fotos grandes (celular simples trava com 12 MP)
const LADO_MENOR_MIN = 720; // mas não deixa print comprido (rolagem) estreito demais para ler
const AREA_MAX = 12e6;
const BYTES_MAX = 40 * 1024 * 1024;
const OCIOSO_MS = 60_000;

export class ErroOCR extends Error {
  constructor(tipo, mensagem, causa) {
    super(mensagem || tipo, causa ? { cause: causa } : undefined);
    this.name = 'ErroOCR';
    this.tipo = tipo; // 'imagem' | 'rede' | 'vazio' | 'outro'
  }
}

// ---------- Limpeza do texto lido (barra de status, "online", links quebrados) ----------

const TLD = '(?:com|net|org|br|xyz|top|click|online|site|shop|info|io|co|me|ly|link|app|live|vip|icu|buzz|store|cfd|sbs|cyou|tk|ml|ga|cf|gq|cc|to|ru|cn|pw|club|fun|website|space|life|ai|gd|at|id|lol|monster|rest|dev)';
const PARECE_URL = new RegExp(`^(?:https?:\\/\\/)?(?:www\\.)?(?:[a-z0-9-]+\\.)+${TLD}(?:\\.[a-z]{2})?(?:[\\/?#]\\S*)?$`, 'i');

const RUIDO = [
  /^[^\p{L}\d]*$/u,                                                  // só símbolos/emoji lidos como lixo
  /^\W*\d{1,2}[:.h]?\d{2}\b.{0,14}$/i,                               // barra de status "14:32 Eh 8/%" / hora solta "1430"
  /^\W*(online|digitando|gravando [aá]udio|visto por [uú]ltimo.*|clique aqui para dados do contato)\W*$/i,
  /^\W*(hoje|ontem|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(-feira)?\W*$/i,
  /^\W*\d{1,2} de [a-zç]+( de \d{4})?\W*$/i,                         // chip de data
  /^.{0,4}\b(digite uma mensagem|mensagem de texto|mensagem sms|mensagem de texto \(sms\)|rcs)\b.{0,8}$/i,
  /^.{0,3}[<←«].{0,40}$/,                                            // cabeçalho com seta de voltar
  /^.{0,30}(^|\s)(online|digitando\W*|visto por [uú]ltimo.*)(\s.{0,8})?$/i, // "Fulano online = o º"
  /^\W*encaminhada\W*$/i,
  /^\W*(as mensagens e as liga[cç][oõ]es s[aã]o protegidas|as mensagens s[aã]o protegidas).*$/i,
];

const HORA_NO_FIM = /\s+(?:\d{1,2}[:.]\d{2}|[—–-]\s*\w{2,4})\s*[✓✔vV/\\]*\s*$/; // "… 10:41 ✓✓" ou "— nom"
const ENCAMINHADA = /encaminhada com frequ[eê]ncia/i;

function juntarLinksQuebrados(linhas) {
  const out = [];
  for (let i = 0; i < linhas.length; i++) {
    let atual = linhas[i];
    while (i + 1 < linhas.length) {
      const ultimo = atual.match(/(\S+)$/)?.[1] ?? '';
      const prox = linhas[i + 1];
      const primeiro = prox.match(/^(\S+)/)?.[1] ?? '';
      if (!/^[a-z0-9]/.test(primeiro)) break; // continuação de link começa minúscula/dígito
      const inicioLink = /^(?:https?:\/\/|www\.)$/i.test(ultimo);
      const quebraNoMeio = /[-./]$/.test(ultimo) && /^[\w:/.-]+$/.test(ultimo) &&
        (/^(?:https?:\/\/|www\.)/i.test(ultimo) || /[-.]/.test(ultimo.slice(0, -1)) || /-$/.test(ultimo));
      if (!inicioLink && !quebraNoMeio) break;
      // só junta se o resultado (seguindo as próximas quebras) vira um endereço de verdade
      let cand = ultimo + primeiro;
      let k = i + 1;
      while (/[-./]$/.test(cand) && k + 1 < linhas.length && prox.trim() === primeiro) {
        const p2 = linhas[k + 1].match(/^(\S+)/)?.[1] ?? '';
        if (!/^[a-z0-9]/.test(p2)) break;
        cand += p2; k++;
        if (linhas[k].trim() !== p2) break;
      }
      if (!PARECE_URL.test(cand.replace(/[.,;:!?)\]]+$/, ''))) break;
      atual = atual.slice(0, atual.length - ultimo.length) + ultimo + prox; // cola sem espaço
      i++;
    }
    out.push(atual);
  }
  return out;
}

export function limparTextoOCR(bruto) {
  const t = String(bruto ?? '')
    .replace(/\bwww\s*\.\s*/gi, 'www.')                           // "www .site" → "www.site"
    .replace(/\b(https?):\s*\/\s*\/?\s*(?=[a-z0-9])/gi, '$1://')  // "https: //site", "https:/site" → "https://site"
    .replace(/([a-z0-9]-[a-z0-9-]*)\.\s+(?=(?:com|xyz|top|online|site|shop|info|store|click|live|vip|icu|net|org)\b)/gi, '$1.'); // "rastreio. xyz"
  let linhas = t.split(/\r?\n/).map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim()).filter(Boolean);
  linhas = linhas.map((l) => l.replace(HORA_NO_FIM, '').trim()).filter(Boolean);
  const encaminhada = linhas.some((l) => ENCAMINHADA.test(l));
  linhas = linhas.filter((l) => !ENCAMINHADA.test(l) && !RUIDO.some((re) => re.test(l)));
  linhas = juntarLinksQuebrados(linhas);
  // "Encaminhada com frequência" é sinal útil: fica, numa linha só, no começo.
  if (encaminhada && linhas.length) linhas.unshift('Encaminhada com frequência');
  return linhas.join('\n');
}

// ---------- Leitor (Tesseract) ----------

let scriptP = null;
function carregarTesseract() {
  if (globalThis.Tesseract) return Promise.resolve(globalThis.Tesseract);
  scriptP ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = BASE + 'tesseract.min.js';
    s.async = true;
    s.onload = () => (globalThis.Tesseract ? resolve(globalThis.Tesseract) : reject(new Error('Tesseract não carregou')));
    s.onerror = () => reject(new Error('Falha ao baixar ' + s.src));
    document.head.appendChild(s);
  }).catch((e) => {
    scriptP = null;
    document.querySelector(`script[src="${BASE}tesseract.min.js"]`)?.remove();
    throw new ErroOCR('rede', 'Não consegui baixar o leitor de prints', e);
  });
  return scriptP;
}

let workerP = null;
let aoProgressoAtual = null;
let timerOcioso = 0;

function obterWorker(T) {
  workerP ??= T.createWorker('por', 1, {
    workerPath: BASE + 'worker.min.js',
    corePath: BASE + 'core',   // URL absoluta: o worker resolve caminho relativo a ele mesmo
    langPath: BASE + 'lang',
    workerBlobURL: false,      // worker do próprio site: passa pelo SW (offline) e respeita worker-src 'self'
    cacheMethod: 'none',       // o idioma já fica no cache do SW; não duplica no IndexedDB
    logger: (m) => aoProgressoAtual?.(m),
    errorHandler: () => {},    // sem isso o Tesseract lança erro solto no onmessage
  }).catch((e) => {
    workerP = null;
    const msg = String(e?.message ?? e ?? '');
    const tipo = /wasm|webassembly|compile|memory|content security/i.test(msg) ? 'outro' : 'rede';
    throw new ErroOCR(tipo, tipo === 'rede' ? 'Não consegui baixar o leitor de prints' : 'O leitor de prints não iniciou', e);
  });
  return workerP;
}

export async function encerrarOCR() {
  clearTimeout(timerOcioso);
  const p = workerP;
  workerP = null;
  if (!p) return;
  try { await (await p).terminate(); } catch { /* já morreu */ }
}

function agendarEncerrar() {
  clearTimeout(timerOcioso);
  timerOcioso = setTimeout(() => { encerrarOCR(); }, OCIOSO_MS);
}

async function decodificar(blob) {
  if (!blob || typeof blob.size !== 'number' || blob.size === 0) throw new ErroOCR('imagem', 'Imagem vazia');
  if (blob.size > BYTES_MAX) throw new ErroOCR('imagem', 'Imagem grande demais');
  let bmp;
  try {
    bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch (e) {
    throw new ErroOCR('imagem', 'Não consegui abrir essa imagem', e); // HEIC, arquivo corrompido etc.
  }
  try {
    const { width: w, height: h } = bmp;
    if (!w || !h) throw new ErroOCR('imagem', 'Imagem sem tamanho');
    let escala = Math.min(1, LADO_MAX / Math.max(w, h));
    escala = Math.max(escala, Math.min(1, LADO_MENOR_MIN / Math.min(w, h)));
    escala = Math.min(escala, Math.sqrt(AREA_MAX / (w * h)));
    const cw = Math.max(1, Math.round(w * escala));
    const ch = Math.max(1, Math.round(h * escala));
    const cv = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(cw, ch)
      : Object.assign(document.createElement('canvas'), { width: cw, height: ch });
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; // PNG transparente vira fundo branco, não preto
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(bmp, 0, 0, cw, ch);
    return cv;
  } finally {
    bmp.close?.();
  }
}

let fila = Promise.resolve();

// Uma leitura por vez (o worker é um só).
export function lerImagem(blob, opcoes = {}) {
  const tarefa = fila.then(() => ler(blob, opcoes));
  fila = tarefa.catch(() => {});
  return tarefa;
}

async function ler(blob, { aoProgresso } = {}) {
  clearTimeout(timerOcioso);
  let ultimo = -1;
  const avisar = (f) => {
    const q = Math.floor(Math.min(1, Math.max(0, f)) * 4) / 4;
    if (q > ultimo) { ultimo = q; try { aoProgresso?.(q); } catch { /* UI não derruba a leitura */ } }
  };
  avisar(0);
  let quebrado = false;
  try {
    const imagem = await decodificar(blob);
    const T = await carregarTesseract();
    aoProgressoAtual = null;
    const w = await obterWorker(T);
    avisar(0.25);
    aoProgressoAtual = (m) => { if (m.status === 'recognizing text') avisar(0.25 + 0.75 * (m.progress || 0)); };
    let data;
    try {
      ({ data } = await w.recognize(imagem, {}, { text: true, blocks: true, hocr: false, tsv: false }));
    } catch (e) {
      quebrado = true;
      throw new ErroOCR('outro', 'Não consegui ler esse print', e);
    }
    const texto = limparTextoOCR(data?.text || '');
    if (!/[\p{L}\p{N}]/u.test(texto)) throw new ErroOCR('vazio', 'Não encontrei texto nesse print');
    const palavras = Array.isArray(data.words) ? data.words : [];
    const palavrasBoas = palavras.filter((p) => p.confidence >= 60 && /\p{L}{2,}/u.test(p.text)).length;
    avisar(1);
    return { texto, confianca: Math.round(data.confidence ?? 0), legivel: palavrasBoas >= 3, palavrasBoas };
  } catch (e) {
    if (e instanceof ErroOCR) throw e;
    quebrado = true;
    throw new ErroOCR('outro', 'Não consegui ler esse print', e);
  } finally {
    aoProgressoAtual = null;
    if (quebrado) await encerrarOCR(); // erro no leitor: não deixa worker quebrado vivo
    else if (workerP) agendarEncerrar();
  }
}
