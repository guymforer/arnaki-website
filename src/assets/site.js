// PayZo site: the page's live parts. Loaded in <head> without defer so html.js is set before paint
// (the CSP allows no inline script). Everything works without it: the static HTML shows a default
// recommendation, the open card, every FAQ answer and the first benefits tab.
document.documentElement.classList.add('js');

(function () {
  var he = document.documentElement.lang !== 'en';
  var whole = new Intl.NumberFormat(he ? 'he-IL' : 'en-IL', { maximumFractionDigits: 0 });
  var cents = new Intl.NumberFormat(he ? 'he-IL' : 'en-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var money = function (n) { var v = Math.round(n * 100) / 100; return '₪' + (v % 1 ? cents : whole).format(v); };

  // ---- the example wallet (same cards as the board on the page) ----
  var CARDS = [
    { name: he ? 'כרטיס רב-מותגי' : 'Multi-brand gift card', bal: 200, exp: '30.11.2026', cats: ['fashion', 'restaurant', 'electronics'], multi: true },
    { name: he ? 'כרטיס מתנה · סופרמרקט' : 'Gift card · Supermarket', bal: 250, exp: '31.12.2026', cats: ['super'] },
    { name: he ? 'תו שי · מסעדות' : 'Holiday voucher · Restaurants', bal: 150, exp: '31.01.2027', cats: ['restaurant'] },
    { name: he ? 'תו שי · אופנה' : 'Holiday voucher · Fashion', bal: 400, exp: '31.03.2027', cats: ['fashion'] },
    { name: he ? 'זיכוי · אלקטרוניקה' : 'Store credit · Electronics', bal: 320, exp: '30.06.2027', cats: ['electronics'] },
  ];
  var CLUB = { fashion: 0.10 };        // club card: 10% at fashion chains
  var CASHBACK = { super: 0.05 };      // credit card: 5% back at supermarkets
  var prefs = { club: true, multi: true, cashback: false };

  function recommend(cat, amount) {
    var lines = [];
    var rest = amount;
    var saving = 0;
    if (prefs.club && CLUB[cat]) {
      var d = amount * CLUB[cat];
      saving += d; rest -= d;
      lines.push({ label: he ? 'הנחת כרטיס מועדון ' + CLUB[cat] * 100 + '%' : 'Club card ' + CLUB[cat] * 100 + '% off', note: he ? 'נחשב חיסכון' : 'counts as a saving', amount: -d, disc: true });
    }
    var usable = CARDS.filter(function (c) { return c.cats.indexOf(cat) > -1 && (prefs.multi || !c.multi); });
    var fromCards = 0;
    usable.forEach(function (c) {                       // the wallet is in expiry order: the first to expire goes first
      if (rest <= 0.004) return;
      var use = Math.min(c.bal, rest);
      rest -= use; fromCards += use;
      lines.push({ label: c.name, note: (he ? 'פג ב-' : 'expires ') + c.exp, amount: use });
    });
    if (rest > 0.004 && prefs.cashback && CASHBACK[cat]) {
      var back = rest * CASHBACK[cat];
      saving += back;
      lines.push({ label: he ? 'החזר מכרטיס האשראי ' + CASHBACK[cat] * 100 + '%' : 'Credit card ' + CASHBACK[cat] * 100 + '% back', note: he ? 'חוזר לחשבון, נחשב חיסכון' : 'paid back, counts as a saving', amount: -back, disc: true });
    }
    return { lines: lines, fromCards: fromCards, pocket: Math.max(0, rest), saving: saving };
  }

  function renderPay(root) {
    var cat = root.querySelector('.chip[aria-pressed="true"]').dataset.cat;
    var input = root.querySelector('input');
    var amount = Math.max(0, Math.min(5000, parseFloat(String(input.value).replace(/[^\d.]/g, '')) || 0));
    var r = recommend(cat, amount);
    var ul = root.querySelector('.rec ul');
    ul.innerHTML = '';
    r.lines.forEach(function (l) {
      var li = document.createElement('li');
      if (l.disc) li.className = 'disc';
      var a = document.createElement('span'); a.textContent = l.label;
      var sm = document.createElement('small'); sm.textContent = l.note; a.appendChild(sm);
      var b = document.createElement('b'); b.textContent = (l.amount < 0 ? '−' : '') + money(Math.abs(l.amount));
      li.appendChild(a); li.appendChild(b); ul.appendChild(li);
    });
    if (!r.lines.length) {
      var li0 = document.createElement('li');
      li0.textContent = he ? 'אין כרטיס או הטבה לחנות הזו בארנק לדוגמה' : 'No card or benefit for this store in the example wallet';
      ul.appendChild(li0);
    }
    root.querySelector('[data-out="pocket"]').textContent = money(r.pocket);
    root.querySelector('[data-out="saving"]').textContent = money(r.saving);
  }

  function setupPay(root) {
    var input = root.querySelector('input');
    root.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        root.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        if (chip.dataset.amount) input.value = chip.dataset.amount;
        renderPay(root);
      });
    });
    root.querySelectorAll('.step').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = (parseFloat(input.value) || 0) + Number(b.dataset.step);
        input.value = String(Math.max(0, Math.min(5000, v)));
        renderPay(root);
      });
    });
    input.addEventListener('input', function () { renderPay(root); });
    renderPay(root);
  }

  // ---- the board: one open row at a time ----
  function setupBoard(board) {
    var rows = board.querySelectorAll('.row');
    rows.forEach(function (row) {
      row.addEventListener('click', function () {
        rows.forEach(function (r) { r.setAttribute('aria-expanded', String(r === row)); });
      });
    });
  }

  // ---- preference switches: they change the Smart Pay at the top ----
  function setupSwitches(pay) {
    document.querySelectorAll('.band [role="switch"]').forEach(function (sw) {
      var band = sw.closest('.band');
      var toggle = function () {
        var on = sw.getAttribute('aria-checked') !== 'true';
        sw.setAttribute('aria-checked', String(on));
        band.classList.toggle('on', on);
        prefs[sw.dataset.pref] = on;
        if (pay) renderPay(pay);
      };
      sw.addEventListener('click', toggle);
      prefs[sw.dataset.pref] = sw.getAttribute('aria-checked') === 'true';
    });
  }

  // ---- benefits by category: tabs ----
  function setupTabs(list) {
    var tabs = list.querySelectorAll('[role="tab"]');
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length, j = -1;
        if (k === 'ArrowDown' || k === (he ? 'ArrowLeft' : 'ArrowRight')) j = (i + 1) % n;
        if (k === 'ArrowUp' || k === (he ? 'ArrowRight' : 'ArrowLeft')) j = (i - 1 + n) % n;
        if (j > -1) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  }

  // ---- how it works: the statement in the middle of the screen sets the fragment's state ----
  function setupHow(sec) {
    var steps = sec.querySelectorAll('.how-steps li');
    var states = sec.querySelectorAll('[data-ui] .state');
    var show = function (i) {
      steps.forEach(function (s, k) { s.classList.toggle('active', k === i); });
      states.forEach(function (s, k) { s.classList.toggle('on', k === i); });
    };
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) show(Array.prototype.indexOf.call(steps, e.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  }

  // ---- FAQ: an index with one answer (an accordion on a phone) ----
  function setupFaq(sec) {
    var qs = sec.querySelectorAll('.q');
    var paneQ = sec.querySelector('.pane-q');
    var paneA = sec.querySelector('.pane-a');
    sec.classList.add('faq-js');
    var select = function (q, toggle) {
      qs.forEach(function (o) { o.setAttribute('aria-expanded', String(o === q ? (toggle ? o.getAttribute('aria-expanded') !== 'true' : true) : false)); });
      paneQ.textContent = q.textContent;
      paneA.innerHTML = q.nextElementSibling.innerHTML;
      paneA.classList.remove('in'); void paneA.offsetWidth; paneA.classList.add('in');
    };
    var wide = window.matchMedia('(min-width: 901px)');
    qs.forEach(function (q) {
      q.addEventListener('click', function () { select(q, !wide.matches); });
      q.addEventListener('focus', function () { if (wide.matches) select(q); });
      q.addEventListener('mouseenter', function () { if (wide.matches) select(q); });
    });
    select(qs[0]);
  }

  // ---- entrances, once ----
  function setupReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var pay = document.querySelector('[data-ui].pay');
    if (pay) setupPay(pay);
    var board = document.querySelector('[data-ui].board');
    if (board) setupBoard(board);
    setupSwitches(pay);
    var list = document.querySelector('.agenda');
    if (list) setupTabs(list);
    var how = document.querySelector('.how-sec');
    if (how) setupHow(how);
    var faq = document.querySelector('.faq-sec');
    if (faq) setupFaq(faq);
    setupReveal();
  });
})();
