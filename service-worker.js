/* Campo do Pedro — guarda o aplicativo no aparelho para abrir sem internet.
   A página sempre tenta a versão mais nova primeiro (assim as atualizações
   chegam sozinhas); sem internet, ou com sinal muito fraco, abre a cópia
   guardada. Troque a versão abaixo a cada publicação. */
const VERSAO = 'campo-do-pedro-2026.09.24a';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];
/* Outros sites do mesmo endereço (nicolasredivo.github.io) dividem o mesmo
   armazenamento: aqui só se mexe nas cópias do próprio Campo do Pedro. */
const DESTE_APP = nome => nome.startsWith('campo-do-pedro-') || nome.startsWith('campo-pedro-');

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSAO)
      .then(c => c.addAll(ARQUIVOS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => DESTE_APP(k) && k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function comPrazo(promessa, ms) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('prazo')), ms);
    promessa.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); falha(e); });
  });
}
const daCopia = chave => caches.open(VERSAO).then(c => c.match(chave));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const base = new URL(self.registration.scope);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;

  const ehPagina = req.mode === 'navigate' || url.pathname === base.pathname || url.pathname.endsWith('/index.html');
  if (ehPagina) {
    const daRede = fetch(req, { cache: 'no-cache' }).then(r => {
      if (r && r.ok) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put('./index.html', copia)); }
      return r;
    });
    e.respondWith(
      comPrazo(daRede, 4000).catch(() =>
        daCopia('./index.html').then(r => r || daCopia('./')).then(r => r || daRede)
      )
    );
    return;
  }

  e.respondWith(
    daCopia(req).then(r => r || fetch(req).then(res => {
      if (res && res.ok) { const copia = res.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
      return res;
    }))
  );
});
