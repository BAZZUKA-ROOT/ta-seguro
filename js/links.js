// Análise de links do Tá Seguro?: extrai endereços do texto (mesmo quebrados pelo print ou
// "desarmados") e procura sinais de site falso. Roda 100% local (navegador ou Node).

const LIMITE_TEXTO = 20000;

const CONFUNDIVEIS = {
  'а': 'a', 'в': 'b', 'е': 'e', 'ё': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x',
  'ѕ': 's', 'і': 'i', 'ї': 'i', 'ј': 'j', 'ԁ': 'd', 'ɡ': 'g', 'ӏ': 'l', 'ү': 'y', 'һ': 'h', 'ԛ': 'q', 'ԝ': 'w', 'ս': 'u', 'օ': 'o',
  'ο': 'o', 'α': 'a', 'ν': 'v', 'ι': 'i', 'κ': 'k', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x', 'ε': 'e', 'ı': 'i', 'ɩ': 'i', 'ℓ': 'l',
};

// ---------- Marcas ----------
// nomes: >=5 letras aceitam composição (marca+palavra de golpe) e erro de digitação.
// curtos: siglas ou nomes curtos; só contam como pedaço inteiro do endereço.
// palavras: nomes que também são palavras comuns (vivo, claro...): só contam como rótulo inteiro
//           ou ao lado de uma palavra típica de golpe (vivo-fatura, claro-pontos).
// plataforma: o domínio é verdadeiro, mas qualquer pessoa publica nele (vídeo, perfil, anúncio):
//             não acusa imitação nem mostra selo de oficial.
// semVariante: órgão público só usa .gov.br/.jus.br; "inss.com" é sempre falso.
export const MARCAS = [
  { nome: 'Correios', de: 'dos', nomes: ['correios'], curtos: ['correio'], oficiais: ['correios.com.br'] },
  { nome: 'Caixa', de: 'da', nomes: ['caixa', 'caixatem'], curtos: ['cef'], oficiais: ['caixa.gov.br'] },
  { nome: 'Banco do Brasil', de: 'do', nomes: ['bancodobrasil', 'bancobrasil'], curtos: ['bb', 'bbrasil'], oficiais: ['bb.com.br', 'bancodobrasil.com.br'] },
  { nome: 'Bradesco', de: 'do', nomes: ['bradesco'], oficiais: ['bradesco.com.br', 'bradesco', 'bradescoseguros.com.br'] },
  { nome: 'Itaú', de: 'do', nomes: ['itaucard', 'itauunibanco'], curtos: ['itau'], oficiais: ['itau.com.br', 'itau.com'] },
  { nome: 'Nubank', de: 'do', nomes: ['nubank'], curtos: ['nu'], oficiais: ['nubank.com.br', 'nu.com.br'] },
  { nome: 'Santander', de: 'do', nomes: ['santander'], oficiais: ['santander.com.br', 'santander.com'] },
  { nome: 'Banco Inter', de: 'do', nomes: ['bancointer'], palavras: ['inter'], oficiais: ['bancointer.com.br', 'inter.co'] },
  { nome: 'C6 Bank', de: 'do', nomes: ['c6bank'], curtos: ['c6'], oficiais: ['c6bank.com.br'] },
  { nome: 'Sicoob', de: 'do', nomes: ['sicoob'], oficiais: ['sicoob.com.br'] },
  { nome: 'Sicredi', de: 'do', nomes: ['sicredi'], oficiais: ['sicredi.com.br'] },
  { nome: 'BTG Pactual', de: 'do', nomes: ['btgpactual'], curtos: ['btg'], oficiais: ['btgpactual.com'] },
  { nome: 'PagBank', de: 'do', nomes: ['pagbank', 'pagseguro'], oficiais: ['pagbank.com.br', 'pagseguro.com.br', 'pagseguro.uol.com.br'] },
  { nome: 'PicPay', de: 'do', nomes: ['picpay'], oficiais: ['picpay.com'] },
  { nome: 'Mercado Livre', de: 'do', nomes: ['mercadolivre', 'mercadopago', 'mercadolibre'], oficiais: ['mercadolivre.com.br', 'mercadopago.com.br', 'mercadolivre.com', 'mercadolibre.com', 'mercadopago.com'] },
  { nome: 'Governo (gov.br)', de: 'do', nomes: ['govbr', 'meuinss', 'receitafederal', 'detran', 'valoresareceber', 'valoresreceber', 'cadunico', 'bolsafamilia', 'cnhsocial', 'desenrola', 'sougov', 'bancocentral'], curtos: ['gov', 'inss', 'fgts', 'cnh', 'bcb', 'pix', 'sus', 'cpf'], oficiais: ['gov.br'], semVariante: true },
  { nome: 'Justiça', de: 'da', nomes: ['tribunal', 'justica'], curtos: ['tjsp', 'tjrj', 'tjmg', 'tjpr', 'tjrs', 'tjba', 'pje', 'cnj', 'stf', 'stj', 'trf'], oficiais: ['jus.br'], semVariante: true },
  { nome: 'Serasa', de: 'da', nomes: ['serasa'], oficiais: ['serasa.com.br', 'serasaexperian.com.br', 'serasaconsumidor.com.br'] },
  { nome: 'Livelo', de: 'da', nomes: ['livelo'], oficiais: ['livelo.com.br'] },
  { nome: 'Magalu', de: 'da', nomes: ['magalu', 'magazineluiza'], oficiais: ['magazineluiza.com.br', 'magalu.com'] },
  { nome: 'Shopee', de: 'da', nomes: ['shopee'], oficiais: ['shopee.com.br', 'shopee.com'] },
  { nome: 'Americanas', de: 'das', nomes: ['americanas'], oficiais: ['americanas.com.br'] },
  { nome: 'Netflix', de: 'da', nomes: ['netflix'], oficiais: ['netflix.com'] },
  { nome: 'WhatsApp', de: 'do', nomes: ['whatsapp'], curtos: ['zap'], oficiais: ['whatsapp.com', 'whatsapp.net'] },
  { nome: 'Vivo', de: 'da', palavras: ['vivo'], oficiais: ['vivo.com.br'] },
  { nome: 'Claro', de: 'da', palavras: ['claro'], oficiais: ['claro.com.br'] },
  { nome: 'TIM', de: 'da', palavras: ['tim'], oficiais: ['tim.com.br'] },
  { nome: 'Oi', de: 'da', palavras: ['oi'], oficiais: ['oi.com.br'] },
  { nome: 'Enel', de: 'da', curtos: ['enel'], oficiais: ['enel.com.br'] },
  { nome: 'Sabesp', de: 'da', nomes: ['sabesp'], oficiais: ['sabesp.com.br'] },
  { nome: 'Cemig', de: 'da', nomes: ['cemig'], oficiais: ['cemig.com.br'] },
  { nome: 'Light', de: 'da', palavras: ['light'], oficiais: ['light.com.br'] },
  { nome: 'Copel', de: 'da', nomes: ['copel'], oficiais: ['copel.com'] },
  { nome: 'Sanepar', de: 'da', nomes: ['sanepar'], oficiais: ['sanepar.com.br'] },
  { nome: 'Acordo Certo', de: 'do', nomes: ['acordocerto'], oficiais: ['acordocerto.com.br'] },
  { nome: 'Spotify', de: 'do', nomes: ['spotify'], oficiais: ['spotify.com'] },
  { nome: 'OLX', de: 'da', curtos: ['olx'], oficiais: ['olx.com.br'] },
  { nome: 'Amazon', de: 'da', nomes: ['amazon'], oficiais: ['amazon.com.br', 'amazon.com'], plataforma: true },
  { nome: 'Shein', de: 'da', nomes: ['shein'], oficiais: ['shein.com'] },
  { nome: 'AliExpress', de: 'do', nomes: ['aliexpress'], oficiais: ['aliexpress.com'] },
  { nome: 'iFood', de: 'do', nomes: ['ifood'], oficiais: ['ifood.com.br'] },
  { nome: 'Uber', de: 'da', curtos: ['uber'], oficiais: ['uber.com'] },
  { nome: '99', de: 'da', nomes: ['99app', '99pay', '99taxi'], oficiais: ['99app.com'] },
  { nome: 'Google', de: 'do', nomes: ['google', 'gmail', 'youtube'], oficiais: ['google.com', 'google.com.br', 'gmail.com', 'youtube.com', 'youtu.be', 'maps.app.goo.gl', 'g.co'], plataforma: true },
  { nome: 'Apple', de: 'da', nomes: ['apple', 'icloud', 'appleid'], oficiais: ['apple.com', 'icloud.com'] },
  { nome: 'Microsoft', de: 'da', nomes: ['microsoft', 'outlook', 'hotmail', 'office365', 'onedrive'], oficiais: ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'hotmail.com', 'microsoftonline.com'] },
  { nome: 'Instagram', de: 'do', nomes: ['instagram'], oficiais: ['instagram.com'], plataforma: true },
  { nome: 'Facebook', de: 'do', nomes: ['facebook'], curtos: ['fb'], oficiais: ['facebook.com', 'fb.com', 'fb.me', 'meta.com'], plataforma: true },
  { nome: 'Telegram', de: 'do', nomes: ['telegram'], oficiais: ['telegram.org'] },
  { nome: 'Caixa Seguradora', de: 'da', oficiais: ['caixaseguradora.com.br'] },
];

// Sites conhecidos que contêm nome de marca mas não são golpe (jornais, institutos, empresas do grupo).
const CONHECIDOS = new Set([
  'correiobraziliense.com.br', 'correiodopovo.com.br', 'correio24horas.com.br', 'itaucultural.org.br',
  'globo.com', 'picpay.com.br', 'santanderfinanciamentos.com.br', 'uol.com.br', 'estadao.com.br', 'folha.uol.com.br', 'r7.com',
  'terra.com.br', 'cnnbrasil.com.br', 'metropoles.com', 'wikipedia.org', 'tudogostoso.com.br',
]);

// Palavras que, coladas à marca, denunciam golpe (nubank-cliente, correiosrastreio, meuinss).
const AFIXOS = new Set(('br brasil online app web net com digital oficial seguro segura seguranca cliente clientes conta contas ' +
  'acesso acessar login entrar atendimento suporte sac central ajuda consulta consultar regulariza regularizar atualiza ' +
  'atualizar atualizacao desbloqueio desbloquear valores receber pix cartao cartoes cadastro pontos premio premios premiado ' +
  'premiada cupom cupons brinde brindes promo promocao oferta ofertas loja store shop rastreio rastreamento rastrear encomenda ' +
  'encomendas entrega entregas taxa taxas pagamento pagamentos pagar fatura faturas boleto boletos beneficio beneficios auxilio ' +
  'restituicao token verificacao verifica validar valida meu minha seu sua portal gov tem servicos servico info id 2via ' +
  'segundavia debito debitos multa multas reembolso devolucao resgate resgatar bonus cashback sorteio agencia bank banco mobile ' +
  'internet internetbanking ib pf pj sms aviso alerta notifica notificacao pendencia pendente recarga plano planos ' +
  'cpf processo intimacao social www site sistema acesse clique entre veja marketplace leilao leiloes').split(' ').map((w) => esqueleto(w)));

export const ENCURTADORES = new Set([
  'bit.ly', 'bitly.com', 'tinyurl.com', 'cutt.ly', 'encurtador.com.br', 'is.gd', 't.co', 'rebrand.ly', 'shorturl.at',
  's.id', 'rb.gy', 'tiny.cc', 'ow.ly', 'abre.ai', 'l1nk.dev', 'v.gd', 'bit.do', 'goo.su', 'clck.ru', 'u.to',
  'l.ead.me', 'linktr.ee', 'surl.li', 'shre.ink', 't.ly', 'qrco.de', 'n9.cl', 'short.gy', 'tiny.one', 'me-qr.com',
  'kutt.it', 'lnkd.in', 'goo.gl', 'x.gd', '1url.com.br', 'migre.me', 'bl.ink', 'buff.ly', 'dlvr.it', 'ift.tt', 'adf.ly',
  'ouo.io', 'shorte.st', 'bc.vc', 'soo.gd', 'cutt.us', 'encr.pw',
]);

// Serviços onde qualquer pessoa cria um site de graça (o "dono" é o pedaço antes deles).
const HOSPEDAGEM = [
  'web.app', 'firebaseapp.com', 'vercel.app', 'netlify.app', 'github.io', 'gitlab.io', 'pages.dev', 'workers.dev',
  'glitch.me', 'herokuapp.com', 'onrender.com', 'repl.co', 'replit.app', 'blogspot.com', 'wixsite.com', 'weebly.com',
  '000webhostapp.com', 'webflow.io', 'carrd.co', 'godaddysites.com', 'square.site', 'ngrok-free.app', 'ngrok.io',
  'ngrok.app', 'trycloudflare.com', 'loca.lt', 'azurewebsites.net', 'firebasestorage.googleapis.com',
  'storage.googleapis.com', 's3.amazonaws.com', 'r2.dev', 'surge.sh', 'wordpress.com', 'sites.google.com',
  'my.canva.site', 'canva.site', 'notion.site', 'jimdosite.com', 'mystrikingly.com',
];
const FORMULARIOS = ['forms.gle', 'docs.google.com/forms', 'forms.office.com', 'typeform.com', 'jotform.com'];

const TLDS_SUSPEITOS = new Set(('xyz top click online site shop icu buzz live vip monster rest cfd sbs cyou info tk ml ga cf gq pw ' +
  'fun space website store lol qpon ink win bid loan work zip mov digital help support cam lat today su bond autos boats homes ' +
  'quest surf bar best link gdn men date faith racing review stream trade party science download accountant cricket kim country ' +
  'host press uno beauty hair skin makeup motorcycles yachts mom').split(' '));

// TLDs aceitos sem "http" na frente (fora isso, só com http:// ou www.).
const TLDS_SEM_ESQUEMA = new Set([...TLDS_SUSPEITOS, ...('com net org br gov edu biz pro mobi app dev io co me ly ai gd at id cc to ' +
  'ru cn us uk de fr es it pt ar mx cl club life world news blog page one tech cloud email global group ' +
  'community network company contact shopping coupons tv ws la sh gg im foo bet gift gifts gratis promo sale cash money finance ' +
  'loans credit tax claims delivery express center agency services solutions systems tips tools zone plus run team fyi new ' +
  'name asia tel jobs travel games casino poker bingo lotto tickets events studio media video social chat market marketing ' +
  'deals discount cheap exchange trading ltd inc llc vin wiki works ninja guru rocks wtf how biz bradesco itau').split(' ')]);

// ccTLDs que também são palavras do português digitadas sem espaço depois do ponto ("tchau.me", "cheguei.to").
const TLD_PALAVRA = new Set(['me', 'to', 'ai', 'so', 'de', 'do', 'no', 'na', 'se', 'la', 'es', 'eu', 'tu', 'ir', 'pe', 'ma', 'ao', 'as', 'co']);
const PREPOSICOES = new Set(['no', 'na', 'nos', 'nas', 'pro', 'pra', 'pelo', 'pela', 'do', 'da', 'dos', 'das', 'ao', 'a', 'o', 'e', 'com', 'em']);

const SEGUNDO_NIVEL_BR = new Set(('adm adv agr am arq art ato bio blog bmd cim cng cnt com coop ecn eco edu emp eng esp etc eti far flog fm fnd fot fst ' +
  'g12 ggf gov imb ind inf jor jus leg lel mat med mil mp mus net nom not ntr odo org ppg pro psc psi qsl rec slg srv taxi teo tmp ' +
  'trd tur tv vet vlog wiki zlg app def').split(' '));



export function esqueleto(s) {
  let r = '';
  for (const ch of s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()) r += CONFUNDIVEIS[ch] ?? ch;
  return r
    .replace(/rn/g, 'm').replace(/vv/g, 'w')
    .replace(/[1l|!]/g, 'i').replace(/0/g, 'o').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/@/g, 'a').replace(/\$/g, 's');
}

// ---------- Punycode (RFC 3492), para ler "xn--" ----------
function adapt(delta, n, first) {
  let k = 0;
  delta = first ? Math.floor(delta / 700) : delta >> 1;
  delta += Math.floor(delta / n);
  for (; delta > 455; k += 36) delta = Math.floor(delta / 35);
  return Math.floor(k + (36 * delta) / (delta + 38));
}
export function punyDecode(label) {
  if (!label.startsWith('xn--')) return label;
  const input = label.slice(4);
  const out = [];
  let b = input.lastIndexOf('-');
  if (b < 0) b = 0;
  for (let j = 0; j < b; j++) out.push(input.charCodeAt(j));
  let n = 128, bias = 72, i = 0;
  for (let idx = b > 0 ? b + 1 : 0; idx < input.length; ) {
    const oldi = i;
    let w = 1;
    for (let k = 36; ; k += 36) {
      if (idx >= input.length) return label;
      const c = input.charCodeAt(idx++);
      const d = c >= 48 && c <= 57 ? c - 22 : c >= 97 && c <= 122 ? c - 97 : c >= 65 && c <= 90 ? c - 65 : 99;
      if (d >= 36) return label;
      i += d * w;
      const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
      if (d < t) break;
      w *= 36 - t;
    }
    bias = adapt(i - oldi, out.length + 1, oldi === 0);
    n += Math.floor(i / (out.length + 1));
    i %= out.length + 1;
    out.splice(i++, 0, n);
  }
  try { return String.fromCodePoint(...out); } catch { return label; }
}

// ---------- Distância de edição "visual" ----------
const PARES = new Set(['mn', 'nm', 'ck', 'kc', 'sz', 'zs', 'uv', 'vu', 'gq', 'qg', 'ij', 'ji', 'nh', 'hn']);
// Optimal String Alignment; em marcas até 8 letras, troca de letra só vale entre letras parecidas
// e letra a mais só vale se for repetida (bradescco, corrreios).
function distancia(a, b, restrito) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j * (restrito ? 2 : 1);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const igual = a[i - 1] === b[j - 1];
      const sub = igual ? 0 : !restrito || PARES.has(a[i - 1] + b[j - 1]) ? 1 : 2;
      const ins = !restrito || b[j - 1] === b[j - 2] || b[j - 1] === b[j] ? 1 : 2; // b tem letra a mais
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + ins, d[i - 1][j - 1] + sub);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

// ---------- Domínio ----------
function sufixoHospedagem(host) {
  return HOSPEDAGEM.find((h) => host === h || host.endsWith('.' + h));
}
export function dominioRegistravel(host) {
  const hosp = sufixoHospedagem(host);
  if (hosp && host !== hosp) {
    const resto = host.slice(0, -hosp.length - 1).split('.');
    return resto.at(-1) + '.' + hosp;
  }
  const p = host.split('.');
  if (p.length >= 3 && p.at(-1) === 'br' && SEGUNDO_NIVEL_BR.has(p.at(-2))) return p.slice(-3).join('.');
  if (p.length >= 3 && p.at(-1).length === 2 && ['com', 'net', 'org', 'gov', 'edu', 'co'].includes(p.at(-2))) return p.slice(-3).join('.');
  return p.slice(-2).join('.');
}
const ehDe = (host, d) => host === d || host.endsWith('.' + d);

// ---------- Extração ----------
function reparar(t) {
  let s = String(t)
    .replace(/[．。｡]/g, '.')
    .replace(/(?<=[\p{L}\p{N}])[‐‑‒–—―−](?=[\p{L}\p{N}])/gu, '-')
    .replace(/\bh(?:xx|\*\*|XX)p(s?)(?=:)/gi, 'http$1')
    .replace(/\s*(?:\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\)|\[ponto\]|\(ponto\))\s*/gi, '.')
    .replace(/\b(https?)\s*:\s*\/\s*\/\s*/gi, '$1://')
    .replace(/\b(https?):\/(?=[\p{L}\p{N}])/giu, '$1://')
    .replace(/(^|[\s(])\/\/(?=[\p{L}\p{N}][\p{L}\p{N}-]{0,63}\.)/gu, '$1http://')
    .replace(/\bwww\s*\.\s+(?=[\p{L}\p{N}])/giu, 'www.');
  // link quebrado em duas linhas pelo print: junta se a linha termina em - . ou /
  for (let k = 0; k < 4; k++) {
    const antes = s;
    s = s.replace(/((?:https?:\/\/|www\.)[^\s]{0,300}[-.\/])[ \t]{0,20}\r?\n[ \t]{0,20}(?=[\p{L}\p{N}])/giu, '$1');
    s = s.replace(/(?<![\p{L}\p{N}.-])([\p{L}\p{N}][\p{L}\p{N}.-]{0,253}-)[ \t]{0,20}\r?\n[ \t]{0,20}(?=[\p{L}\p{N}][\p{L}\p{N}-]{0,63}\.\p{L}{2,63})/gu, '$1');
    if (s === antes) break;
  }
  // "site-golpe . online", "site-golpe. com/pagar", "www.site .com"
  s = s.replace(/(?<![\p{L}\p{N}.-])((?:www\.)?[\p{L}\p{N}]{1,63}(?:-[\p{L}\p{N}]{1,63}){1,10}|www\.[\p{L}\p{N}-]{1,63})\s{0,5}\.\s{1,5}(com|net|org|br|online|site|xyz|top|app|shop|store|info|click|live|vip)\b/giu, '$1.$2');
  s = s.replace(/(?<![\p{L}\p{N}.-])((?:www\.)?[\p{L}\p{N}-]{1,63})\s{1,5}\.\s{0,5}(com|net|org|br|online|site|xyz|top|app|shop|store|info|click|live|vip)\b/giu, (m, a, b) => (/www\.|-/.test(a) ? `${a}.${b}` : m));
  s = s.replace(/(?<![\p{L}\p{N}.-])([\p{L}\p{N}]{1,63}(?:-[\p{L}\p{N}]{1,63}){1,10})\.\s{1,5}(com|net|org|br)(?=\/)/giu, '$1.$2');
  // OCR: ,com  .c0m  .corn
  s = s.replace(/((?:https?:\/\/|www\.)[^\s,]{1,300}),(?=(?:com|net|org|br|xyz|online|site|top)\b)/gi, '$1.');
  s = s.replace(/\.c(?:0m|orn)(?=$|[\s\/?#.,;:!)])/gi, '.com');
  return s;
}

const CANDIDATO = /(?<![\p{L}\p{N}@.\-\/])(?<![\p{L}\p{N}.\-]_)(?:(?:https?:\/\/|www\.)[^\s<>"'`]{1,2048}|\d{1,3}(?:\.\d{1,3}){3}(?::\d{1,5})?\/[^\s<>"'`]{0,2048}|[\p{L}\p{N}][\p{L}\p{N}._\-]{0,253}\.\p{L}{2,63}(?![\p{L}\p{N}\-])(?::\d{1,5})?(?:[\/?#][^\s<>"'`]{0,2048})?)/giu;
const EMAIL = /(?<![\p{L}\p{N}.+_-])[\p{L}\p{N}._+-]{1,64}@([\p{L}\p{N}-]{1,63}(?:\.[\p{L}\p{N}-]{1,63}){1,8})/gu;
const WEBMAIL = new Set(['gmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com', 'yahoo.com.br', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'icloud.com', 'ig.com.br', 'globo.com', 'globomail.com']);

// "javascript:..." e "data:text/html,..." no lugar de um site
const ESPECIAL = /(?<![\p{L}\p{N}])(?:javascript:[^\s<>"'`]{1,300}|data:(?:text\/html|application\/[\w.+-]{1,40}|image\/svg\+xml)[;,][^\s<>"'`]{0,300})/giu;
const ANTES_DE_ARQUIVO = new Set(['arquivo', 'anexo', 'documento', 'planilha', 'foto', 'imagem', 'video', 'vídeo', 'pdf']);

function formatarTelefone(n) {
  if (/^55\d{10,11}$/.test(n)) return `+55 ${n.slice(2, 4)} ${n.slice(4, -4)}-${n.slice(-4)}`;
  return '+' + n;
}

// wa.me, api.whatsapp.com/send e t.me abrem uma conversa, não um site.
function conversa(host, url) {
  const caminho = url.pathname.replace(/\/+$/, '');
  if (host === 'wa.me') {
    const num = caminho.slice(1).replace(/\D/g, '');
    if (/^\d{8,15}$/.test(num)) return `Abre uma conversa no WhatsApp com ${formatarTelefone(num)}`;
    return 'Abre uma conversa no WhatsApp com uma pessoa ou empresa';
  }
  if (host === 'api.whatsapp.com' && /^\/send$/i.test(caminho)) {
    const num = (url.searchParams.get('phone') || '').replace(/\D/g, '');
    if (/^\d{8,15}$/.test(num)) return `Abre uma conversa no WhatsApp com ${formatarTelefone(num)}`;
    return 'Abre uma conversa no WhatsApp com uma pessoa ou empresa';
  }
  if (host === 't.me' || host === 'telegram.me') {
    const p = caminho.slice(1).split('/')[0];
    if (/^\+\d{8,15}$/.test(p)) return `Abre uma conversa no Telegram com ${formatarTelefone(p.slice(1))}`;
    if (/^(\+|joinchat$)/.test(p)) return 'Abre um convite para um grupo do Telegram';
    if (/^[A-Za-z][\w]{3,31}$/.test(p)) return `Abre uma conversa no Telegram com @${p}`;
    return 'Abre o Telegram';
  }
  return null;
}

// Decide se um trecho achado por CANDIDATO é mesmo um endereço; devolve o link ou null.
function lerCandidato(s, m) {
  if (s[m.index + m[0].length] === '@') return null; // parte de e-mail
  const bruto = m[0].replace(/[.,;:!?)\]}>'"…*_~]+$/u, '').slice(0, 2048);
  // "nubank.com.br\@golpe.xyz": cada programa lê de um jeito; vale o que vem depois do @
  const barraTruque = /^(?:https?:\/\/)?[^\/?#@\\]{1,253}\\[^\/?#]{0,253}@/i.test(bruto);
  const temEsquema = /^https?:\/\//i.test(bruto);
  const comWww = /^www\./i.test(bruto);
  let url;
  try {
    const alvo = barraTruque ? bruto.replace(/\\/, '') : bruto;
    url = new URL(temEsquema ? alvo : 'http://' + alvo);
  } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  if (!host.includes('.') && !host.startsWith('[')) return null;
  // rótulos como digitados (Unicode), para comparar letras disfarçadas
  const hostCru = (bruto.replace(/^https?:\/\//i, '').split(/[\/?#:\\]/)[0].split('@').at(-1) || host).toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  const rotulos = host.split('.');
  if (rotulos.some((r) => !r || r.startsWith('-') || r.endsWith('-'))) return null;
  const longo = rotulos.some((r) => r.length > 63);
  if (longo && !temEsquema) return null;
  const ehIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  if (!temEsquema && !comWww && !ehIP) {
    const tldCru = hostCru.split('.').at(-1);
    const tldOrig = bruto.split(/[\/?#:]/)[0].split('.').at(-1);
    if (!TLDS_SEM_ESQUEMA.has(tldCru) && !(tldCru.length === 2 && !TLD_PALAVRA.has(tldCru))) return null;
    // "Fui no banco.Me ligue": final com inicial maiúscula = começo de frase
    if (/^[A-Z][a-z]+$/.test(tldOrig)) return null;
    const simples = !/[\/?#:]/.test(bruto) && rotulos.length === 2 && !/[-\d]/.test(rotulos[0]);
    const depois = s.slice(m.index + m[0].length, m.index + m[0].length + 3);
    const semNada = !/[\/?#:]/.test(bruto) && !/[-\d_]/.test(host);
    if (semNada && TLD_PALAVRA.has(rotulos.at(-1)) && !ENCURTADORES.has(host) && !['wa.me', 't.me', 'fb.me'].includes(host) && !MARCAS.some((b) => b.oficiais.includes(host))) return null;
    if (simples && /^[A-ZÀ-Ú][a-zà-ú]+\./.test(bruto) && /^ [a-zà-ú]/.test(depois)) return null;
    if (simples && /[à-ú]/i.test(rotulos[0] + hostCru) && /^ [a-zà-ú]/.test(depois)) return null; // "ótimo.com certeza"
    const palavraAntes = s.slice(Math.max(0, m.index - 12), m.index).trim().split(/\s+/).at(-1)?.toLowerCase();
    if (simples && PREPOSICOES.has(palavraAntes) && /^ [a-zà-ú]/.test(depois)) return null; // "fui na caixa.com a minha irmã"
    if (simples && ANTES_DE_ARQUIVO.has(palavraAntes)) return null; // "arquivo relatorio.app"
  }
  const descricao = conversa(host, url);
  const temArroba = url.username !== '' || url.password !== '';
  let usuario = '';
  try { usuario = decodeURIComponent(url.username + (url.password ? ':' + url.password : '')); } catch { usuario = url.username; }
  return {
    texto: bruto, host, hostCru, url, tipo: descricao ? 'conversa' : 'link', descricao: descricao ?? undefined, ehIP, longo, barraTruque,
    semCadeado: /^http:\/\//i.test(bruto), temArroba, usuario,
  };
}

export function extrairLinks(texto) {
  const s = reparar(String(texto ?? '').slice(0, LIMITE_TEXTO));
  const links = [];
  const vistos = new Set();
  for (const m of s.matchAll(CANDIDATO)) {
    const l = lerCandidato(s, m);
    if (!l) continue;
    const chave = (l.host + l.url.pathname + l.url.search).toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    links.push(l);
  }
  for (const m of s.matchAll(ESPECIAL)) {
    const texto = m[0].replace(/[.,;:!?)\]}>'"…*_~]+$/u, '');
    const esquema = texto.slice(0, texto.indexOf(':')).toLowerCase();
    if (vistos.has(esquema + ':' + texto)) continue;
    vistos.add(esquema + ':' + texto);
    links.push({ texto, host: '', hostCru: '', tipo: 'link', especial: esquema, semCadeado: false, temArroba: false, usuario: '' });
  }
  for (const m of s.matchAll(EMAIL)) {
    let host;
    try { host = new URL('http://' + m[1]).hostname.replace(/\.$/, ''); } catch { continue; }
    const hostCruEmail = m[1].toLowerCase();
    if (s[m.index + m[0].length] === '/' || links.some((l) => l.temArroba && l.host === host)) {
      if (links.some((l) => l.temArroba && l.host === host)) continue;
      const bruto = s.slice(m.index, m.index + 2048).split(/\s/)[0];
      try {
        const url = new URL('http://' + bruto);
        let usuario = url.username;
        try { usuario = decodeURIComponent(url.username); } catch {}
        links.push({ texto: bruto, host, hostCru: host, url, tipo: 'link', ehIP: false, semCadeado: false, temArroba: true, usuario });
      } catch {}
      continue;
    }
    if (WEBMAIL.has(host) || vistos.has('@' + host)) continue;
    vistos.add('@' + host);
    links.push({ texto: m[0], host, hostCru: hostCruEmail, tipo: 'email', semCadeado: false, temArroba: false, usuario: '' });
  }
  return links;
}

// ---------- Marca ----------
function compara(peca, marca) {
  // devolve {forca, como} ou null. peca já em esqueleto.
  const so = (l) => (l ?? []).map(esqueleto);
  for (const n of so(marca.nomes)) {
    if (peca === n) return { forca: 50, como: 'exata' };
    if (peca.startsWith(n) && AFIXOS.has(peca.slice(n.length))) return { forca: 50, como: 'composta' };
    if (peca.endsWith(n) && AFIXOS.has(peca.slice(0, -n.length))) return { forca: 50, como: 'composta' };
    const lim = n.length >= 8 ? 2 : 1;
    if (n.length >= 5 && distancia(n, peca, n.length <= 8) <= lim) return { forca: 55, como: 'parecida' };
  }
  for (const c of so(marca.curtos)) {
    if (peca === c) return { forca: 50, como: 'exata' };
    const resto = peca.startsWith(c) ? peca.slice(c.length) : peca.endsWith(c) ? peca.slice(0, -c.length) : null;
    if (c.length >= 3 && resto && resto.length >= 3 && AFIXOS.has(resto)) return { forca: 50, como: 'composta' };
    if (c.length === 4 && peca.length === 4 && distancia(c, peca, true) <= 1 && [...c].sort().join('') === [...peca].sort().join('')) return { forca: 55, como: 'parecida' };
  }
  return null;
}

function procurarMarca(host, hostCru) {
  let melhor = null;
  const tentar = (r) => { if (r && (!melhor || r.forca > melhor.forca)) melhor = r; };
  // 1) endereço oficial inteiro dentro de outro: nubank.com.br.golpe.com, itau.com.br-seguro.com
  for (const marca of MARCAS) {
    for (const d of marca.oficiais) {
      if (!d.includes('.')) continue;
      if (/^[a-z]{2}$/.test(host.slice(d.length + 1)) && host.startsWith(d + '.')) continue; // variante de país (picpay.com.br)
      if (host.startsWith(d + '.') || host.startsWith(d + '-') || host.includes('.' + d + '.') || host.includes('.' + d + '-')) {
        tentar({ marca, forca: 60, como: 'subdominio' });
      }
    }
  }
  // 2) rótulos e pedaços
  const rotulos = (hostCru.includes('.') ? hostCru : host).split('.').map((r) => punyDecode(r));
  const dom = dominioRegistravel(host);
  const sufixo = dom.split('.').slice(1).join('.');
  const nSuf = sufixo.split('.').length;
  const daMarca = rotulos.slice(0, rotulos.length - nSuf); // tira ".com.br", ".web.app" etc.
  // limites: endereço real tem no máximo 253 letras; evita trabalho demais com lixo
  for (const rot of daMarca.slice(0, 12)) {
    const pecas = rot.slice(0, 253).split(/[-_]/).slice(0, 24).map(esqueleto).filter(Boolean);
    const juntos = [];
    for (let i = 0; i < pecas.length; i++) for (let j = i; j < Math.min(pecas.length, i + 4); j++) juntos.push({ txt: pecas.slice(i, j + 1).join(''), i, j });
    for (const marca of MARCAS) {
      for (const { txt, i, j } of juntos) tentar(((r) => r && { ...r, marca })(compara(txt, marca)));
      // nomes que são palavras comuns: rótulo inteiro, ou pedaço ao lado de palavra de golpe
      for (const p of (marca.palavras ?? []).map(esqueleto)) {
        const k = pecas.indexOf(p);
        if (pecas.length === 1 && pecas[0] === p && daMarca.length > 1) tentar({ marca, forca: 50, como: 'exata' });
        else if (k >= 0 && pecas.some((q, idx) => idx !== k && AFIXOS.has(q))) tentar({ marca, forca: 50, como: 'composta' });
        else if (pecas.length === 1 && pecas[0] === p && daMarca.length === 1 && !['com', 'net', 'org'].includes(sufixo.split('.')[0]) ) tentar({ marca, forca: 50, como: 'exata' });
      }
    }
  }
  // nome exato da marca só trocando o final (.com, .net, .com.br): pode ser da própria empresa; avisa sem acusar
  const cru = daMarca[0]?.toLowerCase();
  const tokensCrus = melhor ? [...(melhor.marca.nomes ?? []), ...(melhor.marca.curtos ?? []), ...(melhor.marca.palavras ?? [])] : [];
  if (melhor && melhor.como === 'exata' && !melhor.marca.semVariante && daMarca.length === 1 && tokensCrus.includes(cru) && /^(com|net|org)(\.[a-z]{2})?$|^[a-z]{2}$/.test(sufixo)) melhor = { ...melhor, forca: 30, como: 'mesmoNome' };
  // 3) fraco: nome (>=7 letras) no meio de uma palavra
  if (!melhor) {
    const tudo = esqueleto(daMarca.join(''));
    for (const marca of MARCAS) for (const n of (marca.nomes ?? []).map(esqueleto)) if (n.length >= 7 && tudo.includes(n)) tentar({ marca, forca: 10, como: 'fraca' });
  }
  return melhor;
}


function decodificar(t) {
  try { return decodeURIComponent(t); } catch { return t; }
}

const CREDENCIAL = new Set(['login', 'signin', 'entrar', 'acesso', 'acessar', 'senha', 'auth', 'verify', 'verificacao', 'validar',
  'valida', 'atualizar', 'atualizacao', 'desbloqueio', 'desbloquear', 'token', 'liberacao', 'conta', 'cadastro'].map(esqueleto));

// marca no caminho do link (site.com/nubank/login) junto de palavra de golpe
function marcaNoCaminho(url) {
  if (!url) return null;
  const pecas = decodificar(url.pathname + ' ' + url.search + ' ' + url.hash).toLowerCase().slice(0, 2048)
    .split(/[^\p{L}\p{N}]+/u).map(esqueleto).filter(Boolean);
  const isca = pecas.some((p) => AFIXOS.has(p) || CREDENCIAL.has(p) || ['update', 'liberacao'].includes(p));
  if (!isca) return null;
  for (const marca of MARCAS) {
    for (const p of pecas) {
      const r = compara(p, marca);
      if (r && r.forca >= 50) return { marca, credencial: pecas.some((q) => CREDENCIAL.has(q)) };
    }
  }
  return null;
}

// palavras de isca no nome do site (resgate-premio.com, sorteio.pro)
const ISCA = ['rastreio', 'rastreamento', 'encomenda', 'taxa', 'taxas', 'premio', 'premios', 'premiado', 'resgate', 'resgatar', 'pix',
  'devolucao', 'regularizar', 'regulariza', 'beneficio', 'indenizacao', 'restituicao', 'desbloqueio', 'desbloquear', 'pendencia',
  'valores', 'receber', 'saque', 'liberacao', 'sorteio', 'gift', 'brinde', 'brindes', 'bonus', 'cashback', 'cupom', 'ganhe',
  'ganhador', 'gratis', 'seguranca', 'atualizar', 'atualizacao', 'verificacao', 'reembolso', 'multa', 'boleto', 'fatura', 'promocao']
  .map(esqueleto);

function contarIscas(host) {
  const nome = dominioRegistravel(host).split('.')[0];
  const pecas = nome.split(/[-_]/).map(esqueleto).filter(Boolean);
  let n = 0;
  for (const p of pecas) {
    if (ISCA.includes(p)) n++;
    else if (p.length >= 8 && ISCA.some((w) => w.length >= 6 && p.includes(w))) n++;
  }
  return n;
}

const OUTRO_ALFABETO = /[Ͱ-ϿЀ-ԯ԰-֏]/;

export function analisarLink(link, profundidade = 0) {
  const host = link.host ?? '';
  const problemas = [];
  let pontos = 0;
  let imitaMarca = false;
  let marcaImitada = null;
  const add = (p, txt, inicio = false) => { pontos += p; inicio ? problemas.unshift(txt) : problemas.push(txt); };
  const finge = (marca, p, txt) => { imitaMarca = true; marcaImitada ??= marca.nome; add(p, txt, true); };
  const decod = host.split('.').map(punyDecode).join('.');
  const hostExibicao = decod.toLowerCase().replace(/^www\./, '');
  const fim = (tipo, oficialDe) => {
    // o aviso de imitação vem sempre primeiro
    const i = problemas.findIndex((p) => p.startsWith('Finge ser site d'));
    if (i > 0) problemas.unshift(...problemas.splice(i, 1));
    return {
      texto: link.texto, host, hostExibicao: link.especial ? link.especial + ':' : hostExibicao, dominio: host ? dominioRegistravel(host) : '', tipo, descricao: link.descricao,
      oficialDe, imitaMarca, marca: imitaMarca ? marcaImitada : null, problemas, pontos: Math.max(0, Math.min(70, pontos)),
    };
  };

  if (link.especial) {
    add(40, 'Não é um site: é um código escondido que pode fazer coisas no seu celular. Não toque.');
    return fim('link', null);
  }
  // wa.me / t.me: abre conversa com alguém; quem é essa pessoa é o que importa
  if (link.tipo === 'conversa') return fim('conversa', null);

  const hosp = sufixoHospedagem(host);
  const form = FORMULARIOS.find((f) => (host + (link.url?.pathname ?? '')).startsWith(f) || host === f);
  // sites.google.com, docs.google.com/forms...: o domínio é do Google, mas o conteúdo é de qualquer um
  const dono = hosp || form ? null : MARCAS.find((m) => m.oficiais.some((d) => ehDe(host, d)));
  const oficialDe = dono && !dono.plataforma ? dono.nome : null;
  const conhecido = !!dono || CONHECIDOS.has(dominioRegistravel(host));
  const unicode = /[^\x00-\x7f]/.test(link.hostCru) || host.split('.').some((p) => p.startsWith('xn--'));
  const outroAlfabeto = unicode && OUTRO_ALFABETO.test(decod + link.hostCru);

  if (link.tipo === 'email') {
    if (!conhecido) {
      const m = procurarMarca(host, link.hostCru);
      if (m && m.forca >= 50) finge(m.marca, 35, `Finge ser site ${m.marca.de} ${m.marca.nome}: este e-mail não vem do endereço oficial.`);
      if (outroAlfabeto) problemas.push('O e-mail usa letras de outro alfabeto que parecem iguais às nossas.');
    }
    return fim('email', oficialDe);
  }

  // redirecionamento: ?url=https://golpe.xyz
  if (profundidade === 0 && link.url) {
    let n = 0;
    for (const [k, v] of link.url.searchParams) {
      if (n++ > 20) break;
      if (!/^(q|u|url|redirect|redirect_uri|redir|next|to|link|target|dest|destination|continue|r|goto|out)$/i.test(k)) continue;
      const interno = extrairLinks(v.slice(0, 2048))[0];
      if (interno && interno.host && interno.host !== host && interno.tipo !== 'email') {
        const a = analisarLink(interno, 1);
        if (!a.oficialDe) {
          add(a.pontos + 10, `O link passa por outro site para esconder o destino verdadeiro (${a.hostExibicao}).`);
          a.problemas.forEach((p) => problemas.push(p));
          if (a.imitaMarca) { imitaMarca = true; marcaImitada ??= a.marca; }
        }
      }
    }
  }

  if (ENCURTADORES.has(host)) add(25, 'É um link encurtado: ele esconde para onde você vai de verdade.');
  else if (!conhecido && /^\/[A-Za-z0-9_-]{3,12}\/?$/.test(link.url?.pathname ?? '') &&
    (/^[a-z0-9]{1,5}\.(ly|gd|at|cl|ee|li|gl|co|to|me|io|cc|su|us|im|gy|in|is|it|id|link|click|ink|one|lt|re|do|vc|ws|sh)$/.test(host) ||
     /link|lnk|url|short|curt|tiny/.test(dominioRegistravel(host).split('.')[0].replace(/1/g, 'l').replace(/0/g, 'o')))) {
    add(15, 'Parece um link encurtado: ele esconde para onde você vai de verdade.');
  }
  if (link.ehIP) add(30, 'O endereço é só um monte de números, sem nome de site. Sites sérios não fazem isso.');

  if (link.temArroba) {
    const u = link.usuario.toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9.-]/g, '');
    const donoU = MARCAS.find((mm) => mm.oficiais.some((d) => ehDe(u, d)));
    const m = donoU ? { marca: donoU, forca: 55 } : procurarMarca(esqueleto(u), esqueleto(u));
    if (m && m.forca >= 50 && !oficialDe) finge(m.marca, 55, `Finge ser site ${m.marca.de} ${m.marca.nome}: o nome vem antes do "@", mas o link leva para outro lugar.`);
    if (!oficialDe) add(25, link.barraTruque ? 'O link tem uma barra "\\" e um "@" no meio, um truque para esconder o site verdadeiro.' : 'O link tem um "@" no meio, um truque para esconder o site verdadeiro.');
  }

  if (!conhecido) {
    const m = procurarMarca(host, link.hostCru);
    if (m && m.como === 'mesmoNome') {
      add(30, `O site oficial ${m.marca.de} ${m.marca.nome} é ${m.marca.oficiais[0]}. Este endereço é diferente: confira antes de entrar.`, true);
    } else if (m && m.forca >= 50) {
      const extra = m.como === 'parecida' || outroAlfabeto ? ' Trocaram letras para parecer o nome verdadeiro.' : m.como === 'subdominio' ? ' O nome verdadeiro está no começo, mas o site é outro.' : '';
      finge(m.marca, m.forca, `Finge ser site ${m.marca.de} ${m.marca.nome}, mas NÃO é o endereço oficial.${extra}`);
    } else if (m) {
      add(m.forca, `O nome "${m.marca.nome}" aparece no endereço, mas este não é o site oficial ${m.marca.de} ${m.marca.nome}.`);
    }
    if (outroAlfabeto) add(m && m.forca >= 50 ? 0 : 30, `O endereço usa letras de outro alfabeto que parecem iguais às nossas (veja: ${hostExibicao}).`);
    if (!m || m.forca < 50) {
      const iscas = contarIscas(host);
      if (iscas) add(iscas >= 2 ? 20 : 10, 'O nome do site usa palavras de isca (prêmio, taxa, rastreio, desbloqueio...) e não é de nenhuma empresa conhecida.');
      const mc = marcaNoCaminho(link.url);
      if (mc) {
        const forte = hosp || ENCURTADORES.has(host) || link.ehIP || mc.credencial;
        if (forte) finge(mc.marca, 35, `Finge ser site ${mc.marca.de} ${mc.marca.nome}: o nome está no meio do link, mas o site é outro (${hostExibicao}).`);
        else add(20, `Fala ${mc.marca.de} ${mc.marca.nome} no meio do link, mas o site não é ${mc.marca.de} ${mc.marca.nome}.`);
      }
    }
    if (hosp) add(20, 'É um site montado de graça na internet. Bancos, lojas e governo não usam esse tipo de endereço.');
    if (form) add(15, 'É um formulário da internet. Nunca coloque senha, CPF ou dados do cartão nele.');
    const tld = host.split('.').at(-1);
    if (TLDS_SUSPEITOS.has(tld)) add(20, `Termina em ".${tld}", um final muito usado por sites de golpe.`);
    const semPuny = host.replace(/xn--/g, '');
    if (link.longo || (semPuny.match(/-/g) || []).length >= 3 || host.split('.').length >= 5) add(10, 'O endereço é estranho, cheio de tracinhos ou pedaços.');
    if (link.url?.port && !['80', '443'].includes(link.url.port)) add(10, 'O link usa uma "porta" estranha (os números depois de dois-pontos).');
    if (link.semCadeado) add(5, 'O site não tem cadeado de segurança (https).');
  }

  return fim('link', oficialDe);
}

// ---------- Desarmar para compartilhar ----------
function desarmarEndereco(t) {
  const esq = /^(h)(tt)(ps?:\/\/)/i.exec(t);
  const ini = esq ? esq[0].length : 0;
  let fimHost = t.slice(ini).search(/[\/?#\\]/);
  fimHost = fimHost < 0 ? t.length : ini + fimHost;
  const cabeca = esq ? esq[1] + (esq[2] === 'TT' ? 'XX' : 'xx') + esq[3] : '';
  return cabeca + t.slice(ini, fimHost).replace(/\./g, '[.]') + t.slice(fimHost);
}

// Troca links e e-mails por versões que não abrem ao tocar (correios-taxa[.]xyz, hxxps://).
export function desarmar(texto) {
  const s = String(texto ?? '');
  const trechos = [];
  for (const m of s.matchAll(CANDIDATO)) {
    const l = lerCandidato(s, m);
    if (l) trechos.push([m.index, m.index + l.texto.length, desarmarEndereco(l.texto)]);
  }
  for (const m of s.matchAll(EMAIL)) {
    const arroba = m[0].indexOf('@');
    trechos.push([m.index, m.index + m[0].length, m[0].slice(0, arroba + 1) + m[0].slice(arroba + 1).replace(/\./g, '[.]')]);
  }
  for (const m of s.matchAll(ESPECIAL)) trechos.push([m.index, m.index + m[0].length, m[0].replace(':', '[:]')]);
  trechos.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let out = '';
  let pos = 0;
  for (const [ini, fim, novo] of trechos) {
    if (ini < pos) continue;
    out += s.slice(pos, ini) + novo;
    pos = fim;
  }
  return out + s.slice(pos);
}
