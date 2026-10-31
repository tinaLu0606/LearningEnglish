// Boot, hash router, navigation and the mini player.
import * as store from './store.js';
import { applyTheme } from './theme.js';
import { h, icon, clock } from './util.js';
import * as player from './components/player.js';
import { installSelectionBar } from './components/reader.js';
import { closeSheet } from './components/sheet.js';
import today from './views/today.js';
import * as writing from './views/writing.js';
import * as listening from './views/listening.js';
import * as words from './views/words.js';
import * as discover from './views/discover.js';
import prefsView from './views/prefs.js';

const TABS = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'writing', label: 'Writing', icon: 'pen' },
  { id: 'listening', label: 'Listening', icon: 'headphones' },
  { id: 'words', label: 'Words', icon: 'cards' },
  { id: 'discover', label: 'Discover', icon: 'compass' },
];

// Route names are plain #names (claude.ai only passes letters, digits and hyphens).
const ROUTES = {
  today,
  writing: writing.essays, write: writing.writeHome, feedback: writing.feedback,
  listening: listening.list,
  words: words.home, review: words.review, library: words.library,
  discover: discover.news, literature: discover.literature, saved: discover.saved,
  prefs: prefsView,
};
const PARAM_ROUTES = {
  essay: writing.essay, draft: writing.editor, sub: writing.result,
  ep: listening.episode, word: words.detail, news: discover.newsItem, lit: discover.litItem,
};

function resolve(hash) {
  const name = (hash || '').replace(/^#/, '') || 'today';
  if (ROUTES[name]) return { view: ROUTES[name], param: null, name };
  const dash = name.indexOf('-');
  if (dash > 0) {
    const view = PARAM_ROUTES[name.slice(0, dash)];
    if (view) return { view, param: name.slice(dash + 1), name };
  }
  return { view: today, param: null, name: 'today' };
}

let route = null;
const viewEl = () => document.getElementById('view');

function render({ force = false } = {}) {
  const next = resolve(location.hash);
  const same = route && route.name === next.name;
  if (!same) closeSheet();
  route = next;
  const ctx = { sameRoute: same, force, refresh: () => render({ force: true }) };
  let node;
  try { node = next.view.render(next.param, ctx); }
  catch (err) { console.error(err); node = h('div', { class: 'empty' }, h('p', null, 'This page hit an error.'), h('p', { class: 'muted' }, String(err && err.message || err))); }
  if (node === undefined) { updateNav(); return; } // view keeps its own DOM
  const y = window.scrollY;
  viewEl().replaceChildren(node);
  if (same) window.scrollTo(0, y); else window.scrollTo(0, 0);
  if (!same) document.title = next.view.title ? `${next.view.title(next.param)} · English Lab` : 'English Lab';
  updateNav();
}

function navItems(cls) {
  return TABS.map((t) => h('a', { href: '#' + t.id, class: cls, dataset: { tab: t.id } }, icon(t.icon, 24), h('span', null, t.label)));
}

function buildNav() {
  document.getElementById('tabs').replaceChildren(...navItems('tab'));
  document.getElementById('side-nav').replaceChildren(...navItems('side-link'));
}

function updateNav() {
  const tab = route?.view.tab || 'today';
  for (const a of document.querySelectorAll('[data-tab]')) {
    const on = a.dataset.tab === tab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  document.body.classList.toggle('focus-mode', !!route?.view.focus);
  updateMini();
}

// ---------- mini player ----------

function updateMini() {
  const mini = document.getElementById('mini');
  const ep = player.current();
  const onEpisode = route && route.name === 'ep-' + (ep && ep.id);
  if (!ep || onEpisode || !player.el.src) { mini.hidden = true; document.body.classList.remove('has-mini'); return; }
  mini.hidden = false;
  document.body.classList.add('has-mini');
  mini.replaceChildren(
    h('a', { class: 'mini-info', href: '#ep-' + ep.id },
      h('span', { class: 'mini-title' }, ep.title),
      h('span', { class: 'mini-time' }, `${clock(player.el.currentTime)} / ${clock(player.el.duration || ep.duration)}`)),
    h('button', { class: 'icon-btn', 'aria-label': player.isPlaying() ? 'Pause' : 'Play', onclick: () => player.toggle() }, icon(player.isPlaying() ? 'pause' : 'play', 22)));
}

// ---------- boot ----------

function applyPrefs() {
  const p = store.prefs();
  applyTheme(p);
  document.documentElement.style.fontSize = p.fontSize + 'px';
}

function boot() {
  applyPrefs();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPrefs);
  new MutationObserver(applyPrefs).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('el:prefs', applyPrefs);

  buildNav();
  installSelectionBar();
  window.addEventListener('hashchange', () => render());

  let pending = null;
  store.onChange((col) => {
    const deps = route?.view.deps || [];
    if (col !== '*' && !deps.includes(col)) return;
    // batch bursts of snapshots into one render
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = null; render(); });
  });
  let lastMini = 0;
  player.onTick(() => { const n = Date.now(); if (n - lastMini > 500) { lastMini = n; updateMini(); } });

  render();
  store.init().then(() => {
    const banner = document.getElementById('banner');
    if (store.mode === 'offline') {
      banner.textContent = 'Preview mode: data is stored in this browser only. Open the app in claude.ai to sync.';
      banner.hidden = false;
    }
  });
}

boot();
