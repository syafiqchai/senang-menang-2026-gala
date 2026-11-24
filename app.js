(function () {
  "use strict";
  var CFG = window.REVIEW_CONFIG || {};
  var EVENT = (CFG.eventName || "our event").trim();
  var HIGHLIGHTS = CFG.highlights || [];
  var LANGS = CFG.languages || [["English", "English"]];
  var LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';

  var COMPANIONS = CFG.companions || [];
  var TONES = [["malaysian", "Malaysian casual"], ["casual", "Casual"], ["warm", "Warm"], ["professional", "Professional"], ["auto", "Surprise me"]];
  var tone = CFG.defaultTone || "malaysian";
  var rating = 0, lang = LANGS[0][0], who = "", picked = {}, busy = false;
  var $ = function (id) { return document.getElementById(id); };

  document.title = "Review " + EVENT;
  $("title").textContent = "How was " + EVENT + "?";

  // Stars
  var starsEl = $("stars");
  for (var i = 1; i <= 5; i++) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "star";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", "false");
    b.setAttribute("aria-label", i + " star" + (i > 1 ? "s" : "") + ", " + LABELS[i]);
    b.dataset.v = i;
    b.innerHTML = STAR;
    b.addEventListener("click", function (e) { setRating(+e.currentTarget.dataset.v); });
    starsEl.appendChild(b);
  }
  function setRating(v) {
    rating = v;
    Array.prototype.forEach.call(starsEl.children, function (s) {
      s.classList.toggle("on", +s.dataset.v <= v);
      s.setAttribute("aria-checked", String(+s.dataset.v === v));
    });
    $("ratingLabel").textContent = LABELS[v];
    $("detailsCard").hidden = false;
  }

  // Highlights
  HIGHLIGHTS.forEach(function (t) {
    var c = document.createElement("button");
    c.type = "button";
    c.className = "chip";
    c.textContent = t;
    c.setAttribute("aria-pressed", "false");
    c.addEventListener("click", function () {
      picked[t] = !picked[t];
      c.setAttribute("aria-pressed", String(!!picked[t]));
    });
    $("chips").appendChild(c);
  });

  // Languages
  LANGS.forEach(function (l) {
    var c = document.createElement("button");
    c.type = "button";
    c.className = "chip";
    c.textContent = l[1];
    c.setAttribute("aria-pressed", String(l[0] === lang));
    c.addEventListener("click", function () {
      lang = l[0];
      Array.prototype.forEach.call($("langs").children, function (x) { x.setAttribute("aria-pressed", "false"); });
      c.setAttribute("aria-pressed", "true");
    });
    $("langs").appendChild(c);
  });

  // Who they came with (tap again to clear)
  if (!COMPANIONS.length) $("who").parentNode.hidden = true;
  COMPANIONS.forEach(function (t) {
    var c = document.createElement("button");
    c.type = "button";
    c.className = "chip";
    c.textContent = t;
    c.setAttribute("aria-pressed", "false");
    c.addEventListener("click", function () {
      var already = who === t;
      who = already ? "" : t;
      Array.prototype.forEach.call($("who").children, function (x) { x.setAttribute("aria-pressed", "false"); });
      c.setAttribute("aria-pressed", String(!already));
    });
    $("who").appendChild(c);
  });

  // Tone
  TONES.forEach(function (t) {
    var c = document.createElement("button");
    c.type = "button";
    c.className = "chip";
    c.textContent = t[1];
    c.setAttribute("aria-pressed", String(t[0] === tone));
    c.addEventListener("click", function () {
      tone = t[0];
      Array.prototype.forEach.call($("tones").children, function (x) { x.setAttribute("aria-pressed", "false"); });
      c.setAttribute("aria-pressed", "true");
    });
    $("tones").appendChild(c);
  });

  function chosen() { return HIGHLIGHTS.filter(function (t) { return picked[t]; }); }
  function joinList(a) {
    if (a.length <= 1) return a.join("");
    return a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  }

  // Used only if the server cannot be reached. English only.
  function fallbackDraft() {
    var tags = chosen().map(function (t) { return t.toLowerCase(); });
    var c = ($("comment").value || "").trim();
    var opens = rating >= 4
      ? ["I really enjoyed " + EVENT + ".", "Had a great time at " + EVENT + ".", EVENT + " was a good one."]
      : rating === 3
        ? ["I had a decent time at " + EVENT + ".", EVENT + " was okay overall."]
        : ["I went to " + EVENT + " and have some feedback.", EVENT + " didn't fully work for me."];
    var open = opens[Math.floor(Math.random() * opens.length)];
    var mid = tags.length ? (rating >= 4 ? " I especially liked the " : " The ") + joinList(tags) + (rating >= 4 ? "." : " stood out.") : "";
    var tail = c ? " " + c.charAt(0).toUpperCase() + c.slice(1) + (/[.!?]$/.test(c) ? "" : ".") : "";
    return open + mid + tail;
  }

  async function requestDraft() {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 20000);
    try {
      var res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: EVENT,
          rating: rating,
          highlights: chosen(),
          comment: ($("comment").value || "").trim(),
          who: who,
          tone: tone,
          language: lang
        }),
        signal: ctrl.signal
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.status === 429) { var e = new Error("rate"); e.rate = true; throw e; }
      if (!res.ok || !data.review) throw new Error(data.error || "failed");
      return data.review;
    } finally {
      clearTimeout(timer);
    }
  }

  async function generate() {
    if (busy || !rating) return;
    busy = true;
    $("makeBtn").disabled = true;
    $("regenBtn").disabled = true;
    $("makeStatus").textContent = "Writing your review...";
    var text, basic = false;
    try {
      text = await requestDraft();
    } catch (err) {
      text = fallbackDraft();
      basic = true;
      if (err && err.rate) $("makeStatus").textContent = "Too many drafts just now. Here is a basic version you can edit.";
    }
    $("draft").value = text;
    updateCount();
    $("draftCard").hidden = false;
    if (!($("makeStatus").textContent.indexOf("Too many") === 0)) {
      $("makeStatus").textContent = basic ? "Draft ready below (basic version). You can edit it." : "Draft ready below.";
    }
    $("copyStatus").textContent = "";
    $("draftCard").scrollIntoView({ behavior: "smooth", block: "start" });
    busy = false;
    $("makeBtn").disabled = false;
    $("regenBtn").disabled = false;
  }
  $("makeBtn").addEventListener("click", generate);
  $("regenBtn").addEventListener("click", generate);

  function updateCount() {
    var n = ($("draft").value.trim().match(/\S+/g) || []).length;
    $("count").textContent = n + " word" + (n === 1 ? "" : "s");
  }
  $("draft").addEventListener("input", updateCount);

  // Copy, then let the link open Google in a new tab.
  var link = (CFG.googleReviewUrl || "").trim();
  var linkReady = /^https:\/\//.test(link) && link.indexOf("YOUR-ID") === -1;
  $("googleBtn").addEventListener("click", function (e) {
    var text = $("draft").value.trim();
    if (!text) { e.preventDefault(); $("copyStatus").textContent = "The review is empty."; return; }
    if (!linkReady) {
      e.preventDefault();
      $("copyStatus").textContent = "Setup needed: add your Google review link in public/config.js.";
    } else {
      this.href = link;
    }
    var fail = function () {
      $("draft").focus();
      $("draft").select();
      $("copyStatus").textContent = "Select the text and copy it, then paste it on Google.";
    };
    var done = function () {
      if (linkReady) $("copyStatus").textContent = "Copied. Paste it on Google and tap Post.";
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
      else fail();
    } catch (err) { fail(); }
  });
})();
