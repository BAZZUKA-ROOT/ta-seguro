// Tá Seguro? — service worker: guarda o app no aparelho para abrir na hora, com ou sem internet.
// MUDOU QUALQUER ARQUIVO DO APP? Troque a VERSAO: é isso que faz o celular baixar a versão nova, inteira.
const VERSAO = '2026-10-27.1';
const TESSERACT = '5.1.1'; // só troque junto com os arquivos de vendor/tesseract/
const CACHE_APP = `ta-seguro-app-${VERSAO}`;
const CACHE_OCR = `ta-seguro-ocr-${TESSERACT}`;
const CACHE_COMPARTILHADO = 'ta-seguro-compartilhado';

const APP = [
  './', 'index.html', 'css/estilo.css', 'js/app.js', 'js/motor.js', 'js/links.js', 'js/ocr.js',
  'icone.svg', 'manifest.webmanifest',
  'fontes/atkinson-400-latin.woff2', 'fontes/atkinson-700-latin.woff2',
  'icones/icone-192.png', 'icones/icone-512.png', 'icones/icone-maskable-512.png', 'icones/apple-touch-icon.png',
];

const noEscopo = (p) => new URL(p, self.registration.scope).href;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_APP)
      // cache:'reload' fura o cache HTTP, para a versão nova não vir misturada com a velha.
      .then((c) => c.addAll(APP.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const manter = [CACHE_APP, CACHE_OCR, CACHE_COMPARTILHADO];
    for (const k of await caches.keys()) if (k.startsWith('ta-seguro') && !manter.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Compartilhar → Tá Seguro? (vem como POST multipart)
  if (req.method === 'POST' && url.href === noEscopo('compartilhar')) {
    e.respondWith(receberCompartilhamento(req));
    return;
  }
  if (req.method !== 'GET') return;

  // Abrir o app: sempre do cache, com qualquer ?acao=..., mesmo sem rede.
  if (req.mode === 'navigate') {
    e.respondWith(abrirApp(req));
    return;
  }

  // Leitor de prints: guarda na primeira vez que for usado.
  if (url.href.startsWith(noEscopo('vendor/tesseract/'))) {
    e.respondWith(cachePrimeiro(req, e));
    return;
  }

  e.respondWith(caches.match(req, { cacheName: CACHE_APP, ignoreSearch: true }).then((r) => r || fetch(req)));
});

async function abrirApp(req) {
  const cache = await caches.open(CACHE_APP);
  const salvo = await cache.match(req, { ignoreSearch: true });
  if (salvo) return salvo;
  try {
    return await fetch(req);
  } catch {
    const app = await cache.match(noEscopo('index.html'));
    return app || new Response('Sem internet. Abra o Tá Seguro? de novo quando tiver conexão.', {
      status: 503, headers: { 'content-type': 'text/plain;charset=utf-8' },
    });
  }
}

async function cachePrimeiro(req, e) {
  const cache = await caches.open(CACHE_OCR);
  const salvo = await cache.match(req, { ignoreSearch: true });
  if (salvo) return salvo;
  const resp = await fetch(req);
  if (resp.ok && resp.status === 200) e.waitUntil(cache.put(req, resp.clone()));
  return resp;
}

async function receberCompartilhamento(req) {
  try {
    const dados = await req.formData();
    const pedacos = ['title', 'text', 'url'].map((k) => String(dados.get(k) || '').trim()).filter(Boolean);
    // O Android costuma repetir o link dentro do texto: tira o que já está contido em outro pedaço.
    const texto = pedacos
      .filter((p, i) => !pedacos.some((o, j) => j !== i && (o.length > p.length || j < i) && o.includes(p)))
      .join('\n');
    const imagem = dados.getAll('imagem').find((f) => f && typeof f !== 'string' && f.size > 0);
    const cache = await caches.open(CACHE_COMPARTILHADO);
    await cache.put(noEscopo('compartilhado/texto'), new Response(texto, { headers: { 'content-type': 'text/plain;charset=utf-8' } }));
    if (imagem) {
      await cache.put(noEscopo('compartilhado/imagem'), new Response(imagem, { headers: { 'content-type': imagem.type || 'application/octet-stream' } }));
    } else {
      await cache.delete(noEscopo('compartilhado/imagem'));
    }
  } catch {
    // mesmo com erro, abre o app (ele explica e oferece colar)
  }
  return Response.redirect(noEscopo('./?compartilhado=1'), 303);
}
