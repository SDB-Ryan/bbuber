/* BBUber offline helper.
   Always tries the network first, so a pushed change shows up right away.
   Falls back to the last saved copy when there is no signal.
   Map tiles, routes and address lookups are never saved. */
var CACHE = "bbuber-v1";
var SHELL = [
  "./", "index.html", "app/", "app/index.html",
  "css/site.css", "css/app.css",
  "js/config.js", "js/idle-routes.js", "js/pricing.js", "js/geo.js", "js/map.js", "js/app.js", "js/site.js",
  "vendor/leaflet/leaflet.js", "vendor/leaflet/leaflet.css",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon.svg",
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === "navigate" ? caches.match("app/") : undefined);
      });
    })
  );
});
