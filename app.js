(function () {
  'use strict';
  var d = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- hours (minutes from midnight, Riyadh time; close > 1440 means after midnight) ---------- */
  // index 0 = Sunday ... 6 = Saturday
  var H = {
    hittin:  [[420, 1500], [420, 1500], [420, 1500], [420, 1500], [420, 1560], [420, 1560], [420, 1560]],
    nakheel: [[420, 1560], [420, 1560], [420, 1560], [420, 1560], [420, 1560], [420, 1560], [420, 1560]],
    rayyan:  [[420, 1440], [420, 1440], [420, 1440], [420, 1440], [420, 1440], [420, 1440], [420, 1440]],
    kingdom: [[780, 1380], [780, 1380], [780, 1380], [780, 1380], [780, 1380], [960, 1380], [780, 1380]]
  };
  var NAME = {
    hittin: { ar: 'حطين', en: 'Hittin' }, nakheel: { ar: 'النخيل', en: 'An Nakheel' },
    rayyan: { ar: 'الريان', en: 'Ar Rayyan' }, kingdom: { ar: 'برج المملكة', en: 'Kingdom Tower' }
  };
  var DAY = {
    ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  };

  function riyadh() {
    // Saudi Arabia is UTC+3 all year (no daylight saving)
    var t = new Date(Date.now() + 3 * 3600 * 1000);
    return { day: t.getUTCDay(), min: t.getUTCHours() * 60 + t.getUTCMinutes() };
  }
  function fmt(min, lang) {
    var h = Math.floor(min / 60) % 24, m = min % 60;
    var mm = m ? ':' + (m < 10 ? '0' : '') + m : '';
    if (lang === 'ar') {
      var h12 = h % 12 === 0 ? 12 : h % 12;
      var p = h < 12 ? 'صباحاً' : h < 15 ? 'ظهراً' : h < 18 ? 'عصراً' : 'مساءً';
      return h12 + mm + ' ' + p;
    }
    var hh = h % 12 === 0 ? 12 : h % 12;
    return hh + mm + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  function state(key, now) {
    var s = H[key], today = s[now.day], yest = s[(now.day + 6) % 7];
    if (yest && yest[1] > 1440 && now.min < yest[1] - 1440) return { open: true, until: yest[1] };
    if (today && now.min >= today[0] && now.min < today[1]) return { open: true, until: today[1] };
    if (today && now.min < today[0]) return { open: false, at: today[0], inDays: 0, day: now.day };
    for (var k = 1; k <= 7; k++) {
      var dd = (now.day + k) % 7;
      if (s[dd]) return { open: false, at: s[dd][0], inDays: k, day: dd };
    }
    return { open: false };
  }
  function label(st, lang) {
    if (st.open) return lang === 'ar' ? 'مفتوح الآن حتى ' + fmt(st.until, 'ar') : 'Open now, until ' + fmt(st.until, 'en');
    if (st.at == null) return lang === 'ar' ? 'مغلق' : 'Closed';
    var when = st.inDays === 0 ? '' : st.inDays === 1 ? (lang === 'ar' ? 'غداً ' : 'tomorrow ') : DAY[lang][st.day] + ' ';
    return lang === 'ar' ? 'مغلق، يفتح ' + when + fmt(st.at, 'ar') : 'Closed, opens ' + when + fmt(st.at, 'en');
  }
  function todayHours(key, now, lang) {
    var t = H[key][now.day];
    if (!t) return lang === 'ar' ? 'مغلق اليوم' : 'Closed today';
    return (lang === 'ar' ? 'اليوم: ' : 'Today: ') + fmt(t[0], lang) + ' - ' + fmt(t[1], lang);
  }
  function renderStatus() {
    var lang = d.lang === 'ar' ? 'ar' : 'en', now = riyadh();
    document.querySelectorAll('[data-status]').forEach(function (el) {
      var st = state(el.getAttribute('data-status'), now);
      el.textContent = label(st, lang);
      el.classList.toggle('is-open', st.open);
      el.classList.toggle('is-closed', !st.open);
    });
    document.querySelectorAll('[data-today-hours]').forEach(function (el) {
      el.textContent = todayHours(el.getAttribute('data-today-hours'), now, lang);
    });
    document.querySelectorAll('[data-days]').forEach(function (li) {
      var days = li.getAttribute('data-days').split(',').map(Number);
      if (days.indexOf(now.day) > -1) li.setAttribute('data-today', ''); else li.removeAttribute('data-today');
    });
    var hello = document.getElementById('hello');
    if (hello) {
      var h = Math.floor(now.min / 60);
      var greet = lang === 'ar' ? (h >= 5 && h < 12 ? 'صباح الخير' : 'مساء الخير') : (h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening');
      var open = Object.keys(H).filter(function (k) { return state(k, now).open; }).map(function (k) { return NAME[k][lang]; });
      var tail = open.length ? (lang === 'ar' ? 'مفتوح الآن: ' + open.join('، ') : 'Open now: ' + open.join(', '))
                             : (lang === 'ar' ? 'كل الفروع مغلقة الآن' : 'All branches are closed right now');
      hello.textContent = greet + (lang === 'ar' ? '. ' : '. ') + tail;
    }
  }
  window.__fabricaState = function (key) { return state(key, riyadh()); };

  /* ---------- language ---------- */
  function applyLang(lang) {
    d.lang = lang; d.dir = lang === 'ar' ? 'rtl' : 'ltr';
    var b = document.body;
    if (b.dataset['title' + (lang === 'ar' ? 'Ar' : 'En')]) document.title = b.dataset[lang === 'ar' ? 'titleAr' : 'titleEn'];
    var md = document.querySelector('meta[name="description"]');
    if (md && b.dataset.descAr) md.setAttribute('content', lang === 'ar' ? b.dataset.descAr : b.dataset.descEn);
    document.querySelectorAll('[data-alt-ar]').forEach(function (im) { im.alt = lang === 'ar' ? im.dataset.altAr : im.dataset.altEn; });
    document.querySelectorAll('[data-aria-ar]').forEach(function (el) { el.setAttribute('aria-label', lang === 'ar' ? el.dataset.ariaAr : el.dataset.ariaEn); });
    renderStatus();
  }
  var btn = document.getElementById('lang');
  if (btn) btn.addEventListener('click', function () {
    var next = d.lang === 'ar' ? 'en' : 'ar';
    try { localStorage.setItem('fabrica-lang', next); } catch (e) {}
    applyLang(next);
  });
  applyLang(d.lang === 'ar' ? 'ar' : 'en');
  setInterval(renderStatus, 60000);

  /* ---------- home header: solid once the hero has scrolled away ---------- */
  var hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    var hio = new IntersectionObserver(function (es) {
      document.body.classList.toggle('solid', !es[0].isIntersecting);
    }, { rootMargin: '-64px 0px 0px 0px' });
    hio.observe(hero);
  }

  /* ---------- floor 77 counter: rolls 01 to 77 once, like a lift display ---------- */
  var num = document.querySelector('[data-floor]');
  if (num && 'IntersectionObserver' in window && !reduce) {
    var target = +num.getAttribute('data-floor'), done = false;
    num.textContent = '01';
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (done) return;
        if (e.intersectionRatio < 0.5) {
          // scrolled past it in one fling: show the final floor
          if (e.boundingClientRect.top < innerHeight * 0.5) { done = true; io.disconnect(); num.textContent = String(target); }
          return;
        }
        done = true; io.disconnect();
        var t0 = performance.now(), dur = 1400;
        var tick = setInterval(function () {
          var p = Math.min(1, (performance.now() - t0) / dur), v = Math.max(1, Math.round(1 + (target - 1) * (1 - Math.pow(1 - p, 3))));
          num.textContent = (v < 10 ? '0' : '') + v;
          if (p >= 1) { clearInterval(tick); num.textContent = String(target); }
        }, 32);
      });
    }, { threshold: [0, 0.5, 1], rootMargin: '0px 0px -22% 0px' });
    io.observe(num);
  }

  /* ---------- menu: category bar ---------- */
  var bar = document.querySelector('.cbar ul');
  if (bar) {
    var chips = Array.prototype.slice.call(bar.querySelectorAll('a'));
    var byId = {};
    chips.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var current = null;
    function setActive(id) {
      if (id === current || !byId[id]) return;
      current = id;
      chips.forEach(function (a) { a.removeAttribute('aria-current'); });
      var a = byId[id]; a.setAttribute('aria-current', 'true');
      var br = bar.getBoundingClientRect(), ar = a.getBoundingClientRect();
      if (ar.left < br.left + 16 || ar.right > br.right - 16) {
        bar.scrollBy({ left: (ar.left + ar.width / 2) - (br.left + br.width / 2), behavior: reduce ? 'auto' : 'smooth' });
      }
    }
    var secs = Array.prototype.slice.call(document.querySelectorAll('.mcat'));
    if ('IntersectionObserver' in window) {
      var vis = {};
      var mo = new IntersectionObserver(function (es) {
        es.forEach(function (e) { vis[e.target.id] = e.isIntersecting; });
        for (var i = 0; i < secs.length; i++) { if (vis[secs[i].id]) { setActive(secs[i].id); break; } }
      }, { rootMargin: '-140px 0px -55% 0px' });
      secs.forEach(function (s) { mo.observe(s); });
    }
    chips.forEach(function (a) { a.addEventListener('click', function () { setActive(a.getAttribute('href').slice(1)); }); });
  }
})();
