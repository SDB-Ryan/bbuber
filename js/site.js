/* BBUber landing page: fills the page from js/config.js and runs the fare estimator. */
(function () {
  "use strict";
  var C = window.BBUBER, P = window.BBPricing, G = window.BBGeo;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function get(path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, C);
  }

  /* Text slots: any element with data-cfg="brand.tagline" gets that text. */
  document.querySelectorAll("[data-cfg]").forEach(function (el) {
    var v = get(el.getAttribute("data-cfg"));
    if (v != null) el.textContent = v;
  });

  /* ------------------------------------------------------------ dialog */
  var dialog = $("dialog");
  function showDialog(title, html) {
    $("dialog-title").textContent = title;
    $("dialog-body").innerHTML = html;
    if (dialog.showModal) dialog.showModal(); else alert(title);
  }
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });

  /* ------------------------------------------------------ how it works */
  $("how").innerHTML = C.landing.howItWorks.map(function (s, i) {
    return '<div class="card"><span class="step">' + (i + 1) + '</span><span class="ic">' + esc(s.icon) + "</span><h3>" + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></div>";
  }).join("");

  /* ------------------------------------------------------------- tiers */
  // Sample fare on each card: downtown to the farthest listed spot, at
  // standard proof. Drawn first from a straight-line guess, then redrawn
  // with the real road route so it matches the estimator above.
  var down = C.places.filter(function (p) { return p.id === "downtown"; })[0] ||
    { name: C.serviceArea.centerName, lat: C.serviceArea.center[0], lng: C.serviceArea.center[1] };
  var far = C.places.slice().sort(function (a, b) { return G.miles(down, b) - G.miles(down, a); })[0];
  var noSurge = { multiplier: 1, proof: C.surge.baseProof || 80, active: false };
  renderTierCards(G.fallbackRoute(down, far));
  G.route(down, far).then(renderTierCards);

  function renderTierCards(sample) {
  var sampleMiles = sample.meters / 1609.344, sampleMin = sample.seconds / 60;
  $("tier-cards").innerHTML = C.tiers.map(function (t) {
    var q = P.quote(t, sampleMiles, sampleMin, noSurge);
    return '<div class="tier-card' + (t.unavailable ? " off" : "") + '">' +
      '<span class="tier-ic">' + esc(t.icon) + "</span>" +
      "<h3>" + esc(t.name) + "</h3>" +
      "<p>" + esc(t.blurb) + "</p>" +
      '<p class="tier-meta">Seats ' + esc(t.seats) + (t.multiplier !== 1 ? " · " + esc(t.multiplier) + "× fare" : " · Standard fare") + "</p>" +
      (t.unavailable
        ? '<p class="tier-price"><s>' + P.money(q.total) + "</s><small>" + esc(t.unavailableText || "Unavailable") + "</small></p>"
        : '<p class="tier-price">' + P.money(q.total) + "<small>Downtown to " + esc(far.name) + " at standard proof · ≈ " + esc(q.pours) + "</small></p>") +
      "</div>";
  }).join("");
  }

  /* ----------------------------------------------------------- pricing */
  var pr = C.pricing;
  var rateRows = [
    ["Base fare", P.money(pr.baseFare)],
    ["Per mile", P.money(pr.perMile)],
    ["Per minute", P.money(pr.perMinute)],
    ["Minimum fare", P.money(pr.minimumFare)],
  ];
  (C.receiptFees || []).forEach(function (f) { rateRows.push([f.label + " (every ride)", P.money(f.amount)]); });
  C.tiers.forEach(function (t) { if (t.extraFee && !t.unavailable) rateRows.push([t.extraFee.label + " (" + t.name + ")", P.money(t.extraFee.amount)]); });
  rateRows.push(["Cancellation after matching", P.money(pr.cancellationFee)]);
  rateRows.push(["One pour", P.money(pr.pourPrice)]);
  $("rates").innerHTML = rateRows.map(function (r) {
    return "<tr><th>" + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td></tr>";
  }).join("");

  var sg = P.surge();
  $("proof-now").innerHTML = sg.active
    ? '<span class="proof-chip">🔥 ' + sg.multiplier + "× · " + sg.proof + " proof</span><span>Right now. " + esc(sg.label) + "</span>"
    : '<span class="proof-chip calm">' + sg.proof + " proof · 1×</span><span>Right now. " + esc(sg.label) + "</span>";

  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function hour(h) {
    h = h % 24;
    var ampm = h < 12 ? "am" : "pm";
    var hh = h % 12 === 0 ? 12 : h % 12;
    return hh + ampm;
  }
  var sched = (C.surge.schedule || []).map(function (r) {
    return "<li><b>" + r.multiplier + "×</b><span>" + r.days.map(function (d) { return DAYS[d]; }).join(" & ") + " " + hour(r.from) + " to " + hour(r.to) + "</span><small>" + esc(r.label) + "</small></li>";
  });
  if (C.surge.derbyDay) {
    sched.push("<li><b>" + C.surge.derbyDay.multiplier + "×</b><span>Derby Day, all day</span><small>" + esc(C.surge.derbyDay.label) + "</small></li>");
  }
  $("proof-schedule").innerHTML = sched.join("");

  /* ------------------------------------------------------------- drive */
  $("drive-reqs").innerHTML = C.landing.driveRequirements.map(function (r) {
    return "<li>" + esc(r) + "</li>";
  }).join("");
  $("apply-drive").addEventListener("click", function () {
    showDialog(C.landing.driveApplyTitle, "<p>" + esc(C.landing.driveApplyJoke) + "</p>");
  });

  /* ------------------------------------------------ safety and reviews */
  $("safety-cards").innerHTML = C.landing.safety.map(function (s) {
    return '<div class="card"><span class="ic">' + esc(s.icon) + "</span><h3>" + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></div>";
  }).join("");
  $("reviews").innerHTML = C.landing.testimonials.map(function (t) {
    return '<figure class="card quote"><div class="stars" aria-label="5 stars">★★★★★</div><blockquote>“' + esc(t.quote) + '”</blockquote><figcaption>' + esc(t.who) + "</figcaption></figure>";
  }).join("");

  /* ----------------------------------------------------------- install */
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; });
  function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; }, function () { deferredPrompt = null; });
      return;
    }
    showDialog("Install " + C.brand.name,
      "<p><b>iPhone:</b> open this page in Safari, tap the Share button, then <b>Add to Home Screen</b>.</p>" +
      "<p><b>Android:</b> open this page in Chrome, tap the ⋮ menu, then <b>Install app</b> or <b>Add to Home screen</b>.</p>" +
      '<p class="muted">You get a ' + esc(C.brand.name) + " icon that opens straight into the app.</p>");
  }
  $("badges").innerHTML = (C.landing.appStoreBadges || []).map(function (b, i) {
    return '<button type="button" class="badge" data-badge="' + i + '"><span class="badge-ic" aria-hidden="true">' +
      (i === 0 ? "🥃" : "🛣️") + "</span><span><small>" + esc(b.small) + "</small><b>" + esc(b.big) + "</b></span></button>";
  }).join("");
  $("badges").addEventListener("click", function (e) { if (e.target.closest(".badge")) install(); });

  /* ------------------------------------------------------- the estimator */
  var pickSel = $("q-pickup"), dropSel = $("q-dropoff");
  function options(selectedId, placeholder) {
    return (placeholder ? '<option value="">' + esc(placeholder) + "</option>" : "") +
      C.places.map(function (p) {
        return '<option value="' + esc(p.id) + '"' + (p.id === selectedId ? " selected" : "") + ">" + esc(p.name) + "</option>";
      }).join("");
  }
  pickSel.innerHTML = options("downtown");
  dropSel.innerHTML = options(null, "Where to?");
  function place(id) { return C.places.filter(function (p) { return p.id === id; })[0]; }

  var results = $("quote-results"), token = 0;
  $("quote-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var a = place(pickSel.value), b = place(dropSel.value);
    if (!b) { dropSel.focus(); results.innerHTML = '<p class="q-msg">Pick a destination first. Even a bad one.</p>'; return; }
    if (a.id === b.id || G.miles(a, b) < (C.serviceArea.sameSpotMiles || 0.03)) { results.innerHTML = '<p class="q-msg">' + esc(C.serviceArea.sameSpotJoke) + "</p>"; return; }
    var my = ++token;
    results.innerHTML = '<p class="q-msg"><span class="spinner" aria-hidden="true"></span>Pouring your options…</p>';
    G.route(a, b).then(function (r) {
      if (my !== token) return;
      var miles = r.meters / 1609.344, min = r.seconds / 60;
      var quotes = P.quoteAll(miles, min);
      var s = quotes[0].surge;
      results.innerHTML =
        '<p class="q-head"><b>' + esc(a.name) + " → " + esc(b.name) + "</b><span>" + miles.toFixed(1) + " mi · about " + Math.round(min) + " min" +
        (s.active ? ' · <span class="proof-chip small">🔥 ' + s.multiplier + "× " + s.proof + " proof</span>" : "") + "</span></p>" +
        quotes.map(function (q) {
          var t = q.tier;
          if (t.unavailable) {
            return '<div class="q-row off"><span class="q-ic">' + esc(t.icon) + '</span><span class="q-name"><b>' + esc(t.name) + "</b><small>" + esc(t.unavailableText || "Unavailable") + '</small></span><span class="q-price"><s>' + P.money(q.total) + "</s></span></div>";
          }
          var href = "app/?pickup=" + encodeURIComponent(a.id) + "&dropoff=" + encodeURIComponent(b.id) + "&tier=" + encodeURIComponent(t.id);
          return '<a class="q-row" href="' + href + '"><span class="q-ic">' + esc(t.icon) + '</span><span class="q-name"><b>' + esc(t.name) + "</b><small>" + esc(t.blurb) + '</small></span><span class="q-price"><b>' + P.money(q.total) + "</b><small>≈ " + esc(q.pours) + '</small></span><span class="q-go" aria-hidden="true">›</span></a>';
        }).join("") +
        '<p class="q-note">' + esc(C.landing.estimatorNote) + " Tap a ride to request it.</p>";
    });
  });

  /* ------------------------------------------------------- phone clock */
  function tick() {
    var el = $("sb-time");
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");
  }
  tick();
  setInterval(tick, 30000);

  /* -------------------------------------------------- offline helper */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () { /* optional */ });
  }
})();
