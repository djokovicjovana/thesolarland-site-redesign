/* The Solar Land: site behaviour. No cookies, no tracking; forms hand the message to the visitor's email app. */
(function () {
  'use strict';
  var doc = document;

  /* ---------- footer year ---------- */
  doc.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- header border once the page scrolls ---------- */
  var header = doc.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- mobile menu ---------- */
  var toggle = doc.querySelector('.nav-toggle');
  var nav = doc.getElementById('main-nav');
  if (toggle && nav) {
    var closeNav = function () { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); };
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeNav(); toggle.focus(); }
    });
    var wide = window.matchMedia('(min-width: 961px)');
    var onWide = function (m) { if (m.matches) closeNav(); };
    if (wide.addEventListener) wide.addEventListener('change', onWide); else wide.addListener(onWide);
  }

  /* ---------- images from the media library: show the placeholder if one fails ---------- */
  doc.querySelectorAll('img[data-fallback]').forEach(function (img) {
    var broken = function () { img.classList.add('is-broken'); };
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) broken();
    else img.addEventListener('error', broken);
  });

  /* ---------- forms: the message goes to the team's inbox ----------
     Default: opens the visitor's email app with the message ready (works on any static host).
     To use a form service instead, put its URL in data-endpoint on the form. */
  var INBOX = 'info@thesolarland.com';
  function showDone(form) {
    var done = doc.getElementById(form.getAttribute('data-done'));
    if (!done) return;
    form.hidden = true;
    done.hidden = false;
    done.setAttribute('tabindex', '-1');
    done.focus();
  }
  function messageLines(form) {
    var lines = [];
    form.querySelectorAll('[name]').forEach(function (el) {
      if (el.type === 'checkbox' || (el.type === 'radio' && !el.checked) || !el.value) return;
      var label = el.getAttribute('data-label') || el.name;
      lines.push(el.name === 'message' ? '\n' + label + ':\n' + el.value : label + ': ' + el.value);
    });
    return lines.join('\n');
  }
  doc.querySelectorAll('form[data-mail]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var endpoint = form.getAttribute('data-endpoint');
      var openMail = function () {
        var subject = form.getAttribute('data-subject') || 'Website message';
        var name = form.querySelector('[name="name"]');
        if (name && name.value) subject += ' from ' + name.value;
        window.location.href = 'mailto:' + INBOX + '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(messageLines(form));
        showDone(form);
      };
      if (endpoint && window.fetch) {
        fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(function (r) { if (r.ok) showDone(form); else openMail(); })
          .catch(openMail);
      } else {
        openMail();
      }
    });
  });

  /* ---------- contact form: a phone number is needed when someone asks for a call ---------- */
  var phone = doc.getElementById('c-phone');
  var phoneOpt = doc.getElementById('c-phone-opt');
  function syncPhone() {
    var call = doc.querySelector('input[name="via"][value="Phone call"]');
    if (!phone || !call) return;
    phone.required = call.checked;
    if (phoneOpt) phoneOpt.hidden = call.checked;
  }
  doc.querySelectorAll('input[name="via"]').forEach(function (radio) { radio.addEventListener('change', syncPhone); });
  /* "Book a call" and "special offer" links arrive with the form already set */
  if (phone) {
    var params = new URLSearchParams(window.location.search);
    if (params.get('via') === 'call') {
      var callRadio = doc.querySelector('input[name="via"][value="Phone call"]');
      if (callRadio) callRadio.checked = true;
    }
    if (params.get('amount') === 'over-1m') {
      var amountSelect = doc.getElementById('c-amount');
      if (amountSelect) amountSelect.value = 'Over €1,000,000';
    }
    syncPhone();
  }

  /* ---------- return calculator ---------- */
  var calc = doc.querySelector('[data-calc]');
  if (calc) initCalc(calc);

  function initCalc(root) {
    /* Rates and ratios come from the example in the original calculator:
       €1,500 → €65 a year contractual (4.33%), €97.50 a year estimated (6.5%),
       0.875 MWh energy share, 0.25 households, 875 kg CO2. */
    var RATE_C = 13 / 300;
    var RATE_E = 0.065;
    var YEARS = 25;
    var MWH_PER_EUR = 7 / 12000;
    var MWH_PER_HOME = 3.5;
    var T_CO2_PER_MWH = 1;

    var input = root.querySelector('#amount');
    var range = root.querySelector('#amount-range');
    var presets = root.querySelectorAll('[data-amount]');
    var wrap = root.querySelector('.chart-plot');
    var plot = root.querySelector('[data-chart]');
    var tip = root.querySelector('.chart-tip');
    var tbody = root.querySelector('[data-table] tbody');
    var live = root.querySelector('[data-live]');
    var big = root.querySelector('[data-big]');

    var eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    var eur2 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var num0 = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 });
    /* small yearly amounts keep their cents, e.g. €97.50 on €1,500 */
    function money(v) { return (v < 1000 && Math.abs(v - Math.round(v)) > 0.004) ? eur2.format(v) : eur.format(v); }
    function out(k) { return root.querySelector('[data-out="' + k + '"]'); }
    function parse(s) { var n = parseInt(String(s).trim().replace(/[.,]\d{1,2}$/, '').replace(/[^0-9]/g, ''), 10); return isNaN(n) ? 0 : Math.min(n, 100000000); }
    function fmtShare(v) { return v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : num0.format(v); }
    function fmtOne(v) { return v < 10 ? v.toFixed(1) : num0.format(v); }

    var amount = parse(input.value) || 10000;
    var state = { c: 0, e: 0, active: -1 };
    var geo = null;
    var liveTimer;

    function update(from) {
      var lo = +range.min, hi = +range.max;
      var clamped = Math.min(Math.max(amount, lo), hi);
      if (from !== 'range') range.value = String(clamped);
      if (from !== 'input') input.value = num0.format(amount);
      range.style.setProperty('--p', ((clamped - lo) / (hi - lo) * 100) + '%');
      range.setAttribute('aria-valuetext', eur.format(amount));
      presets.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-amount') === amount)); });

      var c = amount * RATE_C, e = amount * RATE_E, mwh = amount * MWH_PER_EUR;
      state.c = c; state.e = e;
      out('c-year').textContent = money(c);
      out('e-year').textContent = money(e);
      out('c-total').textContent = eur.format(c * YEARS);
      out('e-total').textContent = eur.format(e * YEARS);
      out('mwh').textContent = fmtShare(mwh) + ' MWh';
      out('homes').textContent = fmtOne(mwh / MWH_PER_HOME);
      out('co2').textContent = fmtOne(mwh * T_CO2_PER_MWH) + ' t';
      if (big) big.hidden = amount <= 1000000;
      draw();
      fillTable();

      clearTimeout(liveTimer);
      liveTimer = setTimeout(function () {
        live.textContent = 'For ' + eur.format(amount) + ': contractual return ' + money(c) + ' a year, ' +
          eur.format(c * YEARS) + ' over 25 years. Estimated return ' + money(e) + ' a year.';
      }, 700);
    }

    /* chart helpers */
    function niceStep(max) {
      var raw = max / 4;
      var pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
      var n = raw / pow;
      return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
    }
    function compact(v) {
      if (v === 0) return '€0';
      if (v >= 1e6) return '€' + +(v / 1e6).toFixed(1) + 'M';
      if (v >= 1e3) return '€' + +(v / 1e3).toFixed(1) + 'K';
      return '€' + Math.round(v);
    }
    /* a column grows from a square baseline; only the data end is rounded */
    function bar(x, y, w, h, r) {
      if (h <= 0.5) return '';
      if (!r) return 'M' + x + ',' + (y + h) + 'V' + y + 'H' + (x + w) + 'V' + (y + h) + 'Z';
      r = Math.min(r, w / 2, h);
      return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
        'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
    }

    function draw() {
      var W = Math.max(260, Math.floor(plot.clientWidth));
      var narrow = W < 470;
      var H = 236, padL = 46, padR = narrow ? 8 : 100, padT = 16, axisH = 30;
      var plotH = H - padT - axisH;
      var slots = YEARS + 2;
      var slotW = (W - padL - padR) / slots;
      var colW = Math.max(3, Math.min(24, slotW - 2));
      var c = state.c, e = state.e;
      var maxV = Math.max(e * YEARS, 100);
      var step = niceStep(maxV);
      var top = Math.ceil(maxV / step - 1e-9) * step;
      var y = function (v) { return padT + plotH - (v / top) * plotH; };
      var base = y(0);
      var s = '';

      for (var t = 0; t <= top + step / 1000; t += step) {
        var yy = Math.round(y(t)) + 0.5;
        s += '<line class="grid' + (t === 0 ? ' base' : '') + '" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + yy + '" y2="' + yy + '"/>';
        s += '<text class="tick" x="' + (padL - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + compact(t) + '</text>';
      }
      /* build period: up to 2 years, no payouts */
      s += '<rect class="build" x="' + (padL + 1) + '" y="' + (base - 5) + '" width="' + (slotW * 2 - 2) + '" height="5" rx="2"/>';
      s += '<text class="tick" x="' + (padL + slotW) + '" y="' + (H - 9) + '" text-anchor="middle">Build</text>';

      var cols = [];
      for (var i = 1; i <= YEARS; i++) {
        var x = padL + slotW * (i + 1) + (slotW - colW) / 2;
        var yC = y(c * i), yE = y(e * i);
        cols.push({ x: x, yE: yE });
        s += '<g data-col="' + (i + 1) + '">';
        s += '<path class="col-c" d="' + bar(x, yC, colW, base - yC, 0) + '"/>';
        s += '<path class="col-e" d="' + bar(x, yE, colW, (yC - 2) - yE, Math.min(4, colW / 2)) + '"/>';
        s += '</g>';
        if ((i === 1 && !narrow) || i % 5 === 0) {
          s += '<text class="tick" x="' + (x + colW / 2) + '" y="' + (H - 9) + '" text-anchor="middle">' + i + '</text>';
        }
      }
      if (!narrow) {
        var lx = padL + slotW * slots + 10;
        var yEnd = y(e * YEARS), yCEnd = y(c * YEARS);
        s += '<text class="end-label" x="' + lx + '" y="' + (yEnd + 4) + '">' + eur.format(e * YEARS) + '</text>';
        s += '<text class="end-sub" x="' + lx + '" y="' + (yEnd + 19) + '">estimated</text>';
        s += '<text class="end-label" x="' + lx + '" y="' + (yCEnd + 4) + '">' + eur.format(c * YEARS) + '</text>';
        s += '<text class="end-sub" x="' + lx + '" y="' + (yCEnd + 19) + '">contractual</text>';
      }
      for (var j = 0; j < slots; j++) {
        s += '<rect class="hit" data-i="' + j + '" x="' + (padL + slotW * j) + '" y="' + padT + '" width="' + slotW + '" height="' + (plotH + 6) + '"/>';
      }
      plot.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" focusable="false">' + s + '</svg>';
      geo = { padL: padL, slotW: slotW, colW: colW, base: base, cols: cols };
      if (state.active >= 0) showTip(state.active);
    }

    function showTip(i) {
      if (!geo) return;
      state.active = i;
      wrap.classList.add('has-active');
      plot.querySelectorAll('g[data-col]').forEach(function (g) { g.classList.toggle('is-on', +g.getAttribute('data-col') === i); });
      var html, x, yTop;
      if (i < 2) {
        html = '<b>Build period</b><br>Up to 2 years, no payouts yet';
        x = geo.padL + geo.slotW;
        yTop = geo.base - 8;
      } else {
        var yr = i - 1, col = geo.cols[yr - 1];
        html = '<b>After year ' + yr + '</b><br>Contractual: ' + eur.format(state.c * yr) + '<br>Estimated: ' + eur.format(state.e * yr);
        x = col.x + geo.colW / 2;
        yTop = col.yE;
      }
      tip.innerHTML = html;
      var w = wrap.clientWidth, tw = tip.offsetWidth || 160;
      tip.style.left = Math.min(Math.max(x, tw / 2 + 2), w - tw / 2 - 2) + 'px';
      tip.style.top = yTop + 'px';
      tip.classList.add('is-on');
    }
    function hideTip() {
      state.active = -1;
      wrap.classList.remove('has-active');
      tip.classList.remove('is-on');
      plot.querySelectorAll('g.is-on').forEach(function (g) { g.classList.remove('is-on'); });
    }
    function fromPointer(ev) {
      var hit = ev.target && ev.target.closest ? ev.target.closest('.hit') : null;
      if (hit) showTip(+hit.getAttribute('data-i'));
    }
    wrap.addEventListener('pointermove', fromPointer);
    wrap.addEventListener('pointerdown', fromPointer);
    wrap.addEventListener('pointerleave', hideTip);
    wrap.addEventListener('focus', function () { showTip(state.active >= 0 ? state.active : YEARS + 1); });
    wrap.addEventListener('blur', hideTip);
    wrap.addEventListener('keydown', function (ev) {
      var i = state.active < 0 ? YEARS + 1 : state.active;
      if (ev.key === 'ArrowLeft') i = Math.max(0, i - 1);
      else if (ev.key === 'ArrowRight') i = Math.min(YEARS + 1, i + 1);
      else if (ev.key === 'Home') i = 0;
      else if (ev.key === 'End') i = YEARS + 1;
      else return;
      ev.preventDefault();
      showTip(i);
    });

    function fillTable() {
      var rows = '';
      for (var i = 1; i <= YEARS; i++) {
        rows += '<tr><td>Year ' + i + '</td><td>' + eur.format(state.c * i) + '</td><td>' + eur.format(state.e * i) + '</td></tr>';
      }
      tbody.innerHTML = rows;
    }

    input.addEventListener('input', function () { amount = parse(input.value); update('input'); });
    input.addEventListener('blur', function () { input.value = num0.format(amount); });
    range.addEventListener('input', function () { amount = parseInt(range.value, 10); update('range'); });
    presets.forEach(function (b) { b.addEventListener('click', function () { amount = +b.getAttribute('data-amount'); update(); }); });

    if ('ResizeObserver' in window) {
      var lastW = 0;
      new ResizeObserver(function () {
        var w = Math.floor(plot.clientWidth);
        if (w !== lastW) { lastW = w; draw(); }
      }).observe(plot);
    } else {
      window.addEventListener('resize', draw);
    }
    update();
  }

})();
