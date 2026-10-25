(function () {
  var D = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Riyadh time and opening hours (minutes from Sunday-style day start; 1440+ = after midnight) ---------- */
  var H = {
    hittin: { open: [420, 420, 420, 420, 420, 420, 420], close: [1500, 1500, 1500, 1500, 1560, 1560, 1560] },
    nakheel: { open: [420, 420, 420, 420, 420, 420, 420], close: [1560, 1560, 1560, 1560, 1560, 1560, 1560] },
    rayyan: { open: [480, 480, 480, 480, 480, 480, 480], close: [1440, 1440, 1440, 1440, 1500, 1500, 1440] }
  };
  function riyadh() {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Riyadh', hourCycle: 'h23', weekday: 'short', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date());
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), mins: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
  }
  function hr(m, ar) {
    var h = Math.floor(m / 60) % 24, suf = h < 12 ? (ar ? 'ص' : 'AM') : (ar ? 'م' : 'PM');
    h = h % 12; if (h === 0) h = 12;
    return h + ' ' + suf;
  }
  function state(key, t) {
    var h = H[key], d = t.day, prev = (d + 6) % 7, m = t.mins;
    if (m >= h.open[d] && m < h.close[d]) return { open: true, until: h.close[d] };
    if (h.close[prev] > 1440 && m < h.close[prev] - 1440) return { open: true, until: h.close[prev] - 1440 };
    return { open: false, next: m < h.open[d] ? h.open[d] : h.open[(d + 1) % 7] };
  }
  function status() {
    var t = riyadh();
    Object.keys(H).forEach(function (k) {
      var s = state(k, t), ar, en;
      if (s.open) { ar = 'مفتوح الآن حتى ' + hr(s.until, true); en = 'Open now, until ' + hr(s.until, false); }
      else { ar = 'مغلق، يفتح ' + hr(s.next, true); en = 'Closed, opens at ' + hr(s.next, false); }
      $$('[data-status="' + k + '"]').forEach(function (el) {
        el.setAttribute('data-state', s.open ? 'open' : 'closed');
        var a = $('[data-l=ar]', el), e = $('[data-l=en]', el);
        if (a) a.textContent = ar; if (e) e.textContent = en;
      });
      $$('[data-today="' + k + '"]').forEach(function (el) {
        var a = $('[data-l=ar]', el), e = $('[data-l=en]', el);
        var o = H[k].open[t.day], c = H[k].close[t.day];
        if (a) a.textContent = hr(o, true) + ' - ' + hr(c, true); if (e) e.textContent = hr(o, false) + ' - ' + hr(c, false);
      });
      $$('[data-wk="' + k + '"] li').forEach(function (li) {
        var days = li.getAttribute('data-days').split(',').map(Number);
        li.classList.toggle('today', days.indexOf(t.day) > -1);
      });
    });
  }

  /* ---------- language ---------- */
  var toggle = $('#lang');
  function apply() {
    var l = D.lang;
    $$('[data-alt-ar]').forEach(function (i) { i.alt = i.getAttribute('data-alt-' + l) || ''; });
    var b = document.body, k = l === 'ar' ? 'Ar' : 'En';
    if (b.dataset['title' + k]) document.title = b.dataset['title' + k];
    var md = $('meta[name=description]');
    if (md && b.dataset['desc' + k]) md.content = b.dataset['desc' + k];
    if (toggle) toggle.setAttribute('aria-label', l === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    $$('[data-aria-ar]').forEach(function (e) { e.setAttribute('aria-label', e.getAttribute('data-aria-' + l)); });
  }
  if (toggle) toggle.addEventListener('click', function () {
    var l = D.lang === 'ar' ? 'en' : 'ar';
    D.lang = l; D.dir = l === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('fabrica-lang', l); } catch (e) {}
    apply(); status();
  });

  /* ---------- hero hand: end of the drawing ---------- */
  if (D.classList.contains('intro')) setTimeout(function () { D.classList.remove('intro'); }, 2000);

  /* ---------- menu chips ---------- */
  var chips = $$('.chip[data-cat]');
  if (chips.length) {
    var strip = $('.chips .scroll');
    var setOn = function (id) {
      chips.forEach(function (c) {
        var on = c.dataset.cat === id;
        if (on) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
        if (on && strip) {
          var cr = c.getBoundingClientRect(), sr = strip.getBoundingClientRect();
          var delta = (cr.left + cr.width / 2) - (sr.left + sr.width / 2);
          if (Math.abs(delta) > 4) strip.scrollBy({ left: delta, behavior: reduce ? 'auto' : 'smooth' });
        }
      });
    };
    chips.forEach(function (c) {
      c.addEventListener('click', function (e) {
        e.preventDefault();
        var sec = document.getElementById(c.dataset.cat);
        if (sec) { sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); try { history.replaceState(null, '', '#' + c.dataset.cat); } catch (x) {} }
        setOn(c.dataset.cat);
      });
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) setOn(e.target.id); });
      }, { rootMargin: '-150px 0px -65% 0px' });
      $$('.cat').forEach(function (s) { io.observe(s); });
    }
    if (location.hash) { var s0 = document.getElementById(location.hash.slice(1)); if (s0 && s0.classList.contains('cat')) setOn(s0.id); }
  }

  apply(); status();
  setInterval(status, 60000);
})();
