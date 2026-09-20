// Sobe a cada publicação, junto com qualquer mudança em index.html/manifest/ícones.
const CACHE_NAME = "campo-do-pedro-2026.09.20c";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon.png",
];

self.addEventListener("install", (event) => {
  // Busca cada arquivo com um parâmetro de versão (força a rede a tratar como
  // pedido novo, nunca visto antes) e guarda no cache sob a chave normal, sem
  // o parâmetro -- pra bater certinho com os pedidos reais no fetch abaixo.
  // Mesmo truque do service worker do sistema principal: sem isso, o CDN do
  // GitHub Pages podia devolver uma cópia velha mesmo logo depois de publicar.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(APP_SHELL.map(async (url) => {
        const urlComVersao = url.includes("?") ? `${url}&v=${CACHE_NAME}` : `${url}?v=${CACHE_NAME}`;
        const resposta = await fetch(urlComVersao, { cache: "no-store" });
        // Guardar uma resposta de erro sob a chave certa envenenaria o cache
        // pro resto da vida dessa versão. Melhor a instalação falhar aqui e o
        // service worker antigo continuar valendo até a próxima tentativa.
        if (!resposta.ok) {
          throw new Error(`Não consegui baixar ${url} (HTTP ${resposta.status})`);
        }
        await cache.put(url, resposta);
      }))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || !url.pathname.match(/\.(html|json|png)$|\/$/)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
