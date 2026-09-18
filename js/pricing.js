/* BBUber fare maths. Reads every number from js/config.js.
   Used by the landing page estimator and by the app, so both always agree. */
(function () {
  "use strict";
  var C = window.BBUBER;

  function cents(n) { return Math.round(n * 100) / 100; }

  function money(n) {
    return "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function pourCount(amount) {
    return amount / C.pricing.pourPrice;
  }

  function pours(amount) {
    var p = pourCount(amount);
    var shown = p >= 10 ? String(Math.round(p)) : p.toFixed(1);
    return shown + (shown === "1.0" ? " pour" : " pours");
  }

  // Derby Day is the first Saturday in May.
  function isDerbyDay(d) {
    return d.getMonth() === 4 && d.getDay() === 6 && d.getDate() <= 7;
  }

  // Which proof multiplier (surge) applies at this moment?
  function surge(date) {
    var S = C.surge;
    var d = date || new Date();
    var best = { multiplier: 1, label: "Standard proof. Smooth sailing." };

    if (typeof S.forceMultiplier === "number" && S.forceMultiplier > 0) {
      best = { multiplier: S.forceMultiplier, label: "The proof multiplier is on." };
    } else {
      var day = d.getDay();
      var hour = d.getHours() + d.getMinutes() / 60;
      var yesterday = (day + 6) % 7;
      (S.schedule || []).forEach(function (rule) {
        var today = rule.days.indexOf(day) !== -1 && hour >= rule.from && hour < Math.min(rule.to, 24);
        var spill = rule.to > 24 && rule.days.indexOf(yesterday) !== -1 && hour < rule.to - 24;
        if ((today || spill) && rule.multiplier > best.multiplier) {
          best = { multiplier: rule.multiplier, label: rule.label };
        }
      });
      if (S.derbyDay && isDerbyDay(d) && S.derbyDay.multiplier > best.multiplier) {
        best = { multiplier: S.derbyDay.multiplier, label: S.derbyDay.label };
      }
    }
    best.proof = Math.round((S.baseProof || 80) * best.multiplier);
    best.active = best.multiplier > 1;
    return best;
  }

  // Upfront price for one ride type. Every line is rounded to the cent
  // and the total is the sum of the lines, so the receipt always adds up.
  function quote(tier, miles, minutes, sg) {
    var P = C.pricing;
    sg = sg || surge();
    var lines = [];
    var base = P.baseFare;
    var dist = P.perMile * miles;
    var time = P.perMinute * minutes;
    var raw = base + dist + time;
    var afterTier = raw * tier.multiplier;
    var afterSurge = afterTier * sg.multiplier;

    lines.push({ label: "Base fare", amount: base });
    lines.push({ label: "Distance (" + miles.toFixed(1) + " mi)", amount: dist });
    lines.push({ label: "Time (" + Math.max(1, Math.round(minutes)) + " min)", amount: time });
    if (tier.multiplier !== 1) {
      lines.push({ label: tier.name + " upgrade (" + tier.multiplier + "×)", amount: afterTier - raw });
    }
    if (sg.multiplier > 1) {
      lines.push({ label: "Proof multiplier " + sg.multiplier + "× (" + sg.proof + " proof)", amount: afterSurge - afterTier });
    }
    if (afterSurge < P.minimumFare) {
      lines.push({ label: "Minimum fare top-up", amount: P.minimumFare - afterSurge });
    }
    if (tier.extraFee) lines.push({ label: tier.extraFee.label, amount: tier.extraFee.amount });
    (C.receiptFees || []).forEach(function (f) { lines.push({ label: f.label, amount: f.amount }); });

    var total = 0;
    lines.forEach(function (l) { l.amount = cents(l.amount); total += l.amount; });
    total = cents(total);
    return { tierId: tier.id, total: total, lines: lines, pours: pours(total) };
  }

  function quoteAll(miles, minutes, date) {
    var sg = surge(date);
    return C.tiers.map(function (t) {
      var q = quote(t, miles, minutes, sg);
      q.tier = t;
      q.surge = sg;
      return q;
    });
  }

  window.BBPricing = {
    money: money,
    pours: pours,
    pourCount: pourCount,
    surge: surge,
    quote: quote,
    quoteAll: quoteAll,
  };
})();
