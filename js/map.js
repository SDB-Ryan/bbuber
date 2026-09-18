/* BBUber map: the Leaflet map, pins, route lines and the moving cars (drawn as whiskey bottles). */
(function () {
  "use strict";
  var C = window.BBUBER;
  var G = window.BBGeo;

  var map = null;
  var idle = [];          // background cars
  var trips = [];         // cars currently driving a route for a ride
  var routeLayers = [];
  var pickupM = null, dropoffM = null, pulseM = null, userM = null;
  var lastFrame = 0;
  var idleShown = true;

  /* ------------------------------------------------------------ helpers */
  function toLL(p) { return Array.isArray(p) ? L.latLng(p[0], p[1]) : L.latLng(p.lat, p.lng); }

  function bearing(a, b) {
    var r = Math.PI / 180;
    var y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r);
    var x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r);
    return (Math.atan2(y, x) / r + 360) % 360;
  }

  function makePath(coords) {
    var cum = [0];
    for (var i = 1; i < coords.length; i++) cum.push(cum[i - 1] + G.meters(coords[i - 1], coords[i]));
    return { coords: coords, cum: cum, total: cum[cum.length - 1] || 1 };
  }

  function pointAt(path, d) {
    var c = path.coords, cum = path.cum;
    if (d <= 0) return { pt: c[0], i: 0, heading: bearing(c[0], c[1]) };
    if (d >= path.total) {
      var n = c.length - 1;
      return { pt: c[n], i: n, heading: bearing(c[n - 1], c[n]) };
    }
    var lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (cum[mid] <= d) lo = mid; else hi = mid;
    }
    var seg = cum[hi] - cum[lo] || 1;
    var t = (d - cum[lo]) / seg;
    var a = c[lo], b = c[hi];
    return { pt: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], i: lo, heading: bearing(a, b) };
  }

  // Each car is drawn as a whiskey bottle driving neck-first, so the neck
  // shows which way it's heading. Background bottles have a cream label;
  // your driver's bottle is full amber with a black label.
  function carIcon(kind) {
    var mine = kind === "mine";
    var glass = mine ? "#f6d9a0" : "#d5dbd9";
    var whiskey = mine ? "#e8a33d" : "#b8702a";
    var label = mine ? "#0b0b0c" : "#f4f1ea";
    var stripe = mine ? "#e8a33d" : "#0b0b0c";
    var svg =
      '<svg viewBox="0 0 20 44" width="15" height="33" aria-hidden="true">' +
      '<rect x="7" y="0.8" width="6" height="4.6" rx="1.2" fill="#8a5a2b" stroke="#0b0b0c" stroke-width="1"/>' +
      '<path d="M7.6 5.2H12.4V11C12.4 13 17.5 14 17.5 18.5V40C17.5 41.9 16.4 43 14.5 43H5.5C3.6 43 2.5 41.9 2.5 40V18.5C2.5 14 7.6 13 7.6 11Z" fill="' + glass + '" stroke="#0b0b0c" stroke-width="1.3"/>' +
      '<path d="M3.5 20H16.5V40C16.5 41.3 15.8 42 14.5 42H5.5C4.2 42 3.5 41.3 3.5 40Z" fill="' + whiskey + '"/>' +
      '<rect x="3.5" y="25" width="13" height="9.5" fill="' + label + '"/>' +
      '<rect x="5.5" y="28.6" width="9" height="2.3" rx="0.6" fill="' + stripe + '"/>' +
      '<rect x="4.8" y="15.5" width="1.6" height="7" rx="0.8" fill="#fff" opacity="0.55"/>' +
      "</svg>";
    return L.divIcon({
      className: "bb-car" + (mine ? " bb-car-mine" : ""),
      html: '<div class="bb-car-rot">' + svg + "</div>",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }

  // Headings are kept continuous (359 then 361, not 359 then 1) so the
  // CSS transition turns the car the short way round.
  function setHeading(car, deg) {
    var el = car.marker.getElement();
    if (car.heading === undefined) {
      car.heading = deg;
    } else {
      var delta = ((deg - car.heading) % 360 + 540) % 360 - 180;
      if (Math.abs(delta) < 2 && el && el.firstChild && el.firstChild.style.transform) return;
      car.heading += delta;
    }
    if (el && el.firstChild) el.firstChild.style.transform = "rotate(" + car.heading.toFixed(1) + "deg)";
  }

  /* ---------------------------------------------------------- the map */
  function init(el, center, zoom) {
    map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      center: toLL(center),
      zoom: zoom || 15,
      minZoom: 10,
      maxZoom: 18,
      zoomSnap: 0.25,
    });
    // Standard OpenStreetMap tiles, turned dark with a CSS filter in app.css.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: "bb-tiles",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(map);
    L.control.attribution({ position: "bottomright", prefix: '<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>' }).addTo(map);
    startIdle();
    requestAnimationFrame(tick);
    return map;
  }

  /* ------------------------------------------------------- idle cars */
  function startIdle() {
    var loops = window.BBUBER_IDLE_ROUTES || [];
    if (!loops.length) return;
    var paths = loops.map(makePath);
    // Two cars on the short downtown loops, one on the longer ones.
    var plan = [0, 0, 1, 1, 2, 2, 3, 4, 5];
    plan.forEach(function (li) { if (paths[li]) addIdle(paths[li]); });
  }

  function addIdle(path) {
    var car = {
      path: path,
      d: Math.random() * path.total,
      speed: (C.simulation.idleCarSpeed || 40) * (0.8 + Math.random() * 0.4),
      marker: null,
    };
    var p = pointAt(car.path, car.d);
    car.marker = L.marker(toLL(p.pt), { icon: carIcon("idle"), interactive: false, keyboard: false });
    if (idleShown) car.marker.addTo(map);
    setHeading(car, p.heading);
    idle.push(car);
    return car;
  }

  function respawnIdle() {
    var loops = window.BBUBER_IDLE_ROUTES || [];
    if (!loops.length) return;
    addIdle(makePath(loops[Math.floor(Math.random() * loops.length)]));
  }

  function showIdle(show) {
    idleShown = show;
    idle.forEach(function (car) {
      if (show && !map.hasLayer(car.marker)) car.marker.addTo(map);
      if (!show && map.hasLayer(car.marker)) map.removeLayer(car.marker);
    });
  }

  // Take the idle car closest to a point off its loop, so it can become the driver.
  function claimNearest(p) {
    if (!idle.length) return null;
    var best = 0, bestD = Infinity;
    idle.forEach(function (car, i) {
      var d = G.meters(car.marker.getLatLng(), p);
      if (d < bestD) { bestD = d; best = i; }
    });
    var car = idle.splice(best, 1)[0];
    car.distance = bestD;
    return car;
  }

  // Put a claimed car back on its loop (the rider cancelled while searching).
  function unclaim(car) {
    if (!car || !car.path) return;
    car.marker.setIcon(carIcon("idle"));
    car.heading = undefined;
    idle.push(car);
  }

  // Straight-line distance from a point to the nearest idle car, in meters.
  function nearestIdleMeters(p) {
    var best = Infinity;
    idle.forEach(function (car) { best = Math.min(best, G.meters(car.marker.getLatLng(), p)); });
    return best;
  }

  // A car that is not on a loop, for when there are no idle cars at all.
  function spawnCarNear(p) {
    var start = [p.lat + (Math.random() - 0.5) * 0.02, p.lng + (Math.random() - 0.5) * 0.03];
    var car = { marker: L.marker(toLL(start), { icon: carIcon("idle"), interactive: false }).addTo(map) };
    car.distance = G.meters(start, p);
    return car;
  }

  function carPosition(car) {
    var p = car.marker.getLatLng();
    return { lat: p.lat, lng: p.lng };
  }

  function markMine(car) {
    car.marker.setIcon(carIcon("mine"));
    car.heading = undefined;
    if (!map.hasLayer(car.marker)) car.marker.addTo(map);
    car.marker.setZIndexOffset(1000);
  }

  function retire(car) {
    if (car && car.marker && map.hasLayer(car.marker)) map.removeLayer(car.marker);
    respawnIdle();
  }

  /* ----------------------------------------- driving a ride route */
  // Moves a car along coords over `seconds`. onProgress(fraction) runs every frame.
  // Returns a handle with cancel().
  function drive(car, coords, seconds, onProgress, onDone) {
    var job = {
      car: car,
      path: makePath(coords),
      start: performance.now(),
      ms: seconds * 1000,
      onProgress: onProgress,
      onDone: onDone,
      done: false,
    };
    trips.push(job);
    return {
      cancel: function () {
        job.done = true;
        trips = trips.filter(function (j) { return j !== job; });
      },
    };
  }

  function tick(now) {
    var dt = Math.min(0.1, (now - (lastFrame || now)) / 1000);
    lastFrame = now;

    idle.forEach(function (car) {
      car.d += car.speed * dt;
      if (car.d > car.path.total) car.d -= car.path.total;
      var p = pointAt(car.path, car.d);
      if (idleShown) {
        car.marker.setLatLng(p.pt);
        setHeading(car, p.heading);
      }
    });

    trips.slice().forEach(function (job) {
      if (job.done) return;
      var f = Math.min(1, (now - job.start) / job.ms);
      var p = pointAt(job.path, f * job.path.total);
      job.car.marker.setLatLng(p.pt);
      setHeading(job.car, p.heading);
      if (job.onProgress) job.onProgress(f, p);
      if (f >= 1) {
        job.done = true;
        trips = trips.filter(function (j) { return j !== job; });
        if (job.onDone) job.onDone();
      }
    });

    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------ routes and pins */
  function showRoute(coords, kind) {
    clearRoute();
    var color = kind === "pickup" ? "#ece7dc" : "#e8a33d";
    routeLayers.push(L.polyline(coords, { color: "#000", weight: 9, opacity: 0.55, interactive: false }).addTo(map));
    routeLayers.push(L.polyline(coords, { color: color, weight: 4.5, opacity: 1, interactive: false }).addTo(map));
  }

  // Trim the drawn route so it only shows what's left ahead of the car.
  function trimRoute(coords, progress) {
    if (routeLayers.length < 2 || !progress) return;
    var rest = [progress.pt].concat(coords.slice(progress.i + 1));
    if (rest.length < 2) rest.push(progress.pt);
    routeLayers.forEach(function (l) { l.setLatLngs(rest); });
  }

  function clearRoute() {
    routeLayers.forEach(function (l) { map.removeLayer(l); });
    routeLayers = [];
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pinIcon(kind, label) {
    var html = '<div class="bb-pin bb-pin-' + kind + '"><span class="bb-pin-dot"></span>' +
      (label ? '<span class="bb-pin-label">' + esc(label) + "</span>" : "") + "</div>";
    return L.divIcon({ className: "bb-pin-wrap", html: html, iconSize: [16, 16], iconAnchor: [8, 8] });
  }

  function setPickup(p, label) {
    if (pickupM) map.removeLayer(pickupM);
    pickupM = p ? L.marker(toLL(p), { icon: pinIcon("pickup", label), interactive: false, zIndexOffset: 500 }).addTo(map) : null;
  }

  function setDropoff(p, label) {
    if (dropoffM) map.removeLayer(dropoffM);
    dropoffM = p ? L.marker(toLL(p), { icon: pinIcon("dropoff", label), interactive: false, zIndexOffset: 500 }).addTo(map) : null;
  }

  function pulse(p) {
    clearPulse();
    if (!p) return;
    pulseM = L.marker(toLL(p), {
      icon: L.divIcon({ className: "bb-pulse-wrap", html: '<div class="bb-pulse"></div><div class="bb-pulse two"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
      interactive: false,
    }).addTo(map);
  }

  function clearPulse() {
    if (pulseM) map.removeLayer(pulseM);
    pulseM = null;
  }

  function showUser(p) {
    if (userM) map.removeLayer(userM);
    userM = p ? L.marker(toLL(p), {
      icon: L.divIcon({ className: "bb-user-wrap", html: '<div class="bb-user"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      interactive: false,
    }).addTo(map) : null;
  }

  /* ------------------------------------------------------ viewport */
  function fit(points, pad) {
    if (!points.length) return;
    pad = pad || {};
    var b = L.latLngBounds(points.map(toLL));
    map.fitBounds(b, {
      paddingTopLeft: [pad.left || 40, pad.top || 70],
      paddingBottomRight: [pad.right || 40, pad.bottom || 40],
      maxZoom: 16,
      animate: true,
    });
  }

  // Center a point in the part of the map not covered by panels.
  function focus(p, zoom, pad) {
    pad = pad || {};
    var z = zoom || map.getZoom();
    var pt = map.project(toLL(p), z);
    pt = pt.add([((pad.left || 0) - (pad.right || 0)) / -2, ((pad.top || 0) - (pad.bottom || 0)) / -2]);
    map.setView(map.unproject(pt, z), z, { animate: true });
  }

  function latLngAtContainerPoint(x, y) {
    var ll = map.containerPointToLatLng([x, y]);
    return { lat: ll.lat, lng: ll.lng };
  }

  window.BBMap = {
    init: init,
    get map() { return map; },
    showIdle: showIdle,
    claimNearest: claimNearest,
    unclaim: unclaim,
    nearestIdleMeters: nearestIdleMeters,
    spawnCarNear: spawnCarNear,
    carPosition: carPosition,
    markMine: markMine,
    retire: retire,
    drive: drive,
    showRoute: showRoute,
    trimRoute: trimRoute,
    clearRoute: clearRoute,
    setPickup: setPickup,
    setDropoff: setDropoff,
    pulse: pulse,
    clearPulse: clearPulse,
    showUser: showUser,
    fit: fit,
    focus: focus,
    latLngAtContainerPoint: latLngAtContainerPoint,
  };
})();
