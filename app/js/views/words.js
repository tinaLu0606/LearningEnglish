// Words: Review (spaced repetition) · Library · word detail
import { h, icon, toast, todayStr, relDay, wordId } from '../util.js';
import * as store from '../store.js';
import * as srs from '../srs.js';
import * as ai from '../ai.js';
import { addWord } from '../components/reader.js';
import { openSheet, closeSheet } from '../components/sheet.js';
import { pageHead, backLink, subnav, empty, loading, sourceHref } from './common.js';

const SUBNAV = [['words', 'Review'], ['library', 'Library']];

// ---------- Review home ----------

export const home = {
  tab: 'words', deps: ['words', 'daily'], title: () => 'Words',
  render() {
    const page = h('div', { class: 'page' }, pageHead('Words'), subnav(SUBNAV, 'words'));
    const wait = loading(['words']);
    if (wait) return page.append(wait), page;
    const today = todayStr();
    const words = store.list('words');
    const q = srs.queue(words, today);
    const done = store.get('daily', today);
    const mastered = words.filter((w) => (w.stage || 0) >= srs.MASTERED).length;
    const learning = words.filter((w) => w.firstSeen && (w.stage || 0) < srs.MASTERED).length;

    page.append(h('section', { class: 'card review-card' },
      h('div', { class: 'split' },
        h('div', null, h('p', { class: 'label' }, 'DUE TODAY'), h('p', { class: 'big-num' }, String(q.all.length))),
        h('div', { class: 'review-break' },
          h('p', null, h('strong', null, q.due.length), ' to review'),
          h('p', null, h('strong', null, q.fresh.length), ' new (max ', srs.NEW_PER_DAY, ' a day)'),
          done ? h('p', { class: 'muted' }, `${done.reviewed || 0} reviewed today`) : null)),
      q.all.length
        ? h('a', { class: 'btn primary block', href: '#review' }, 'Start review')
        : h('p', { class: 'muted' }, words.length ? 'All done for today. New words appear here tomorrow.' : 'Tap any word while reading to add it here.')));

    page.append(h('section', { class: 'stats' },
      stat('Words', words.length), stat('Learning', learning), stat('Mastered', mastered)));

    page.append(h('section', { class: 'card stack' },
      h('p', { class: 'label' }, 'HOW REVIEW WORKS'),
      h('p', { class: 'small' }, '“Know it” moves a word to the next interval: 1, 2, 4, 7, 15, then 30 days. “Unsure” repeats the same interval. “Don’t know” starts it again from tomorrow, and you see it once more before the session ends.')));
    return page;
  },
};

const stat = (label, n) => h('div', { class: 'stat' }, h('p', { class: 'stat-n' }, String(n)), h('p', { class: 'stat-l' }, label));

// ---------- Review session ----------

let session = null;

function buildSession() {
  const today = todayStr();
  const q = srs.queue(store.list('words'), today);
  session = { today, items: q.all.map((w) => ({ id: w.id, retry: false })), index: 0, revealed: false, counts: { know: 0, unsure: 0, forgot: 0 } };
}

export const review = {
  tab: 'words', deps: ['words'], focus: true, title: () => 'Review',
  render(_, ctx) {
    const wait = loading(['words']);
    if (wait) return wait;
    if (!session || session.today !== todayStr() || (!ctx.sameRoute && session.index >= session.items.length)) buildSession();
    else if (!ctx.force && ctx.sameRoute) return undefined; // our own grading writes shouldn't redraw the card
    const s = session;
    const exit = h('a', { class: 'back', href: '#words' }, icon('close', 20), 'End');
    if (s.index >= s.items.length) {
      session = null;
      return h('div', { class: 'page' }, h('div', { class: 'bar' }, exit),
        h('section', { class: 'done' },
          h('p', { class: 'big-num' }, '✓'),
          h('h1', null, s.items.length ? 'Review done' : 'Nothing due'),
          s.items.length ? h('p', { class: 'muted' }, `Know it ${s.counts.know} · Unsure ${s.counts.unsure} · Don’t know ${s.counts.forgot}`) : h('p', { class: 'muted' }, 'Come back tomorrow, or add words while you read.'),
          h('a', { class: 'btn primary', href: '#words' }, 'Back to Words')));
    }
    const item = s.items[s.index];
    const w = store.get('words', item.id);
    if (!w) { s.index++; return review.render(_, { ...ctx, force: true }); }
    const total = s.items.length;
    const progress = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(s.index) },
      h('div', { class: 'progress-fill', style: { width: `${(s.index / total) * 100}%` } }));

    const card = h('section', { class: 'flash' },
      h('p', { class: 'flash-term' }, w.term),
      h('button', { class: 'icon-btn soft', 'aria-label': 'Play pronunciation', onclick: () => ai.speak(w.term) }, icon('speaker', 22)));

    const page = h('div', { class: 'page review-page' },
      h('div', { class: 'bar' }, exit, h('span', { class: 'muted small' }, `${s.index + 1} / ${total}`)),
      progress, card);

    if (!s.revealed) {
      if (w.example) card.append(h('p', { class: 'flash-example' }, blankOut(w.example, w.term)));
      page.append(h('button', { class: 'btn primary block big', onclick: () => { s.revealed = true; ctx.refresh(); } }, 'Show answer'));
      return page;
    }
    card.append(
      h('p', { class: 'flash-meta' }, [w.ipa, w.pos].filter(Boolean).join(' · ')),
      h('p', { class: 'flash-zh' }, w.zh || '(no meaning saved yet)'),
      w.gloss ? h('p', { class: 'muted' }, w.gloss) : null,
      w.example ? h('p', { class: 'flash-example' }, markTerm(w.example, w.term)) : null,
      sourceHref(w.source) ? h('a', { class: 'small', href: sourceHref(w.source) }, 'From: ' + (w.source.title || w.source.kind)) : null);

    const next = () => { s.index++; s.revealed = false; ctx.refresh(); };
    if (item.retry) {
      page.append(h('button', { class: 'btn primary block big', onclick: next }, 'Got it'));
      return page;
    }
    const rate = async (r) => {
      const patch = srs.grade(w, r, s.today);
      s.counts[r]++;
      if (r === 'forgot') s.items.push({ id: w.id, retry: true });
      next();
      try {
        await store.update('words', w.id, patch);
        bumpDaily(s.today, !w.firstSeen);
      } catch { toast('Couldn’t save that answer.'); }
    };
    page.append(h('div', { class: 'rate' },
      h('button', { class: 'btn rate-forgot', onclick: () => rate('forgot') }, 'Don’t know'),
      h('button', { class: 'btn rate-unsure', onclick: () => rate('unsure') }, 'Unsure'),
      h('button', { class: 'btn rate-know', onclick: () => rate('know') }, 'Know it')));
    return page;
  },
};

async function bumpDaily(date, isNew) {
  const cur = store.get('daily', date) || { reviewed: 0, learned: 0 };
  await store.set('daily', date, { reviewed: (cur.reviewed || 0) + 1, learned: (cur.learned || 0) + (isNew ? 1 : 0) }).catch(() => {});
}

function findTerm(sentence, term) {
  const i = sentence.toLowerCase().indexOf(term.toLowerCase());
  if (i >= 0) return [i, i + term.length];
  // match an inflected form: same first letters
  const stem = term.toLowerCase().slice(0, Math.max(4, term.length - 3));
  const m = new RegExp(`\\b${stem.replace(/[^a-z0-9]/g, '')}[a-z]*`, 'i').exec(sentence);
  return m ? [m.index, m.index + m[0].length] : null;
}
function blankOut(sentence, term) {
  const r = findTerm(sentence, term);
  if (!r) return sentence;
  return [sentence.slice(0, r[0]), h('span', { class: 'blank' }, '_____'), sentence.slice(r[1])];
}
function markTerm(sentence, term) {
  const r = findTerm(sentence, term);
  if (!r) return sentence;
  return [sentence.slice(0, r[0]), h('mark', { class: 'term' }, sentence.slice(r[0], r[1])), sentence.slice(r[1])];
}

// ---------- Library ----------

let libFilter = 'all';
let libQuery = '';

export const library = {
  tab: 'words', deps: ['words'], title: () => 'Library',
  render(_, ctx) {
    const page = h('div', { class: 'page' },
      pageHead('Words', { action: h('button', { class: 'btn ghost small', onclick: openAdd }, icon('plus', 18), 'Add word') }),
      subnav(SUBNAV, 'library'));
    const wait = loading(['words']);
    if (wait) return page.append(wait), page;
    const today = todayStr();
    const all = store.list('words').sort((a, b) => ((b.added || '') > (a.added || '') ? 1 : -1));
    const search = h('input', { id: 'word-search', class: 'input', type: 'search', placeholder: 'Search words or meanings', value: libQuery, autocomplete: 'off' });
    const listEl = h('div', { class: 'list' });
    const draw = () => {
      const q = libQuery.trim().toLowerCase();
      const rows = all.filter((w) => {
        if (libFilter === 'due' && !(w.firstSeen ? w.due <= today : true)) return false;
        if (libFilter === 'learning' && !(w.firstSeen && (w.stage || 0) < srs.MASTERED)) return false;
        if (libFilter === 'mastered' && (w.stage || 0) < srs.MASTERED) return false;
        if (libFilter === 'new' && w.firstSeen) return false;
        return !q || w.term.toLowerCase().includes(q) || (w.zh || '').includes(q);
      });
      listEl.replaceChildren(...(rows.length ? rows.map((w) => h('a', { class: 'row word-row', href: '#word-' + w.id },
        h('div', { class: 'word-main' }, h('p', { class: 'row-title' }, w.term), h('p', { class: 'row-meta' }, w.zh || '—')),
        h('div', { class: 'word-side' }, h('span', { class: 'stage-pill' + ((w.stage || 0) >= srs.MASTERED ? ' done' : '') }, srs.stageLabel(w)),
          w.firstSeen ? h('span', { class: 'row-meta' }, relDay(w.due, today)) : null)))
        : [empty(all.length ? 'No matches' : 'No words yet', all.length ? null : 'Tap a word in any essay, article or transcript, then “Add to Words”.')]));
    };
    search.addEventListener('input', () => { libQuery = search.value; draw(); });
    page.append(search,
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter' },
        ...[['all', 'All'], ['new', 'New'], ['learning', 'Learning'], ['mastered', 'Mastered']].map(([k, label]) =>
          h('button', { class: 'chip', 'aria-pressed': String(libFilter === k), onclick: () => { libFilter = k; ctx.refresh(); } }, label))),
      h('p', { class: 'muted small' }, `${all.length} words`),
      listEl);
    draw();
    return page;
  },
};

function openAdd() {
  const input = h('input', { id: 'add-term', class: 'input', placeholder: 'Type a word or phrase', autocomplete: 'off', autocapitalize: 'none' });
  const ex = h('textarea', { id: 'add-example', class: 'input', rows: '2', placeholder: 'Example sentence (optional)' });
  const msg = h('p', { class: 'muted small' });
  const btn = h('button', { class: 'btn primary block', onclick: async () => {
    const term = input.value.trim();
    if (!term) { input.focus(); return; }
    if (store.get('words', wordId(term))) { closeSheet(); location.hash = 'word-' + wordId(term); return; }
    btn.disabled = true; msg.textContent = 'Looking it up…';
    let entry;
    try { entry = await ai.lookup(term, ex.value.trim() || term); }
    catch (e) { entry = { term }; msg.textContent = ai.errorText(e) + ' Saved without a meaning.'; }
    try {
      const id = await addWord(entry, ex.value.trim(), { kind: 'manual', id: '', title: 'Added by hand' });
      closeSheet(); toast(`Added “${entry.term}”`); location.hash = 'word-' + id;
    } catch { msg.textContent = 'Couldn’t save. Try again.'; btn.disabled = false; }
  } }, 'Add');
  openSheet(h('div', { class: 'stack' }, h('p', { class: 'lk-term' }, 'Add a word'), input, ex, btn, msg), { label: 'Add a word' });
  setTimeout(() => input.focus(), 50);
}

// ---------- Word detail ----------

export const detail = {
  tab: 'words', deps: ['words'], title: () => 'Word',
  render(id, ctx) {
    const wait = loading(['words']);
    if (wait) return wait;
    const w = store.get('words', id);
    if (!w) return h('div', { class: 'page' }, backLink('#library', 'Library'), empty('Word not found', 'It may have been deleted.'));
    if (ctx.sameRoute && !ctx.force && document.activeElement && document.activeElement.closest('.word-edit')) return undefined;
    const zh = h('input', { id: 'w-zh', class: 'input', value: w.zh || '' });
    const ipa = h('input', { id: 'w-ipa', class: 'input', value: w.ipa || '' });
    const ex = h('textarea', { id: 'w-ex', class: 'input', rows: '3' });
    ex.value = w.example || '';
    const save = async () => {
      try { await store.update('words', w.id, { zh: zh.value.trim(), ipa: ipa.value.trim(), example: ex.value.trim() }); toast('Saved'); }
      catch { toast('Couldn’t save.'); }
    };
    let armed = false;
    const del = h('button', { class: 'btn ghost danger', onclick: async () => {
      if (!armed) { armed = true; del.textContent = 'Tap again to delete'; setTimeout(() => { armed = false; del.textContent = 'Delete word'; }, 3000); return; }
      await store.remove('words', w.id).catch(() => {});
      location.hash = 'library';
    } }, 'Delete word');
    const href = sourceHref(w.source);
    return h('div', { class: 'page' },
      h('div', { class: 'bar' }, backLink('#library', 'Library')),
      h('div', { class: 'word-hero' },
        h('div', null, h('h1', null, w.term), h('p', { class: 'muted' }, [w.ipa, w.pos].filter(Boolean).join(' · '))),
        h('button', { class: 'icon-btn soft', 'aria-label': 'Play pronunciation', onclick: () => ai.speak(w.term) }, icon('speaker', 22))),
      h('p', { class: 'flash-zh' }, w.zh || ''),
      w.gloss ? h('p', { class: 'muted' }, w.gloss) : null,
      w.example ? h('blockquote', { class: 'quote' }, markTerm(w.example, w.term)) : null,
      href ? h('a', { class: 'source-link', href }, 'Open source: ' + (w.source.title || w.source.kind), icon('chevron', 16)) : null,
      h('section', { class: 'card stack' },
        h('div', { class: 'split' }, h('p', { class: 'label' }, 'PROGRESS'), h('span', { class: 'stage-pill' }, srs.stageLabel(w))),
        h('div', { class: 'meter', 'aria-hidden': 'true' }, ...Array.from({ length: srs.MASTERED }, (_, i) => h('span', { class: i < (w.stage || 0) ? 'on' : '' }))),
        h('p', { class: 'small muted' }, w.firstSeen ? `Next review ${relDay(w.due)} · missed ${w.lapses || 0} times` : 'Not reviewed yet — it joins your next review session.')),
      h('section', { class: 'card stack word-edit' },
        h('p', { class: 'label' }, 'EDIT'),
        h('label', { class: 'field' }, h('span', null, 'Chinese meaning'), zh),
        h('label', { class: 'field' }, h('span', null, 'Pronunciation (IPA)'), ipa),
        h('label', { class: 'field' }, h('span', null, 'Example sentence'), ex),
        h('button', { class: 'btn primary', onclick: save }, 'Save changes')),
      h('div', { class: 'actions' },
        h('button', { class: 'btn ghost', onclick: () => store.update('words', w.id, { stage: 0, due: todayStr(), firstSeen: null, lastReviewed: null }).then(() => toast('Progress reset')) }, 'Reset progress'),
        del));
  },
};
