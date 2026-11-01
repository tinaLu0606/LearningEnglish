// Preferences (this device) + requests for Claude Code.
import { h, toast, newId, shortDate } from '../util.js';
import * as store from '../store.js';
import { PALETTE } from '../theme.js';
import { backLink, empty } from './common.js';

const SIZES = [15, 16, 17, 18, 19, 20, 22];
const APP_URL = 'https://claude.ai/artifact/5c81mtfKm7dcCxmmjR2F7R';
// Home-screen icon options (sources in assets/icons/, uploaded to this artifact's asset store).
const ICONS = [
  ['Serif E', '31b6695535dfaef8488e0f2c6b204e16'],
  ['Open book', 'd2c7632112557b8dd70e08697acd9503'],
  ['Aa bubble', '9b3639f509919e20445845aa04665d3a'],
  ['Pen nib', '30d462484e1410fe5a43480da48d8cc5'],
  ['En. (dark)', '3975fc834edc804faa85f6e1460592fc'],
];

function iconSection() {
  const urlText = h('code', { class: 'app-url' }, APP_URL);
  const copy = h('button', { class: 'btn ghost small', onclick: () => {
    navigator.clipboard.writeText(APP_URL).then(() => toast('Link copied'), () => {
      const r = document.createRange(); r.selectNodeContents(urlText);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      toast('Link selected — tap Copy');
    });
  } }, 'Copy app link');
  return h('section', { class: 'section' }, h('h2', null, 'Home screen icon'),
    h('p', { class: 'muted small' }, 'Safari always uses Claude’s icon for links to claude.ai. To get your own icon, open the app through a Shortcut instead.'),
    h('div', { class: 'icon-grid' }, ...ICONS.map(([name, id]) => h('figure', { class: 'icon-opt' },
      h('img', { src: '/_blob/' + id, alt: name + ' icon', width: '120', height: '120' }),
      h('figcaption', null, name)))),
    h('ol', { class: 'steps small' },
      h('li', null, 'Press and hold the icon you like, then tap “Save to Photos”.'),
      h('li', null, 'Copy the app link below.'),
      h('li', null, 'Open the Shortcuts app → + → Add Action → “Open URLs”, and paste the link.'),
      h('li', null, 'Tap the shortcut’s name at the top → Add to Home Screen → tap the small icon → Choose Photo → pick the saved icon → Add.'),
      h('li', null, 'Remove the old Safari bookmark from your Home Screen.')),
    h('div', { class: 'card stack' }, urlText, copy));
}

export default {
  tab: 'today', deps: ['inbox', 'words', 'essays', 'episodes', 'submissions'], title: () => 'Preferences',
  render(_, ctx) {
    if (ctx.sameRoute && !ctx.force && document.activeElement && document.activeElement.id === 'inbox-text') return undefined;
    const p = store.prefs();
    const apply = (patch) => { store.setPrefs(patch); window.dispatchEvent(new Event('el:prefs')); ctx.refresh(); };

    const i = SIZES.indexOf(p.fontSize);
    const size = h('div', { class: 'size-row' },
      h('button', { class: 'btn ghost', 'aria-label': 'Smaller text', disabled: i <= 0, onclick: () => apply({ fontSize: SIZES[Math.max(0, i - 1)] }) }, 'A−'),
      h('span', { class: 'size-val' }, `${p.fontSize} px`),
      h('button', { class: 'btn ghost', 'aria-label': 'Larger text', disabled: i >= SIZES.length - 1, onclick: () => apply({ fontSize: SIZES[Math.min(SIZES.length - 1, i + 1)] }) }, 'A+'));

    const swatches = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Accent colour' },
      ...PALETTE.map((c) => h('button', {
        class: 'swatch', role: 'radio', 'aria-checked': String(p.accent.toLowerCase() === c.hex.toLowerCase()), 'aria-label': c.name,
        style: { background: c.hex }, onclick: () => apply({ accent: c.hex }),
      })),
      h('label', { class: 'swatch custom', title: 'Custom colour' },
        h('input', { id: 'accent-custom', type: 'color', value: p.accent, 'aria-label': 'Custom colour', onchange: (e) => apply({ accent: e.target.value }) })));

    const theme = h('div', { class: 'seg small', role: 'group', 'aria-label': 'Appearance' },
      ...[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([k, label]) =>
        h('button', { 'aria-pressed': String(p.theme === k), onclick: () => apply({ theme: k }) }, label)));

    // Requests for Claude Code
    const box = h('textarea', { id: 'inbox-text', class: 'input', rows: '3', placeholder: 'e.g. Find a podcast episode with Indian-accented English about work culture' });
    const send = h('button', { class: 'btn primary', onclick: async () => {
      const text = box.value.trim();
      if (!text) { box.focus(); return; }
      send.disabled = true;
      try { await store.set('inbox', newId(), { text, created: new Date().toISOString(), status: 'open' }); box.value = ''; toast('Sent. Say “check my inbox” in Claude Code.'); }
      catch { toast('Couldn’t send. Try again.'); }
      send.disabled = false;
      box.blur();
      ctx.refresh();
    } }, 'Send to Claude Code');
    const reqs = store.list('inbox').sort((a, b) => (b.created > a.created ? 1 : -1)).slice(0, 8);

    const counts = [['Words', 'words'], ['Essays', 'essays'], ['My essays', 'submissions'], ['Episodes', 'episodes']]
      .map(([label, col]) => h('div', { class: 'stat' }, h('p', { class: 'stat-n' }, String(store.list(col).length)), h('p', { class: 'stat-l' }, label)));

    return h('div', { class: 'page' },
      h('div', { class: 'bar' }, backLink('#today', 'Today')),
      h('h1', null, 'Preferences'),
      h('p', { class: 'muted small' }, 'Text size, colour and appearance apply to this device only.'),
      h('section', { class: 'card stack' }, h('p', { class: 'label' }, 'TEXT SIZE'), size,
        h('p', { class: 'sample-text' }, 'In my view, public transport deserves the larger share of investment.')),
      h('section', { class: 'card stack' }, h('p', { class: 'label' }, 'ACCENT COLOUR'), swatches),
      h('section', { class: 'card stack' }, h('p', { class: 'label' }, 'APPEARANCE'), theme),
      iconSection(),
      h('section', { class: 'section' }, h('h2', null, 'Ask Claude Code'),
        h('p', { class: 'muted small' }, 'Requests wait here until you open Claude Code on your Mac and say “check my inbox”.'),
        box, send,
        reqs.length ? h('div', { class: 'list' }, ...reqs.map((r) => h('div', { class: 'row' },
          h('div', { class: 'tags' }, h('span', { class: 'tag ' + (r.status === 'done' ? 'quiet' : 'accent') }, r.status === 'done' ? 'Done' : 'Waiting'), h('span', { class: 'row-meta' }, shortDate(r.created.slice(0, 10)))),
          h('p', null, r.text),
          r.reply ? h('p', { class: 'muted small' }, r.reply) : null))) : null),
      h('section', { class: 'section' }, h('h2', null, 'Your data'),
        h('div', { class: 'stats' }, ...counts),
        h('p', { class: 'muted small' }, store.mode === 'online' ? 'Synced with claude.ai.' : store.mode === 'offline' ? 'Preview mode: stored in this browser only.' : 'Connecting…')));
  },
};
