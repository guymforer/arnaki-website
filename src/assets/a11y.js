/* Arnaki accessibility menu. Self-hosted, no dependencies, no network.
   Adds a floating button that opens a panel of display adjustments (text size,
   high contrast, link and heading emphasis, readable font, text spacing, stop
   motion). Choices are kept in localStorage on this device only. The site is
   fully usable without this script; it is an extra layer on top of the
   built-in accessibility of the pages. */
(function () {
  'use strict';

  var KEY = 'arnaki-a11y';
  var root = document.documentElement;
  var he = /^he/i.test(root.lang || 'he');
  var T = he ? {
    open: 'תפריט נגישות', close: 'סגירת התפריט', title: 'הגדרות נגישות',
    textSize: 'גודל טקסט', textUp: 'הגדלת טקסט', textDown: 'הקטנת טקסט',
    contrast: 'ניגודיות גבוהה', links: 'הדגשת קישורים', headings: 'הדגשת כותרות',
    font: 'גופן קריא', spacing: 'ריווח טקסט', motion: 'עצירת תנועה',
    on: 'פעיל', off: 'כבוי', reset: 'איפוס ההגדרות', statement: 'הצהרת נגישות',
    statementHref: '/accessibility/'
  } : {
    open: 'Accessibility menu', close: 'Close menu', title: 'Accessibility settings',
    textSize: 'Text size', textUp: 'Increase text size', textDown: 'Decrease text size',
    contrast: 'High contrast', links: 'Highlight links', headings: 'Highlight headings',
    font: 'Readable font', spacing: 'Text spacing', motion: 'Stop motion',
    on: 'On', off: 'Off', reset: 'Reset settings', statement: 'Accessibility statement',
    statementHref: '/en/accessibility/'
  };
  var ZOOM = ['100%', '115%', '130%', '150%'];
  var TOGGLES = ['contrast', 'links', 'headings', 'font', 'spacing', 'motion'];

  var state = load();
  var ui = null;

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      return s && typeof s === 'object' ? s : {};
    } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: keep in memory */ }
  }

  function apply() {
    var z = Math.max(0, Math.min(ZOOM.length - 1, state.zoom | 0));
    state.zoom = z;
    if (z) root.setAttribute('data-a11y-zoom', String(z)); else root.removeAttribute('data-a11y-zoom');
    TOGGLES.forEach(function (k) { root.classList.toggle('a11y-' + k, !!state[k]); });
    if (!ui) return;
    ui.zoomOut.textContent = ZOOM[z];
    ui.zoomDown.disabled = z === 0;
    ui.zoomUp.disabled = z === ZOOM.length - 1;
    TOGGLES.forEach(function (k) {
      var on = !!state[k];
      ui.toggles[k].setAttribute('aria-pressed', on ? 'true' : 'false');
      ui.toggles[k].lastChild.textContent = on ? T.on : T.off;
    });
  }

  // Apply saved choices first, so the page does not flash before the panel exists.
  apply();

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (a) {
      if (a === 'text') n.textContent = attrs[a];
      else if (a === 'html') n.innerHTML = attrs[a];
      else n.setAttribute(a, attrs[a]);
    });
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<circle cx="12" cy="6.9" r="1.7" fill="currentColor"/>' +
    '<path d="M6.3 9.7l4.2.9v3.3l-1.7 4.6M17.7 9.7l-4.2.9v3.3l1.7 4.6M10.5 13.9h3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function build() {
    var btn = el('button', { type: 'button', 'class': 'a11y-btn', 'aria-label': T.open, 'aria-haspopup': 'dialog', 'aria-expanded': 'false', html: ICON });

    var close = el('button', { type: 'button', 'class': 'a11y-close', 'aria-label': T.close, text: '×' });
    var head = el('div', { 'class': 'a11y-head' }, [el('h2', { id: 'a11y-title', text: T.title }), close]);

    var zoomDown = el('button', { type: 'button', 'aria-label': T.textDown, text: '−' });
    var zoomOut = el('output', { 'aria-live': 'polite', text: ZOOM[0] });
    var zoomUp = el('button', { type: 'button', 'aria-label': T.textUp, text: '+' });
    var zoomRow = el('div', { 'class': 'a11y-row' }, [
      el('span', { id: 'a11y-zoom-label', text: T.textSize }),
      el('div', { 'class': 'a11y-zoom', role: 'group', 'aria-labelledby': 'a11y-zoom-label' }, [zoomDown, zoomOut, zoomUp])
    ]);

    var toggles = {};
    var list = el('div', { 'class': 'a11y-list' }, TOGGLES.map(function (k) {
      var b = el('button', { type: 'button', 'class': 'a11y-toggle', 'aria-pressed': 'false', 'data-key': k }, [
        el('span', { text: T[k] }),
        el('span', { 'class': 'a11y-state', 'aria-hidden': 'true', text: T.off })
      ]);
      toggles[k] = b;
      return b;
    }));

    var reset = el('button', { type: 'button', 'class': 'a11y-reset', text: T.reset });
    var foot = el('div', { 'class': 'a11y-foot' }, [reset, el('a', { href: T.statementHref, text: T.statement })]);

    var panel = el('div', { id: 'a11y-panel', 'class': 'a11y-panel', role: 'dialog', 'aria-labelledby': 'a11y-title', hidden: '' }, [head, zoomRow, list, foot]);

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    ui = { btn: btn, panel: panel, close: close, zoomDown: zoomDown, zoomOut: zoomOut, zoomUp: zoomUp, toggles: toggles, reset: reset };

    function open() {
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-controls', 'a11y-panel'); // only while the panel is in the tree and visible
      close.focus();
    }
    function shut(returnFocus) {
      if (panel.hidden) return;
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.removeAttribute('aria-controls');
      if (returnFocus) btn.focus();
    }

    btn.addEventListener('click', function () { panel.hidden ? open() : shut(true); });
    close.addEventListener('click', function () { shut(true); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); shut(true); }
    });
    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      shut(false);
    });

    zoomDown.addEventListener('click', function () { state.zoom = Math.max(0, (state.zoom | 0) - 1); save(); apply(); });
    zoomUp.addEventListener('click', function () { state.zoom = Math.min(ZOOM.length - 1, (state.zoom | 0) + 1); save(); apply(); });
    TOGGLES.forEach(function (k) {
      toggles[k].addEventListener('click', function () { state[k] = !state[k]; save(); apply(); });
    });
    reset.addEventListener('click', function () { state = {}; save(); apply(); zoomDown.focus(); });

    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
