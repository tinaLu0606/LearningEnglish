// Preferences (this device) + requests for Claude Code.
import { h, toast, newId, shortDate } from '../util.js';
import * as store from '../store.js';
import { PALETTE } from '../theme.js';
import { backLink, empty } from './common.js';

const SIZES = [15, 16, 17, 18, 19, 20, 22];

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
