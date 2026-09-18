/* BBUber geography: distances, road routes, address search.
   Routes come from the free OSRM demo server and addresses from the free
   Photon search. If either is down, the app falls back quietly so a ride
   still works. Nothing personal is sent: only map coordinates and the
   words typed into the search box. */
(function () {
  "use strict";
  var C = window.BBUBER;
  var OSRM = "https://router.project-osrm.org/route/v1/driving/";
  var PHOTON = "https://photon.komoot.io/";

  function ll(p) {
    if (Array.isArray(p)) return { lat: p[0], lng: p[1] };
    return { lat: p.lat, lng: p.lng };
  }

  function meters(a, b) {
    a = ll(a); b = ll(b);
    var R = 6371008.8, r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function miles(a, b) { return meters(a, b) / 1609.344; }

  function inArea(p) {
    return miles(p, C.serviceArea.center) <= C.serviceArea.radiusMiles;
  }

  function fetchJSON(url, ms) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 6000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .finally(function () { clearTimeout(timer); });
  }

  // A gently curved line between two points, for when routing is down.
  // Distance is the straight line plus 30% to allow for roads.
  function fallbackRoute(a, b) {
    a = ll(a); b = ll(b);
    var n = 48, coords = [];
    var k = Math.cos(a.lat * Math.PI / 180);
    var dx = (b.lng - a.lng) * k, dy = b.lat - a.lat;
    var cx = (a.lng * k + b.lng * k) / 2 - dy * 0.18;
    var cy = (a.lat + b.lat) / 2 + dx * 0.18;
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      var x = u * u * a.lng * k + 2 * u * t * cx + t * t * b.lng * k;
      var y = u * u * a.lat + 2 * u * t * cy + t * t * b.lat;
      coords.push([y, x / k]);
    }
    var m = meters(a, b) * 1.3;
    return { coords: coords, meters: m, seconds: Math.max(60, m / 11.2), fallback: true };
  }

  function route(a, b) {
    a = ll(a); b = ll(b);
    var url = OSRM + a.lng.toFixed(6) + "," + a.lat.toFixed(6) + ";" + b.lng.toFixed(6) + "," + b.lat.toFixed(6) +
      "?overview=full&geometries=geojson";
    return fetchJSON(url, 7000)
      .then(function (j) {
        if (!j || j.code !== "Ok" || !j.routes || !j.routes.length) throw new Error("no route");
        var r = j.routes[0];
        var coords = r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
        if (coords.length < 2) throw new Error("short route");
        return { coords: coords, meters: r.distance, seconds: Math.max(60, r.duration), fallback: false };
      })
      .catch(function () { return fallbackRoute(a, b); });
  }

  function describe(p) {
    var street = [p.housenumber, p.street].filter(Boolean).join(" ");
    var name = p.name || street || p.city || p.town || p.village || "Dropped pin";
    var town = p.city || p.town || p.village || p.district || p.county;
    var parts = [];
    if (p.name && street) parts.push(street);
    if (town && town !== name) parts.push(town);
    if (p.state) parts.push(p.state === "Michigan" ? "MI" : p.state);
    return { name: name, sub: parts.join(", ") };
  }

  function search(q) {
    var c = C.serviceArea.center;
    var url = PHOTON + "api/?q=" + encodeURIComponent(q) + "&lat=" + c[0] + "&lon=" + c[1] + "&limit=7&lang=en";
    return fetchJSON(url, 6000).then(function (j) {
      var seen = {};
      return (j.features || []).map(function (f) {
        var d = describe(f.properties || {});
        return { name: d.name, sub: d.sub, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
      }).filter(function (r) {
        var key = r.name + "|" + r.sub;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
    });
  }

  function reverse(p) {
    p = ll(p);
    var url = PHOTON + "reverse?lat=" + p.lat.toFixed(6) + "&lon=" + p.lng.toFixed(6) + "&limit=1&lang=en&layer=house&layer=street";
    return fetchJSON(url, 5000)
      .then(function (j) {
        var f = j.features && j.features[0];
        return f ? describe(f.properties || {}) : null;
      })
      .catch(function () { return null; });
  }

  window.BBGeo = {
    meters: meters,
    miles: miles,
    inArea: inArea,
    route: route,
    fallbackRoute: fallbackRoute,
    search: search,
    reverse: reverse,
  };
})();
