/* Reiter „Original“: zeigt die originalen Arbeitsblätter (PDF) mit pdf.js – offline, ohne CDN.
   Das AB bleibt darunter aufgebaut; der Leser liegt nur darüber. */
(function () {
  'use strict';
  var cfg = window.ORIGINAL;
  var feld = document.getElementById('original');
  var buehne = document.getElementById('pdf-buehne');
  if (!cfg || !feld || !window.pdfjsLib) { return; }
  pdfjsLib.GlobalWorkerOptions.workerSrc = cfg.worker;

  var knoepfe = document.querySelectorAll('.reiter-knopf');
  var MERK = 'ab-reiter';
  var pdf = null, zoom = 1, seitenEl = [], geladen = false, renderLauf = 0;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- Reiter umschalten ----------
  function zeige(reiter) {
    var orig = reiter === 'original';
    feld.hidden = !orig;
    document.body.classList.toggle('zeigt-original', orig);
    knoepfe.forEach(function (k) {
      var an = k.getAttribute('data-reiter') === reiter;
      k.classList.toggle('aktiv', an);
      k.setAttribute('aria-selected', an ? 'true' : 'false');
    });
    try { sessionStorage.setItem(MERK, reiter); } catch (e) { /* privat-modus */ }
    if (orig && !geladen) { laden(); }
  }
  knoepfe.forEach(function (k) {
    k.addEventListener('click', function () { zeige(k.getAttribute('data-reiter')); });
  });
  $('pdf-zum-ab').addEventListener('click', function () { zeige('ab'); });

  // ---------- PDF laden und zeichnen ----------
  function laden() {
    geladen = true;
    pdfjsLib.getDocument({ url: cfg.url, withCredentials: true }).promise.then(function (d) {
      pdf = d;
      $('pdf-seiten').textContent = d.numPages;
      buehne.innerHTML = '';
      seitenEl = [];
      for (var i = 0; i < d.numPages; i++) {
        var c = document.createElement('canvas');
        c.setAttribute('data-seite', i + 1);
        c.setAttribute('aria-label', 'Seite ' + (i + 1));
        buehne.appendChild(c);
        seitenEl.push(c);
      }
      zeichnen();
    }).catch(function () {
      geladen = false;
      buehne.innerHTML = '<div class="original-lade">Das Original konnte nicht geladen werden. Bitte Seite neu laden.</div>';
    });
  }

  function verfuegbareBreite() { return Math.max(200, buehne.clientWidth - 24); }

  function zeichnen() {
    if (!pdf) { return; }
    var lauf = ++renderLauf, dpr = Math.min(window.devicePixelRatio || 1, 3);
    $('pdf-zoom').textContent = Math.round(zoom * 100) + ' %';
    var kette = Promise.resolve();
    seitenEl.forEach(function (c, i) {
      kette = kette.then(function () {
        if (lauf !== renderLauf) { return; }
        return pdf.getPage(i + 1).then(function (seite) {
          var basis = seite.getViewport({ scale: 1 });
          var massstab = verfuegbareBreite() / basis.width * zoom;
          var vp = seite.getViewport({ scale: massstab * dpr });
          c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
          c.style.width = Math.floor(vp.width / dpr) + 'px';
          c.style.height = Math.floor(vp.height / dpr) + 'px';
          return seite.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        });
      });
    });
    kette.then(knoepfeAktualisieren);
  }

  // ---------- Bedienung ----------
  function aktuelleSeite() {
    var mitte = buehne.scrollTop + buehne.clientHeight / 3, nr = 1;
    seitenEl.forEach(function (c, i) { if (c.offsetTop <= mitte) { nr = i + 1; } });
    return nr;
  }
  function knoepfeAktualisieren() {
    var nr = aktuelleSeite();
    $('pdf-seite').textContent = nr;
    $('pdf-zurueck').disabled = nr <= 1;
    $('pdf-vor').disabled = !pdf || nr >= pdf.numPages;
  }
  function gehe(nr) {
    var c = seitenEl[nr - 1];
    if (c) { buehne.scrollTo({ top: c.offsetTop - 12, behavior: 'smooth' }); }
  }
  function setzeZoom(z) {
    var anteil = buehne.scrollTop / Math.max(1, buehne.scrollHeight);
    zoom = Math.min(3, Math.max(0.5, Math.round(z * 100) / 100));
    zeichnen();
    setTimeout(function () { buehne.scrollTop = anteil * buehne.scrollHeight; }, 60);
  }
  $('pdf-zurueck').addEventListener('click', function () { gehe(aktuelleSeite() - 1); });
  $('pdf-vor').addEventListener('click', function () { gehe(aktuelleSeite() + 1); });
  $('pdf-gross').addEventListener('click', function () { setzeZoom(zoom + 0.25); });
  $('pdf-klein').addEventListener('click', function () { setzeZoom(zoom - 0.25); });
  $('pdf-breite').addEventListener('click', function () { setzeZoom(1); });
  buehne.addEventListener('scroll', knoepfeAktualisieren, { passive: true });

  var breiteVorher = 0;
  window.addEventListener('resize', function () {
    var b = buehne.clientWidth;
    if (pdf && !feld.hidden && Math.abs(b - breiteVorher) > 30) { breiteVorher = b; zeichnen(); }
  });

  // Start: zuletzt gewählter Reiter, sonst das Original (erster Reiter)
  var start = 'original';
  try { start = sessionStorage.getItem(MERK) || 'original'; } catch (e) { /* egal */ }
  zeige(start);
  breiteVorher = buehne.clientWidth;
})();
