/* BBUber app: the ride flow from "Where to?" to the receipt.
   All words, prices and people come from js/config.js. */
(function () {
  "use strict";
  var C = window.BBUBER, P = window.BBPricing, G = window.BBGeo, M = window.BBMap;
  var params = new URLSearchParams(location.search);
  var EMBED = params.get("embed") === "1";
  if (EMBED) document.documentElement.classList.add("embed");

  function byId(id) { return document.getElementById(id); }
  var body = document.body;
  var sheet = byId("sheet"), searchEl = byId("search"), page = byId("page");
  var drawer = byId("drawer"), drawerBg = byId("drawer-backdrop");
  var modalBg = byId("modal-backdrop"), modal = byId("modal");
  var toastEl = byId("toast"), fab = byId("fab"), pinEl = byId("pin");

  var ICON = {
    menu: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    person: '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor"/></svg>',
    chat: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6.6 3.5l3 3.4-1.9 2.4a12 12 0 006.9 6.9l2.4-1.9 3.4 3-1.6 3.1C11 20 4 13 3.5 5.1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    shield: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  };

  /* ------------------------------------------------------------ helpers */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function fmtTime(d) { return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  function fmtDate(d) {
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + " · " + fmtTime(d);
  }
  function addMin(min) { return new Date(Date.now() + min * 60000); }
  function isWide() { return window.matchMedia("(min-width: 900px)").matches; }

  function fill(t) {
    var d = (S.trip && S.trip.driver) || {};
    var v = {
      driver: d.name, vehicle: d.vehicle, color: d.color ? String(d.color).toLowerCase() : "",
      plate: d.plate, bourbon: d.bourbon,
      pickup: S.pickup && S.pickup.name, dropoff: S.dropoff && S.dropoff.name,
    };
    return String(t).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; });
  }

  function setText(id, text) { var el = byId(id); if (el) el.textContent = text; }
  function setWidth(id, frac) { var el = byId(id); if (el) el.style.width = (frac * 100).toFixed(1) + "%"; }

  // Timers belong to the current screen and are cleared when the screen changes.
  var timers = [];
  function after(ms, fn) { timers.push(["t", setTimeout(fn, ms)]); }
  function every(ms, fn) { timers.push(["i", setInterval(fn, ms)]); }
  function clearTimers() {
    timers.forEach(function (t) { if (t[0] === "t") clearTimeout(t[1]); else clearInterval(t[1]); });
    timers = [];
  }
  function rotate(id, list, ms) {
    var i = 0;
    every(ms, function () {
      i = (i + 1) % list.length;
      var el = byId(id);
      if (!el) return;
      el.classList.remove("fade");
      void el.offsetWidth;
      el.textContent = fill(list[i]);
      el.classList.add("fade");
    });
  }

  /* -------------------------------------------------------------- state */
  var S = {
    view: "home",
    pickup: null,
    pickupIsDefault: true,
    dropoff: null,
    field: "dropoff",
    results: [],
    route: null,
    quotes: null,
    tierId: firstAvailableTier(),
    trip: null,
    leg: null,
    lastDriver: -1,
    routeToken: 0,
  };

  function tierById(id) { return C.tiers.filter(function (t) { return t.id === id; })[0] || null; }
  function firstAvailableTier() {
    var t = C.tiers.filter(function (t) { return !t.unavailable; })[0];
    return t ? t.id : C.tiers[0].id;
  }
  function placeById(id) { return C.places.filter(function (p) { return p.id === id; })[0] || null; }
  function copyPlace(p) {
    return { id: p.id, icon: p.icon, name: p.name, sub: p.sub, lat: p.lat, lng: p.lng };
  }
  function downtown() {
    var p = placeById("downtown");
    if (p) return copyPlace(p);
    var A = C.serviceArea;
    return { id: "downtown", icon: "📍", name: A.centerName, sub: A.centerSub, lat: A.center[0], lng: A.center[1] };
  }

  // How much of the map is covered by the panel, so the map can work around it.
  function pad() {
    var r = sheet.getBoundingClientRect();
    if (isWide()) return { left: r.right + 40, top: 60, right: 60, bottom: 50 };
    var bottom = Math.max(40, window.innerHeight - r.top + 24);
    return { left: 40, right: 40, top: 90, bottom: bottom };
  }

  function syncSheetHeight() {
    var h = isWide() ? 0 : Math.max(0, window.innerHeight - sheet.getBoundingClientRect().top);
    document.documentElement.style.setProperty("--sheet-h", h + "px");
  }

  function setView(v) {
    S.view = v;
    body.setAttribute("data-view", v);
    var back = v === "choose" || v === "pin";
    fab.setAttribute("data-action", back ? "back" : "menu");
    fab.setAttribute("aria-label", back ? "Back" : "Menu");
    fab.innerHTML = back ? ICON.back : ICON.menu;
    fab.hidden = v === "receipt";
  }

  function paint(html) {
    sheet.innerHTML = html;
    sheet.scrollTop = 0;
    syncSheetHeight();
  }

  var GRAB = '<div class="grab" aria-hidden="true"></div>';

  /* ------------------------------------------------------------- toast */
  var toastTimer = null;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastEl.classList.remove("show");
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3600);
  }

  /* ------------------------------------------------------------- modal */
  function showModal(title, html, buttons) {
    modal.innerHTML = "<h3>" + esc(title) + '</h3><div class="modal-body">' + html + '</div><div class="modal-actions"></div>';
    var box = modal.querySelector(".modal-actions");
    (buttons || [{ label: "OK", primary: true }]).forEach(function (b) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "btn " + (b.primary ? "primary" : "ghost");
      el.textContent = b.label;
      el.addEventListener("click", function () { closeModal(); if (b.fn) b.fn(); });
      box.appendChild(el);
    });
    modalBg.hidden = false;
    var first = box.querySelector("button");
    if (first) first.focus();
  }
  function closeModal() { modalBg.hidden = true; modal.innerHTML = ""; }
  modalBg.addEventListener("click", function (e) { if (e.target === modalBg) closeModal(); });

  function outOfArea() {
    showModal(C.serviceArea.outOfAreaTitle, "<p>" + esc(pick(C.serviceArea.outOfAreaMessages)) + "</p>",
      [{ label: "Pick somewhere in Milford", primary: true }]);
  }

  /* --------------------------------------------------------------- home */
  function greeting() {
    var h = new Date().getHours();
    if (h < 4 || h >= 22) return "Up late";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  function proofChip(sg) {
    return '<span class="proof-chip">🔥 ' + sg.multiplier + "× · " + sg.proof + " proof</span>";
  }

  function placeRow(p, action, idx) {
    return '<li><button type="button" class="row" data-action="' + action + '"' +
      (p.id ? ' data-id="' + esc(p.id) + '"' : "") + (idx != null ? ' data-idx="' + idx + '"' : "") + ">" +
      '<span class="row-ic">' + esc(p.icon || "📍") + "</span>" +
      '<span class="row-text"><b>' + esc(p.name) + "</b>" + (p.sub ? "<small>" + esc(p.sub) + "</small>" : "") + "</span></button></li>";
  }

  function renderHome() {
    var sg = P.surge();
    var sugg = C.places.filter(function (p) { return p.suggested; });
    paint(
      GRAB +
      '<p class="greet">' + greeting() + ", " + esc(C.brand.appGreetingName) + "</p>" +
      '<div class="where-row">' +
        '<button type="button" class="where" data-action="open-search" data-field="dropoff"><span class="where-sq" aria-hidden="true"></span>Where to?</button>' +
        '<button type="button" class="now-chip" data-action="now">' + ICON.clock + "Now</button>" +
      "</div>" +
      '<button type="button" class="pickup-line" data-action="open-search" data-field="pickup">' +
        '<span class="dot-pickup" aria-hidden="true"></span><span class="ellipsis">Pickup: <b>' + esc(S.pickup.name) + '</b></span><span class="chev">›</span></button>' +
      (sg.active ? '<div class="proof-banner">' + proofChip(sg) + "<span>" + esc(sg.label) + "</span></div>" : "") +
      (sugg.length ? '<p class="list-head">Popular right now</p><ul class="list">' +
        sugg.map(function (p) { return placeRow(p, "quick-dest"); }).join("") + "</ul>" : "")
    );
  }

  function goHome() {
    clearTimers();
    setView("home");
    renderHome();
    M.clearRoute();
    M.clearPulse();
    M.setDropoff(null);
    M.setPickup(S.pickup, null);
    M.showIdle(true);
    M.focus(S.pickup, 15, pad());
  }

  /* ------------------------------------------------------------ search */
  var searchSeq = 0, searchTimer = null;

  function openSearch(field) {
    S.field = field || "dropoff";
    searchEl.hidden = false;
    searchEl.innerHTML =
      '<div class="panel-head"><button type="button" class="icon-btn" data-action="close-search" aria-label="Back">' + ICON.back + "</button><h2>Plan your ride</h2></div>" +
      '<div class="fields">' +
        '<div class="rail" aria-hidden="true"><span class="rail-dot"></span><span class="rail-line"></span><span class="rail-sq"></span></div>' +
        '<div class="inputs">' +
          '<input id="in-pickup" type="text" enterkeyhint="search" autocomplete="off" spellcheck="false" aria-label="Pickup" placeholder="Pickup location" value="' + esc(S.pickup ? S.pickup.name : "") + '">' +
          '<input id="in-dropoff" type="text" enterkeyhint="search" autocomplete="off" spellcheck="false" aria-label="Destination" placeholder="Where to?" value="' + esc(S.dropoff ? S.dropoff.name : "") + '">' +
        "</div>" +
      "</div>" +
      '<ul class="list results" id="results"></ul>';

    ["pickup", "dropoff"].forEach(function (f) {
      var inp = byId("in-" + f);
      inp.addEventListener("focus", function () {
        S.field = f;
        inp.select();
        renderResults("");
      });
      inp.addEventListener("input", function () { renderResults(inp.value.trim()); });
      inp.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        var first = S.results.filter(function (r) { return r.kind === "place" || r.kind === "addr"; })[0];
        if (first) pickResult(S.results.indexOf(first));
      });
    });
    var target = byId("in-" + S.field);
    renderResults("");
    setTimeout(function () { target.focus(); }, 30);
  }

  function closeSearch() {
    searchEl.hidden = true;
    searchEl.innerHTML = "";
    clearTimeout(searchTimer);
    searchSeq++;
    if (S.view === "home") renderHome();
  }

  function renderResults(q) {
    var list = byId("results");
    if (!list) return;
    var seq = ++searchSeq;
    clearTimeout(searchTimer);
    var items = [];
    if (S.field === "pickup" && "geolocation" in navigator) {
      items.push({ kind: "locate", icon: "◎", name: "Use current location", sub: "Works if you're in Milford" });
    }
    items.push({ kind: "pin", icon: "📌", name: "Set location on map", sub: "Drag the map to the exact spot" });
    var ql = q.toLowerCase();
    var places = C.places.filter(function (p) {
      return !q || (p.name + " " + (p.sub || "")).toLowerCase().indexOf(ql) !== -1;
    }).map(function (p) { var c = copyPlace(p); c.kind = "place"; return c; });
    S.results = items.concat(places);

    var html = items.map(function (r, i) { return placeRow(r, "pick-result", i); }).join("");
    if (places.length) {
      html += '<li class="list-head">' + (q ? "Milford spots" : "Popular in Milford") + "</li>";
      html += places.map(function (r, i) { return placeRow(r, "pick-result", items.length + i); }).join("");
    }
    if (q.length >= 3) {
      html += '<li class="list-head" id="addr-head">Addresses</li><li id="addr-rows"><p class="muted small pad">Searching addresses…</p></li>';
    }
    list.innerHTML = html;
    if (q.length < 3) return;

    searchTimer = setTimeout(function () {
      G.search(q).then(function (res) {
        if (seq !== searchSeq) return;
        var box = byId("addr-rows");
        if (!box) return;
        if (!res.length) { box.innerHTML = '<p class="muted small pad">No addresses found. Try a Milford spot or drop a pin.</p>'; return; }
        var listed = {};
        C.places.forEach(function (p) { listed[p.name.toLowerCase()] = true; });
        res = res.filter(function (r) { return !listed[r.name.toLowerCase()]; });
        if (!res.length) {
          var head = byId("addr-head");
          if (head) head.remove();
          box.remove();
          return;
        }
        var base = S.results.length;
        res.forEach(function (r) { r.kind = "addr"; r.icon = "📍"; S.results.push(r); });
        box.outerHTML = res.map(function (r, i) { return placeRow(r, "pick-result", base + i); }).join("");
      }).catch(function () {
        if (seq !== searchSeq) return;
        var box = byId("addr-rows");
        if (box) box.innerHTML = '<p class="muted small pad">Address search is napping. Pick a spot above or drop a pin.</p>';
      });
    }, 350);
  }

  function pickResult(idx) {
    var r = S.results[idx];
    if (!r) return;
    if (r.kind === "locate") return locate(true);
    if (r.kind === "pin") return enterPin(S.field);
    setPlace(S.field, { id: r.id, icon: r.icon, name: r.name, sub: r.sub, lat: r.lat, lng: r.lng });
  }

  function setPlace(field, place) {
    if (!G.inArea(place)) { outOfArea(); return false; }
    var other = field === "pickup" ? S.dropoff : S.pickup;
    if (other && G.miles(place, other) < (C.serviceArea.sameSpotMiles || 0.03)) { toast(C.serviceArea.sameSpotJoke); return false; }
    S[field] = place;
    if (field === "pickup") S.pickupIsDefault = false;
    if (S.pickup && S.dropoff) {
      if (!searchEl.hidden) closeSearch();
      goChoose();
      return true;
    }
    var next = field === "pickup" ? "dropoff" : "pickup";
    if (searchEl.hidden) {
      openSearch(next);
    } else {
      var inp = byId("in-" + field);
      if (inp) inp.value = place.name;
      var nx = byId("in-" + next);
      if (nx) nx.focus();
    }
    return true;
  }

  /* -------------------------------------------------- set on the map */
  var pinSeq = 0;

  function pinPoint() {
    var p = pad();
    return { x: (p.left + window.innerWidth - p.right) / 2, y: (p.top + window.innerHeight - p.bottom) / 2 };
  }

  function enterPin(field) {
    S.pinField = field;
    S.pinReturn = S.view;
    searchEl.hidden = true;
    searchEl.innerHTML = "";
    setView("pin");
    var label = field === "pickup" ? "pickup" : "destination";
    paint(
      GRAB +
      '<h3 class="status-title">Set your ' + label + "</h3>" +
      '<p class="status-sub">Drag the map to move the pin.</p>' +
      '<div class="pin-addr"><span class="row-ic">📌</span><span class="row-text"><b id="pin-name">Locating…</b><small id="pin-sub">&nbsp;</small></span></div>' +
      '<button type="button" class="btn primary block big" data-action="confirm-pin">Confirm ' + label + "</button>"
    );
    M.clearRoute();
    M.setPickup(null);
    M.setDropoff(null);
    var start = S[field] || S.pickup || downtown();
    var pt = pinPoint();
    pinEl.style.left = pt.x + "px";
    pinEl.style.top = pt.y + "px";
    M.focus(start, 16, pad());
    M.map.on("movestart", onPinLift);
    M.map.on("moveend", onPinMove);
    setTimeout(onPinMove, 400);
  }

  function onPinLift() { pinEl.classList.add("lift"); }

  function onPinMove() {
    pinEl.classList.remove("lift");
    if (S.view !== "pin") return;
    var pt = pinPoint();
    var ll = M.latLngAtContainerPoint(pt.x, pt.y);
    var spot = S.pinSpot = { icon: "📌", name: "Dropped pin", sub: ll.lat.toFixed(5) + ", " + ll.lng.toFixed(5), lat: ll.lat, lng: ll.lng };
    setText("pin-name", "Locating…");
    var seq = ++pinSeq;
    G.reverse(ll).then(function (d) {
      if (seq !== pinSeq || S.view !== "pin") return;
      if (d) { spot.name = d.name; spot.sub = d.sub || spot.sub; }
      setText("pin-name", spot.name);
      setText("pin-sub", spot.sub);
    });
  }

  function leavePin() {
    M.map.off("movestart", onPinLift);
    M.map.off("moveend", onPinMove);
    pinSeq++;
    var back = S.pinReturn === "choose" && S.pickup && S.dropoff ? "choose" : "home";
    if (back === "choose") showChoose(); else goHome();
  }

  function confirmPin() {
    var spot = S.pinSpot;
    if (!spot) return;
    if (!G.inArea(spot)) { outOfArea(); return; }
    var field = S.pinField;
    var other = field === "pickup" ? S.dropoff : S.pickup;
    if (other && G.miles(spot, other) < (C.serviceArea.sameSpotMiles || 0.03)) { toast(C.serviceArea.sameSpotJoke); return; }
    leavePin();
    setPlace(field, spot);
  }

  /* ---------------------------------------------------- choose a ride */
  function tripSummary() {
    return '<button type="button" class="trip-summary" data-action="edit-trip" aria-label="Change pickup or destination">' +
      '<span class="rail small" aria-hidden="true"><span class="rail-dot"></span><span class="rail-line"></span><span class="rail-sq"></span></span>' +
      '<span class="ts-text"><span class="ellipsis">' + esc(S.pickup.name) + '</span><span class="ellipsis">' + esc(S.dropoff.name) + "</span></span>" +
      '<span class="chev">Edit</span></button>';
  }

  function pickupEta(tier) {
    var m = M.nearestIdleMeters(S.pickup);
    var base = isFinite(m) ? (m / 1609.344) / 22 * 60 + 1 : 4;
    return Math.max(2, Math.round(base)) + (tier.extraMinutes || 0);
  }

  function quoteFor(id) {
    return (S.quotes || []).filter(function (q) { return q.tier.id === id; })[0] || null;
  }

  function tierRow(q, tripMin) {
    var t = q.tier, sel = t.id === S.tierId;
    if (t.unavailable) {
      return '<li><button type="button" class="tier off" data-action="tier" data-id="' + esc(t.id) + '">' +
        '<span class="tier-ic">' + esc(t.icon) + "</span>" +
        '<span class="tier-main"><b>' + esc(t.name) + "</b><small>" + esc(t.unavailableText || "Unavailable") + "</small></span>" +
        '<span class="tier-price"><s>' + P.money(q.total) + "</s></span></button></li>";
    }
    var eta = pickupEta(t);
    var drop = fmtTime(addMin(eta + tripMin));
    return '<li><button type="button" class="tier' + (sel ? " sel" : "") + '" data-action="tier" data-id="' + esc(t.id) + '" aria-pressed="' + sel + '">' +
      '<span class="tier-ic">' + esc(t.icon) + "</span>" +
      '<span class="tier-main"><b>' + esc(t.name) + ' <span class="seats">' + ICON.person + esc(t.seats) + "</span></b>" +
      "<small>" + eta + " min away · " + drop + " dropoff</small>" +
      (sel ? '<small class="blurb">' + esc(t.blurb) + "</small>" : "") + "</span>" +
      '<span class="tier-price"><b>' + P.money(q.total) + "</b><small>≈ " + q.pours + "</small></span></button></li>";
  }

  function renderChoose() {
    if (!S.quotes) {
      paint(GRAB + tripSummary() + '<div class="pouring"><span class="spinner" aria-hidden="true"></span>Pouring your options…</div>');
      return;
    }
    var sg = S.quotes[0].surge;
    var tripMin = S.route.seconds / 60;
    var sel = quoteFor(S.tierId) || S.quotes[0];
    paint(
      GRAB + tripSummary() +
      '<div class="choose-head"><h3>Choose a ride</h3>' + (sg.active ? proofChip(sg) : "") + "</div>" +
      (sg.active ? '<p class="proof-note">' + esc(sg.label) + " Fares are higher than usual.</p>" : "") +
      '<ul class="tiers">' + S.quotes.map(function (q) { return tierRow(q, tripMin); }).join("") + "</ul>" +
      '<button type="button" class="link" data-action="breakdown">How is this priced?</button>' +
      '<button type="button" class="pay-row" data-action="wallet"><span class="card-ic" aria-hidden="true">💳</span><span>' +
        esc(C.brand.cardName) + " •••• " + esc(C.brand.cardLast4) + '</span><span class="chev">›</span></button>' +
      '<button type="button" class="btn primary block big" data-action="request">Choose ' + esc(sel.tier.name) + "</button>"
    );
  }

  function showChooseMap() {
    M.setPickup(S.pickup, S.pickup.name);
    M.setDropoff(S.dropoff, S.dropoff.name);
    M.clearPulse();
    M.showIdle(true);
    if (S.route) {
      M.showRoute(S.route.coords, "trip");
      M.fit(S.route.coords.concat([S.pickup, S.dropoff]), pad());
    } else {
      M.clearRoute();
      M.fit([S.pickup, S.dropoff], pad());
    }
  }

  function showChoose() {
    clearTimers();
    setView("choose");
    renderChoose();
    showChooseMap();
  }

  function goChoose() {
    S.route = null;
    S.quotes = null;
    var token = ++S.routeToken;
    showChoose();
    G.route(S.pickup, S.dropoff).then(function (r) {
      if (token !== S.routeToken || S.view !== "choose") return;
      S.route = r;
      S.quotes = P.quoteAll(r.meters / 1609.344, r.seconds / 60);
      var cur = tierById(S.tierId);
      if (!cur || cur.unavailable) S.tierId = firstAvailableTier();
      renderChoose();
      showChooseMap();
    });
  }

  function selectTier(id) {
    var t = tierById(id);
    if (!t) return;
    if (t.unavailable) { toast(t.unavailableJoke || t.unavailableText || "Unavailable"); return; }
    if (S.tierId === id) { showBreakdown(); return; }
    S.tierId = id;
    var st = sheet.scrollTop;
    renderChoose();
    sheet.scrollTop = st;
  }

  function fareLines(lines) {
    return lines.map(function (l) {
      return '<div class="fare-line"><span>' + esc(l.label) + "</span><span>" + P.money(l.amount) + "</span></div>";
    }).join("");
  }

  function showBreakdown() {
    var q = quoteFor(S.tierId);
    if (!q) return;
    showModal(q.tier.name + " fare",
      '<div class="fare">' + fareLines(q.lines) +
      '<div class="fare-total"><span>Upfront price</span><b>' + P.money(q.total) + "</b></div>" +
      '<p class="muted small">≈ ' + esc(q.pours) + " at " + P.money(C.pricing.pourPrice) + " a pour. Tips are in pours, after the ride.</p></div>",
      [{ label: "Got it", primary: true }]);
  }

  /* ----------------------------------------------------------- request */
  function pickDriver() {
    var n = C.drivers.length;
    var i = Math.floor(Math.random() * n);
    if (n > 1 && i === S.lastDriver) i = (i + 1) % n;
    S.lastDriver = i;
    return C.drivers[i];
  }

  function legSeconds(minutes) {
    var sim = C.simulation;
    return clamp(minutes * sim.secondsPerRealMinute, sim.minLegSeconds, sim.maxLegSeconds);
  }

  function request() {
    var q = quoteFor(S.tierId);
    if (!q || q.tier.unavailable || !S.route) return;
    var trip = S.trip = {
      id: Date.now().toString(36),
      tier: q.tier,
      quote: q,
      pickup: S.pickup,
      dropoff: S.dropoff,
      route: S.route,
      requestedAt: new Date(),
      pin: String(Math.floor(1000 + Math.random() * 9000)),
      chat: [],
      rating: 0,
      tipPours: 0,
    };
    trip.car = M.claimNearest(S.pickup) || M.spawnCarNear(S.pickup);
    clearTimers();
    setView("searching");
    paint(
      GRAB +
      '<h3 class="status-title fade" id="search-msg">' + esc(C.searchingMessages[0]) + "</h3>" +
      '<div class="bar indeterminate" aria-hidden="true"><span></span></div>' +
      '<div class="req-summary"><span class="tier-ic">' + esc(q.tier.icon) + '</span><span class="row-text"><b>' + esc(q.tier.name) + "</b><small>" +
        esc(S.pickup.name) + " → " + esc(S.dropoff.name) + "</small></span><b>" + P.money(q.total) + "</b></div>" +
      '<button type="button" class="btn ghost block" data-action="cancel-search">Cancel request</button>'
    );
    M.clearRoute();
    M.setDropoff(null);
    M.setPickup(S.pickup, null);
    M.pulse(S.pickup);
    M.showIdle(true);
    M.focus(S.pickup, 15, pad());
    rotate("search-msg", C.searchingMessages, 2200);

    var sim = C.simulation;
    var wait = rand(sim.matchSeconds[0], sim.matchSeconds[1]) * 1000;
    var legP = G.route(M.carPosition(trip.car), S.pickup);
    var waited = new Promise(function (res) { after(wait, res); });
    Promise.all([legP, waited]).then(function (v) {
      if (S.trip !== trip || S.view !== "searching") return;
      matched(v[0]);
    });
  }

  function cancelSearch() {
    var trip = S.trip;
    clearTimers();
    M.clearPulse();
    if (trip && trip.car) {
      if (trip.car.path) M.unclaim(trip.car); else M.retire(trip.car);
    }
    S.trip = null;
    toast("Request canceled. No charge. This time.");
    showChoose();
  }

  /* ------------------------------------------------------ driver cards */
  function avatar(d) {
    if (d.photo) return '<span class="avatar"><img src="../' + esc(d.photo) + '" alt=""></span>';
    return '<span class="avatar">' + esc(d.avatar || "🥃") + "</span>";
  }

  function driverCard(d) {
    return '<div class="driver-card">' +
      '<div class="dc-top">' + avatar(d) +
        '<span class="dc-who"><b>' + esc(d.name) + "</b><small>★ " + Number(d.rating).toFixed(2) + " · " + Number(d.trips).toLocaleString("en-US") + " trips</small></span>" +
        '<span class="dc-car"><span class="plate">' + esc(d.plate) + "</span><small>" + esc(d.color) + " " + esc(d.vehicle) + "</small></span>" +
      "</div>" +
      '<p class="dc-about">🥃 Off-duty pour: <b>' + esc(d.bourbon) + "</b></p>" +
      '<p class="dc-about">“' + esc(d.about) + "”</p>" +
    "</div>";
  }

  function actions(list) {
    var defs = {
      message: ["open-chat", ICON.chat, "Message"],
      call: ["call", ICON.phone, "Call"],
      share: ["share", ICON.share, "Share"],
      cancel: ["ask-cancel", ICON.x, "Cancel"],
      safety: ["safety", ICON.shield, "Safety"],
    };
    return '<div class="actions">' + list.map(function (k) {
      var d = defs[k];
      return '<button type="button" class="act' + (k === "cancel" ? " danger" : "") + '" data-action="' + d[0] + '"><span class="act-ic">' + d[1] + "</span>" + d[2] + "</button>";
    }).join("") + "</div>";
  }

  /* ------------------------------------------------ driver on the way */
  function matched(leg) {
    var trip = S.trip;
    clearTimers();
    trip.driver = pickDriver();
    trip.leg1 = leg;
    trip.leg1Min = leg.seconds / 60;
    trip.chat.push({ from: "driver", text: fill(C.chat.greeting) });
    M.clearPulse();
    M.markMine(trip.car);
    M.showIdle(false);
    M.setPickup(S.pickup, "Pickup");
    setView("enroute");
    paint(
      GRAB +
      '<div class="status-row"><div><h3 class="status-title">Meet at pickup</h3><p class="status-sub ellipsis">' + esc(S.pickup.name) + "</p></div>" +
        '<div class="eta-badge"><b id="eta">' + Math.max(1, Math.ceil(trip.leg1Min)) + " min</b><small>away</small></div></div>" +
      '<div class="bar" aria-hidden="true"><span id="progress"></span></div>' +
      '<p class="ticker fade" id="status-msg">' + esc(fill(C.enrouteMessages[0])) + "</p>" +
      driverCard(trip.driver) +
      actions(["message", "call", "share", "cancel"])
    );
    M.showRoute(leg.coords, "pickup");
    M.fit(leg.coords.concat([S.pickup]), pad());
    rotate("status-msg", C.enrouteMessages, 5000);

    var lastUi = 0;
    S.leg = M.drive(trip.car, leg.coords, legSeconds(trip.leg1Min), function (f, p) {
      var now = performance.now();
      if (now - lastUi < 200 && f < 1) return;
      lastUi = now;
      setText("eta", Math.max(1, Math.ceil((1 - f) * trip.leg1Min)) + " min");
      setWidth("progress", f);
      M.trimRoute(leg.coords, p);
    }, arrived);
  }

  function arrived() {
    var trip = S.trip;
    if (!trip) return;
    clearTimers();
    S.leg = null;
    M.clearRoute();
    setView("arrived");
    var n = C.simulation.arrivedWaitSeconds;
    paint(
      GRAB +
      '<div class="status-row"><div><h3 class="status-title">' + esc(fill("{driver} is here")) + '</h3><p class="status-sub">' + esc(fill(pick(C.arrivedMessages))) + "</p></div></div>" +
      '<div class="pin-code"><span>Your PIN<small>Give it to your driver</small></span><span class="pin-digits">' + trip.pin + "</span></div>" +
      driverCard(trip.driver) +
      '<button type="button" class="btn primary block big" data-action="start-trip">I\'m in the car <small id="countdown">· starting in ' + n + "s</small></button>" +
      actions(["message", "call", "share", "cancel"])
    );
    M.focus(S.pickup, 16, pad());
    every(1000, function () {
      n -= 1;
      setText("countdown", n > 0 ? "· starting in " + n + "s" : "· starting…");
      if (n <= 0) startTrip();
    });
  }

  /* ------------------------------------------------------- on the trip */
  function startTrip() {
    var trip = S.trip;
    if (!trip || S.view !== "arrived") return;
    clearTimers();
    trip.startedAt = new Date();
    var r = trip.route, min = r.seconds / 60;
    trip.arriveAt = addMin(min);
    setView("ontrip");
    paint(
      GRAB +
      '<div class="status-row"><div><h3 class="status-title ellipsis">Heading to ' + esc(S.dropoff.name) + '</h3><p class="status-sub">Arrive by ' + fmtTime(trip.arriveAt) + "</p></div>" +
        '<div class="eta-badge"><b id="eta">' + Math.max(1, Math.ceil(min)) + " min</b><small>to go</small></div></div>" +
      '<div class="bar" aria-hidden="true"><span id="progress"></span></div>' +
      '<p class="ticker fade" id="status-msg">' + esc(fill(C.tripMessages[0])) + "</p>" +
      driverCard(trip.driver) +
      actions(["message", "share", "safety"])
    );
    M.setPickup(null);
    M.setDropoff(S.dropoff, S.dropoff.name);
    M.showRoute(r.coords, "trip");
    M.fit(r.coords.concat([S.dropoff]), pad());
    rotate("status-msg", C.tripMessages, 6000);

    var lastUi = 0;
    S.leg = M.drive(trip.car, r.coords, legSeconds(min), function (f, p) {
      var now = performance.now();
      if (now - lastUi < 200 && f < 1) return;
      lastUi = now;
      setText("eta", Math.max(1, Math.ceil((1 - f) * min)) + " min");
      setWidth("progress", f);
      M.trimRoute(r.coords, p);
    }, complete);
  }

  function askCancel() {
    showModal("Cancel your ride?", "<p>" + esc(C.pricing.cancellationJoke) + "</p>", [
      { label: "Keep my ride", primary: true },
      { label: "Cancel ride", fn: cancelRide },
    ]);
  }

  function cancelRide() {
    var trip = S.trip;
    if (!trip) return;
    clearTimers();
    if (S.leg) S.leg.cancel();
    S.leg = null;
    M.clearRoute();
    M.retire(trip.car);
    trip.completedAt = new Date();
    saveTrip(trip, "canceled", C.pricing.cancellationFee);
    S.trip = null;
    S.dropoff = null;
    closePage();
    toast("Ride canceled. " + P.money(C.pricing.cancellationFee) + " charged to your " + C.brand.cardName + ".");
    goHome();
  }

  /* ----------------------------------------------------------- receipt */
  function complete() {
    var trip = S.trip;
    if (!trip) return;
    clearTimers();
    S.leg = null;
    trip.completedAt = new Date();
    M.clearRoute();
    M.retire(trip.car);
    M.showIdle(true);
    M.setPickup(null);
    M.setDropoff(S.dropoff, null);
    saveTrip(trip, "completed");
    setView("receipt");
    renderReceipt();
    M.focus(S.dropoff, 16, pad());
  }

  function pourLabel(p) {
    if (p === 0.5) return "½ pour";
    return p + (p === 1 ? " pour" : " pours");
  }

  function renderReceipt(keepScroll) {
    var trip = S.trip, q = trip.quote, d = trip.driver;
    var tip = Math.round(trip.tipPours * C.pricing.pourPrice * 100) / 100;
    var total = q.total + tip;
    var stars = [1, 2, 3, 4, 5].map(function (n) {
      return '<button type="button" class="star' + (n <= trip.rating ? " on" : "") + '" data-action="rate" data-n="' + n + '" aria-label="' + n + ' stars">★</button>';
    }).join("");
    var chips = [0].concat(C.pricing.tipOptionsPours).map(function (p) {
      return '<button type="button" class="chip' + (p === trip.tipPours ? " on" : "") + '" data-action="tip" data-pours="' + p + '">' +
        (p === 0 ? "No tip<small>bold</small>" : pourLabel(p) + "<small>" + P.money(p * C.pricing.pourPrice) + "</small>") + "</button>";
    }).join("");
    var st = sheet.scrollTop;
    paint(
      GRAB +
      '<div class="receipt-head"><span class="check" aria-hidden="true">✓</span><div><small class="muted">You arrived at</small><h2>' + esc(S.dropoff.name) + '</h2><small class="muted">' + fmtDate(trip.completedAt) + "</small></div></div>" +
      '<div class="rate-box">' + avatar(d) + "<p>How was your ride with <b>" + esc(d.name) + '</b>?</p><div class="stars">' + stars + "</div>" +
        '<p class="rate-note">' + (trip.rating ? esc(fill(C.ratingNotes[trip.rating - 1] || "")) : "&nbsp;") + "</p></div>" +
      '<div class="tip-box"><p>Add a tip for ' + esc(d.name) + '</p><div class="chips">' + chips + "</div></div>" +
      '<div class="fare"><h4>Your ' + esc(q.tier.name) + " receipt</h4>" + fareLines(q.lines) +
        (tip ? fareLines([{ label: "Tip (" + pourLabel(trip.tipPours) + ")", amount: tip }]) : "") +
        '<div class="fare-total"><span>Total</span><b>' + P.money(total) + "</b></div>" +
        '<p class="muted small">≈ ' + esc(P.pours(total)) + " · Charged to " + esc(C.brand.cardName) + " •••• " + esc(C.brand.cardLast4) + "</p></div>" +
      '<p class="fine">' + esc(C.disclaimer) + "</p>" +
      '<button type="button" class="btn primary block big" data-action="done">Done</button>'
    );
    if (keepScroll) sheet.scrollTop = st;
  }

  function finishReceipt() {
    var trip = S.trip;
    if (!trip) return;
    var tip = Math.round(trip.tipPours * C.pricing.pourPrice * 100) / 100;
    updateTrip(trip.id, { rating: trip.rating, tip: tip });
    // You're at the destination now, so that's the next pickup.
    S.pickup = copyPlace(S.dropoff);
    S.pickupIsDefault = false;
    S.dropoff = null;
    S.trip = null;
    closePage();
    goHome();
  }

  /* ------------------------------------------------------------ trips */
  var KEY = "bbuber.trips.v1";
  function loadTrips() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function storeTrips(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50))); } catch (e) { /* private mode */ }
  }
  function saveTrip(trip, status, fee) {
    var rec = {
      id: trip.id,
      status: status,
      at: (trip.completedAt || new Date()).toISOString(),
      pickup: trip.pickup.name,
      dropoff: trip.dropoff.name,
      tier: trip.tier.name,
      icon: trip.tier.icon,
      driver: trip.driver ? trip.driver.name : null,
      avatar: trip.driver ? trip.driver.avatar : null,
      total: status === "canceled" ? fee : trip.quote.total,
      tip: 0,
      rating: 0,
    };
    var list = loadTrips().filter(function (t) { return t.id !== rec.id; });
    list.unshift(rec);
    storeTrips(list);
  }
  function updateTrip(id, patch) {
    storeTrips(loadTrips().map(function (t) { return t.id === id ? Object.assign(t, patch) : t; }));
  }

  function pageHead(title) {
    return '<div class="panel-head"><button type="button" class="icon-btn" data-action="close-page" aria-label="Back">' + ICON.back + "</button><h2>" + esc(title) + "</h2></div>";
  }

  function openPage(html, cls) {
    closeDrawer();
    page.className = "page" + (cls ? " " + cls : "");
    page.innerHTML = html;
    page.hidden = false;
  }

  function closePage() {
    page.hidden = true;
    page.innerHTML = "";
    page.className = "page";
  }

  function tripItem(t) {
    var when = new Date(t.at);
    var stars = t.rating ? " · " + "★".repeat(t.rating) : "";
    var money = t.status === "canceled"
      ? '<span class="trip-total canceled">Canceled · ' + P.money(t.total) + "</span>"
      : '<span class="trip-total">' + P.money((t.total || 0) + (t.tip || 0)) + "</span>";
    return '<li class="trip"><span class="tier-ic">' + esc(t.icon || "🥃") + '</span><span class="row-text">' +
      "<b>" + esc(t.dropoff) + "</b><small>From " + esc(t.pickup) + "</small>" +
      "<small>" + fmtDate(when) + " · " + esc(t.tier) + (t.driver ? " with " + esc(t.driver) : "") + stars + "</small></span>" + money + "</li>";
  }

  function openTrips() {
    var list = loadTrips();
    openPage(
      pageHead("Your trips") +
      (list.length
        ? '<ul class="list trips">' + list.map(tripItem).join("") + "</ul>" +
          '<button type="button" class="btn ghost block" data-action="clear-trips">Clear trip history</button>'
        : '<div class="empty"><p class="big-emoji">🥃</p><p><b>No trips yet.</b></p><p class="muted">The night is young.</p></div>') +
      '<p class="fine center">Trips are saved on this device only.</p>'
    );
  }

  /* ------------------------------------------------------------- chat */
  function openChat() {
    var trip = S.trip;
    if (!trip || !trip.driver) return;
    var d = trip.driver;
    openPage(
      '<div class="panel-head"><button type="button" class="icon-btn" data-action="close-page" aria-label="Back">' + ICON.back + "</button>" +
        avatar(d) + '<div class="chat-who"><b>' + esc(d.name) + "</b><small>" + esc(d.color) + " " + esc(d.vehicle) + " · " + esc(d.plate) + "</small></div></div>" +
      '<div class="chat-log" id="chat-log"></div>' +
      '<div class="chat-quick">' + C.chat.quickReplies.map(function (q, i) {
        return '<button type="button" class="qr" data-action="quick-reply" data-idx="' + i + '">' + esc(q) + "</button>";
      }).join("") + "</div>" +
      '<form class="chat-form" id="chat-form"><input id="chat-in" type="text" autocomplete="off" enterkeyhint="send" aria-label="Message" placeholder="Message ' + esc(d.name) + '"><button class="btn primary" type="submit">Send</button></form>',
      "chat"
    );
    renderChat();
    byId("chat-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var inp = byId("chat-in");
      sendChat(inp.value);
      inp.value = "";
    });
  }

  function renderChat(typing) {
    var log = byId("chat-log");
    if (!log || !S.trip) return;
    log.innerHTML = S.trip.chat.map(function (m) {
      return '<p class="msg ' + (m.from === "me" ? "me" : "driver") + '">' + esc(m.text) + "</p>";
    }).join("") + (typing ? '<p class="msg driver typing" aria-label="typing"><span></span><span></span><span></span></p>' : "");
    log.scrollTop = log.scrollHeight;
  }

  function sendChat(text) {
    text = String(text || "").trim();
    var trip = S.trip;
    if (!text || !trip) return;
    trip.chat.push({ from: "me", text: text });
    renderChat();
    setTimeout(function () { if (S.trip === trip) renderChat(true); }, 700);
    setTimeout(function () {
      if (S.trip !== trip) return;
      var reply = fill(pick(C.chat.driverReplies));
      trip.chat.push({ from: "driver", text: reply });
      if (byId("chat-log")) renderChat(); else toast(trip.driver.name + ": " + reply);
    }, 700 + rand(1200, 2200));
  }

  /* ------------------------------------------------------ extras */
  function shareTrip() {
    var trip = S.trip;
    var text = trip && trip.driver ? fill(C.shareText) : C.brand.tagline;
    var url = new URL("../", location.href).href;
    if (navigator.share) {
      navigator.share({ title: C.brand.name, text: text, url: url }).catch(function () { /* closed */ });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text + " " + url).then(function () {
        toast("Trip status copied. Paste it in the group chat.");
      }, function () { toast(text); });
    } else {
      toast(text);
    }
  }

  function showSafety() {
    var items = (C.landing.safety || []).map(function (s) {
      return '<div class="safety-item"><span class="row-ic">' + esc(s.icon) + '</span><span class="row-text"><b>' + esc(s.title) + "</b><small class=\"wrap\">" + esc(s.text) + "</small></span></div>";
    }).join("");
    showModal("Safety toolkit", items + '<p class="muted small">A real emergency? Call 911. BBUber is a joke and can\'t help.</p>',
      [{ label: "Share my trip", primary: true, fn: shareTrip }, { label: "Close" }]);
  }

  function showAbout() {
    openPage(
      pageHead("About " + C.brand.name) +
      '<div class="about">' +
        '<p class="about-mark"><span>BB</span>Uber</p>' +
        '<p class="about-tag">' + esc(C.brand.tagline) + "</p>" +
        '<p class="about-box">' + esc(C.disclaimer) + "</p>" +
        '<p class="muted small">Map data © OpenStreetMap contributors. Road routes from the OSRM project. Address search by Photon from Komoot. Map library Leaflet.</p>' +
        '<p class="muted small">Your trips and settings stay in this browser. Nothing is sent to anyone except map lookups.</p>' +
      "</div>"
    );
  }

  /* ------------------------------------------------------------ drawer */
  function buildDrawer() {
    drawer.innerHTML =
      '<div class="drawer-head"><span class="avatar">🥃</span><div><b>' + esc(C.brand.appGreetingName) + "</b><small>★ " +
        Number(C.brand.passengerRating).toFixed(2) + " passenger rating</small></div></div>" +
      '<button type="button" class="dr" data-action="trips"><span>🧾</span>Your trips</button>' +
      '<button type="button" class="dr" data-action="wallet"><span>💳</span>Wallet</button>' +
      '<button type="button" class="dr install-item" data-action="install"><span>📲</span>Install the app</button>' +
      '<a class="dr" href="../#drive" target="_top"><span>🚗</span>Drive with ' + esc(C.brand.name) + "</a>" +
      '<a class="dr" href="../#safety" target="_top"><span>🛡️</span>Safety</a>' +
      '<button type="button" class="dr" data-action="about"><span>ℹ️</span>About &amp; legal</button>' +
      '<a class="dr" href="../" target="_top"><span>🏠</span>' + esc(C.brand.name) + " home</a>" +
      '<p class="drawer-fine">Milford, MI · A joke. Not a real ride.</p>';
  }
  function openDrawer() { drawer.hidden = false; drawerBg.hidden = false; }
  function closeDrawer() { drawer.hidden = true; drawerBg.hidden = true; }

  /* ----------------------------------------------------------- location */
  function locate(explicit) {
    if (!("geolocation" in navigator)) {
      if (explicit) toast(C.noLocationJoke);
      return;
    }
    if (explicit) toast("Finding you…");
    navigator.geolocation.getCurrentPosition(function (pos) {
      var p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      M.showUser(p);
      if (!G.inArea(p)) {
        if (explicit) outOfArea(); else toast(C.serviceArea.outsideOnLaunch);
        return;
      }
      var place = { icon: "◎", name: "Current location", sub: "Near you", lat: p.lat, lng: p.lng };
      G.reverse(p).then(function (d) {
        if (d) { place.name = d.name; place.sub = "Current location"; }
        if (S.view === "home" && S.pickup === place) renderHome();
        if (!searchEl.hidden && S.pickup === place) { var inp = byId("in-pickup"); if (inp) inp.value = place.name; }
      });
      if (explicit) {
        setPlace("pickup", place);
      } else if (S.view === "home" && S.pickupIsDefault) {
        S.pickup = place;
        S.pickupIsDefault = false;
        goHome();
      }
    }, function () {
      if (explicit) toast(C.noLocationJoke);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  /* ------------------------------------------------------------ install */
  var deferredPrompt = null;
  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; });

  function install() {
    closeDrawer();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; }, function () { deferredPrompt = null; });
      return;
    }
    showModal("Install " + C.brand.name,
      '<p><b>iPhone:</b> open this page in Safari, tap the Share button, then <b>Add to Home Screen</b>.</p>' +
      '<p><b>Android:</b> open this page in Chrome, tap the ⋮ menu, then <b>Install app</b> or <b>Add to Home screen</b>.</p>' +
      '<p class="muted small">You get a ' + esc(C.brand.name) + " icon that opens full screen, like a real app. Because it basically is one.</p>",
      [{ label: "Got it", primary: true }]);
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    var local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (location.protocol !== "https:" && !local) return;
    navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(function () { /* optional */ });
  }

  /* ------------------------------------------------------------ clicks */
  var handlers = {
    menu: openDrawer,
    "close-drawer": closeDrawer,
    back: function () {
      if (S.view === "pin") { var f = S.pinField; leavePin(); openSearch(f); return; }
      if (S.view === "choose") { S.dropoff = null; goHome(); }
    },
    "open-search": function (el) { openSearch(el.getAttribute("data-field")); },
    "close-search": closeSearch,
    "pick-result": function (el) { pickResult(Number(el.getAttribute("data-idx"))); },
    "quick-dest": function (el) {
      var p = placeById(el.getAttribute("data-id"));
      if (p) setPlace("dropoff", copyPlace(p));
    },
    now: function () { toast(C.scheduleJoke); },
    "confirm-pin": confirmPin,
    "edit-trip": function () { openSearch("dropoff"); },
    tier: function (el) { selectTier(el.getAttribute("data-id")); },
    breakdown: showBreakdown,
    wallet: function () { closeDrawer(); toast(C.brand.walletJoke); },
    request: request,
    "cancel-search": cancelSearch,
    "open-chat": openChat,
    "quick-reply": function (el) { sendChat(C.chat.quickReplies[Number(el.getAttribute("data-idx"))]); },
    call: function () { toast(fill(pick(C.callJokes))); },
    share: shareTrip,
    safety: showSafety,
    "ask-cancel": askCancel,
    "start-trip": startTrip,
    rate: function (el) {
      S.trip.rating = Number(el.getAttribute("data-n"));
      renderReceipt(true);
    },
    tip: function (el) {
      var before = S.trip.tipPours;
      S.trip.tipPours = Number(el.getAttribute("data-pours"));
      renderReceipt(true);
      if (S.trip.tipPours > 0 && S.trip.tipPours !== before) toast(fill(C.tipThanks));
    },
    done: finishReceipt,
    trips: openTrips,
    "clear-trips": function () {
      showModal("Clear trip history?", "<p>This only clears trips saved on this device.</p>", [
        { label: "Keep them", primary: true },
        { label: "Clear", fn: function () { storeTrips([]); openTrips(); } },
      ]);
    },
    "close-page": closePage,
    about: showAbout,
    install: install,
  };

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var fn = handlers[el.getAttribute("data-action")];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!modalBg.hidden) closeModal();
    else if (!drawer.hidden) closeDrawer();
    else if (!page.hidden) closePage();
    else if (!searchEl.hidden) closeSearch();
  });

  window.addEventListener("resize", function () {
    syncSheetHeight();
    if (S.view === "pin") {
      var pt = pinPoint();
      pinEl.style.left = pt.x + "px";
      pinEl.style.top = pt.y + "px";
    }
  });

  /* ------------------------------------------------------------- start */
  function start() {
    S.pickup = downtown();
    var pu = params.get("pickup") && placeById(params.get("pickup"));
    var dr = params.get("dropoff") && placeById(params.get("dropoff"));
    var tier = params.get("tier") && tierById(params.get("tier"));
    if (pu) { S.pickup = copyPlace(pu); S.pickupIsDefault = false; }
    if (tier && !tier.unavailable) S.tierId = tier.id;
    if (isStandalone() || EMBED) body.classList.add("no-install");

    M.init("map", [S.pickup.lat, S.pickup.lng], 15);
    buildDrawer();

    if (dr && G.miles(S.pickup, dr) >= (C.serviceArea.sameSpotMiles || 0.03)) {
      S.dropoff = copyPlace(dr);
      goChoose();
    } else {
      goHome();
    }
    if (!EMBED && !pu) locate(false);
    registerSW();
  }

  start();
})();
