const CACHE_NAME = "buserach-v25";
// here — they hit the stale-while-revalidate branch, so after every deploy the first
// visit showed the old cached version instead of the fresh one (only the second
// refresh picked it up). We only keep here things that rarely change.
// The manifest fell out of this list during the split by city: under /<city>/ there
// is its own, and the old root path would not pass anyway — cache.addAll rejects
// redirect responses, so the SW install would fail entirely.
const ASSETS = [
  "/logo/logo512.png",
  "/logo/logo.png",
  "/logo/logo.ico",
  "/favicon.ico",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // For the API and live data - always network, no SW caching
  if (url.pathname.includes("/api/") || url.pathname.includes("/data")) {
    return;
  }

  // For external static assets (CDN) - Stale While Revalidate
  // Map libraries from /assets/vendor/ are version-pinned and marked immutable,
  // so we cache them the same way we used to cache the unpkg ones — except now they
  // come from our own server, so the response is "basic" and there is no longer any
  // problem with the "opaque" type.
  if (
    ASSETS.includes(event.request.url) ||
    url.pathname.includes("/assets/vendor/") ||
    url.hostname === "fonts.gstatic.com"
  ) {
    // The "cors" mode and rejection of "opaque" responses stay, even though the map
    // libraries no longer come from a foreign domain. This still applies to fonts from
    // fonts.gstatic.com, and for assets from our own server it is simply irrelevant —
    // the response comes out as "basic" anyway. Historically this condition prevented
    // caching "opaque" responses from unpkg: the browser rejected them entirely,
    // leaflet.js came out empty, and the map hung.
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached && cached.type === "opaque") cached = undefined;
        const networked = fetch(new Request(event.request, { mode: "cors" }))
          .then((res) => {
            if (res && (res.type === "cors" || res.type === "basic") && res.ok) {
              const cacheCopy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || networked;
      })
    );
    return;
  }

  // Default strategy: Network First. HTML pages are deliberately never cached
  // (see the comment at the top of the file), so when the network happens to be down
  // (e.g. a short container-restart window during a deploy), caches.match() for such a
  // request returns undefined anyway — and the browser rejects respondWith(undefined)
  // with "TypeError: Failed to convert value to 'Response'" instead of just showing a
  // network error. The fallback below guarantees we always return a real Response.
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(
        (cached) => cached || new Response("", { status: 503, statusText: "Offline" })
      )
    )
  );
});

// Push notifications: "Your bus is approaching the stop" (see server.ts,
// evaluateNotifyWatches). The payload is plain JSON with title/body/url/tag.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "BUSearch", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "BUSearch";
  const options = {
    body: data.body || "",
    icon: "/logo/logo512.png",
    badge: "/logo/logo.png",
    tag: data.tag || "busearch-notify",
    data: { url: data.url || "/" },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
