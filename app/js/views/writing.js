// Writing: Model Essays · Write · Feedback
import { h, icon, toast, countWords, clock, newId, shortDate, debounce } from '../util.js';
import * as store from '../store.js';
import * as ai from '../ai.js';
import { reader } from '../components/reader.js';
import { pageHead, backLink, subnav, empty, loading, saveButton, tag } from './common.js';

const SUBNAV = [['writing', 'Model Essays'], ['write', 'Write'], ['feedback', 'Feedback']];
const kindLabel = (e) => (e.author ? e.author + ' model' : e.kind === 'examiner' ? 'Examiner model' : e.kind === 'candidate' ? 'Candidate script' : 'Claude model');
const byAdded = (a, b) => ((b.added || '') > (a.added || '') ? 1 : -1);

// ---------- Model essays ----------

let essayFilter = 'all';

export const essays = {
  tab: 'writing', deps: ['essays'], title: () => 'Model Essays',
  render(_, ctx) {
    const page = h('div', { class: 'page' }, pageHead('Writing'), subnav(SUBNAV, 'writing'));
    const wait = loading(['essays']);
    if (wait) return page.append(wait), page;
    const all = store.list('essays').sort((a, b) => (a.task - b.task) || byAdded(a, b));
    const filters = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter' },
      ...[['all', 'All'], ['1', 'Task 1'], ['2', 'Task 2'], ['saved', 'Saved']].map(([k, label]) =>
        h('button', { class: 'chip', 'aria-pressed': String(essayFilter === k), onclick: () => { essayFilter = k; ctx.refresh(); } }, label)));
    const shown = all.filter((e) => essayFilter === 'all' || (essayFilter === 'saved' ? e.saved : String(e.task) === essayFilter));
    page.append(filters);
    if (!all.length) {
      page.append(empty('No model essays yet', 'In Claude Code, say “Import Cambridge IELTS essays from <file>” or “Add model essays for Task 2 opinion questions”.'));
      return page;
    }
    if (!shown.length) { page.append(empty('Nothing here', 'Try another filter.')); return page; }
    page.append(h('div', { class: 'list' }, ...shown.map((e) =>
      h('a', { class: 'row card-row', href: '#essay-' + e.id },
        h('div', { class: 'tags' }, tag('Task ' + e.task), tag(e.type), e.band ? tag('Band ' + e.band, 'accent') : tag(kindLabel(e), 'quiet')),
        h('p', { class: 'row-title clamp2' }, e.prompt),
        h('p', { class: 'row-meta' }, e.source || '')))));
    return page;
  },
};

function figureView(fig) {
  if (!fig) return null;
  if (fig.kind === 'table') {
    return h('figure', { class: 'figure' },
      fig.caption ? h('figcaption', null, fig.caption) : null,
      h('div', { class: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ...fig.columns.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', null, ...fig.rows.map((r) => h('tr', null, ...r.map((c, i) => (i === 0 ? h('th', { scope: 'row' }, c) : h('td', null, c)))))))));
  }
  if (fig.kind === 'steps') {
    return h('figure', { class: 'figure' }, fig.caption ? h('figcaption', null, fig.caption) : null,
      h('ol', { class: 'steps' }, ...fig.items.map((s) => h('li', null, s))));
  }
  if (fig.kind === 'image' && fig.assetId) {
    // Tap to open full size: scanned charts are hard to read at phone width.
    const src = '/_blob/' + fig.assetId;
    return h('figure', { class: 'figure' },
      h('a', { href: src, target: '_blank', rel: 'noopener', title: 'Open full size' }, h('img', { src, alt: fig.caption || 'Task 1 figure' })),
      fig.caption ? h('figcaption', null, fig.caption) : null);
  }
  return null;
}

export const essay = {
  tab: 'writing', deps: ['essays', 'highlights', 'words'], title: () => 'Model essay',
  render(id) {
    const wait = loading(['essays']);
    if (wait) return wait;
    const e = store.get('essays', id);
    if (!e) return h('div', { class: 'page' }, backLink('#writing', 'Model Essays'), empty('Essay not found', 'It may have been removed.'));
    const src = { kind: 'essay', id: e.id, title: `Task ${e.task} · ${e.type}` };
    return h('article', { class: 'page' },
      h('div', { class: 'bar' }, backLink('#writing', 'Model Essays'), saveButton('essays', e, 'Save essay')),
      h('div', { class: 'tags' }, tag('Task ' + e.task), tag(e.type), e.band ? tag('Band ' + e.band, 'accent') : tag(kindLabel(e), 'quiet')),
      h('p', { class: 'prompt-box' }, e.prompt),
      figureView(e.figure),
      reader(e.body || [], src, { className: 'prose' }),
      h('p', { class: 'muted small' }, `${countWords((e.body || []).join(' '))} words`),
      e.examiner ? h('details', { class: 'examiner' }, h('summary', null, e.notesTitle || 'Examiner comment'),
        ...e.examiner.split(/\n\s*\n/).map((p) => h('p', null, p))) : null,
      h('p', { class: 'source' }, 'Source: ' + (e.source || 'unknown')),
      h('button', { class: 'btn primary block', onclick: () => startDraft({ task: e.task, prompt: e.prompt, essayId: e.id }) }, icon('pen', 20), 'Write this prompt yourself'));
  },
};

// ---------- Write ----------

export async function startDraft({ task, prompt, essayId = null }) {
  const id = newId();
  const now = new Date().toISOString();
  try {
    await store.set('submissions', id, { task, prompt, essayId, body: '', words: 0, timer: 0, elapsed: 0, status: 'draft', created: now, updated: now });
    location.hash = 'draft-' + id;
  } catch { toast('Couldn’t start a draft. Check your connection.'); }
}

let newTask = 2;

export const writeHome = {
  tab: 'writing', deps: ['submissions', 'essays'], title: () => 'Write',
  render(_, ctx) {
    const page = h('div', { class: 'page' }, pageHead('Writing'), subnav(SUBNAV, 'write'));
    const wait = loading(['submissions', 'essays']);
    if (wait) return page.append(wait), page;
    const drafts = store.list('submissions').filter((s) => s.status === 'draft').sort((a, b) => (b.updated > a.updated ? 1 : -1));
    if (drafts.length) {
      page.append(h('section', { class: 'section' }, h('h2', null, 'Continue'),
        h('div', { class: 'list' }, ...drafts.map((d) => h('a', { class: 'row card-row', href: '#draft-' + d.id },
          h('div', { class: 'tags' }, tag('Task ' + d.task), tag(`${d.words || 0} words`, 'quiet')),
          h('p', { class: 'row-title clamp2' }, d.prompt || 'Untitled essay'),
          h('p', { class: 'row-meta' }, 'Last edited ' + shortDate(d.updated.slice(0, 10))))))));
    }
    const prompts = store.list('essays').filter((e) => e.task === newTask);
    const own = h('textarea', { id: 'own-prompt', class: 'input', rows: '4', placeholder: newTask === 1 ? 'Paste a Task 1 question (describe the chart in words if there is one).' : 'Paste any Task 2 question.' });
    page.append(h('section', { class: 'section' },
      h('h2', null, 'Start a new essay'),
      h('div', { class: 'seg small', role: 'group', 'aria-label': 'Task' },
        ...[1, 2].map((t) => h('button', { 'aria-pressed': String(newTask === t), onclick: () => { newTask = t; ctx.refresh(); } }, 'Task ' + t))),
      h('p', { class: 'muted small' }, newTask === 1 ? '20 minutes · at least 150 words' : '40 minutes · at least 250 words'),
      h('div', { class: 'card stack' },
        h('label', { class: 'label', for: 'own-prompt' }, 'YOUR OWN QUESTION'),
        own,
        h('button', { class: 'btn primary', onclick: () => { const p = own.value.trim(); if (!p) { own.focus(); return; } startDraft({ task: newTask, prompt: p }); } }, 'Start writing')),
      prompts.length ? h('h3', { class: 'label' }, 'OR PICK A QUESTION FROM THE MODEL ESSAYS') : null,
      prompts.length ? h('div', { class: 'list' }, ...prompts.map((e) => h('button', { class: 'row card-row', onclick: () => startDraft({ task: e.task, prompt: e.prompt, essayId: e.id }) },
        h('div', { class: 'tags' }, tag(e.type)), h('p', { class: 'row-title clamp2' }, e.prompt)))) : null));
    return page;
  },
};

// Editor keeps its own DOM while open, so typing is never interrupted by re-renders.
let ed = null;

export const editor = {
  tab: 'writing', deps: ['submissions'], focus: true, title: () => 'Draft',
  render(id, ctx) {
    if (ed && ed.id === id && ed.node.isConnected && !ctx.force) return undefined;
    if (ed) ed.stop();
    const wait = loading(['submissions']);
    if (wait) return wait;
    const sub = store.get('submissions', id);
    if (!sub) return h('div', { class: 'page' }, backLink('#write', 'Write'), empty('Draft not found', 'It may have been deleted.'));
    if (sub.status !== 'draft') { location.replace('#sub-' + id); return h('div'); }
    ed = buildEditor(sub);
    return ed.node;
  },
};

function buildEditor(sub) {
  const localKey = 'draft.' + sub.id;
  const local = store.local(localKey);
  const state = {
    body: local && local.updated > sub.updated ? local.body : sub.body || '',
    elapsed: Math.max(sub.elapsed || 0, (local && local.elapsed) || 0),
    timer: sub.timer || 0,
  };
  const min = sub.task === 1 ? 150 : 250;
  const essayDoc = sub.essayId ? store.get('essays', sub.essayId) : null;

  const ta = h('textarea', { id: 'essay-body', class: 'editor', placeholder: 'Start writing…', spellcheck: 'false', autocapitalize: 'sentences' });
  ta.value = state.body;
  const wc = h('span', { class: 'wc' });
  const clockEl = h('span', { class: 'clock' });
  const status = h('span', { class: 'save-state muted' });

  const timerSeg = h('div', { class: 'seg small', role: 'group', 'aria-label': 'Timer' });
  const drawTimer = () => {
    timerSeg.replaceChildren(...[[0, 'No timer'], [20, '20 min'], [40, '40 min']].map(([m, label]) =>
      h('button', { 'aria-pressed': String(state.timer === m), onclick: () => { state.timer = m; drawTimer(); tick(); saveSoon(); } }, label)));
  };
  const tick = () => {
    if (state.timer) {
      const left = state.timer * 60 - state.elapsed;
      clockEl.textContent = left > 0 ? clock(left) + ' left' : 'Time’s up';
      clockEl.classList.toggle('over', left <= 0);
    } else {
      clockEl.textContent = clock(state.elapsed);
      clockEl.classList.remove('over');
    }
  };
  const count = () => {
    const n = countWords(ta.value);
    wc.textContent = `${n} words`;
    wc.classList.toggle('under', n < min);
    return n;
  };

  const saveRemote = async () => {
    status.textContent = 'Saving…';
    try {
      await store.update('submissions', sub.id, { body: state.body, words: countWords(state.body), elapsed: state.elapsed, timer: state.timer, updated: new Date().toISOString() });
      status.textContent = 'Saved';
    } catch { status.textContent = 'Saved on this device'; }
  };
  const saveSoon = debounce(saveRemote, 2000);
  const saveLocal = () => store.local(localKey, { body: state.body, elapsed: state.elapsed, updated: new Date().toISOString() });

  let typedAt = 0;
  ta.addEventListener('input', () => {
    state.body = ta.value;
    typedAt = Date.now();
    count();
    saveLocal();
    saveSoon();
    autosize();
  });
  const autosize = () => { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight, 320) + 'px'; };

  // Time counts while the page is visible and you typed in the last 2 minutes.
  const timerHandle = setInterval(() => {
    if (document.visibilityState !== 'visible' || Date.now() - typedAt > 120000) return;
    state.elapsed += 1;
    tick();
    if (state.elapsed % 15 === 0) saveLocal();
  }, 1000);

  let deleteArmed = false;
  const delBtn = h('button', { class: 'btn ghost', onclick: async () => {
    if (!deleteArmed) { deleteArmed = true; delBtn.textContent = 'Tap again to delete'; setTimeout(() => { deleteArmed = false; delBtn.textContent = 'Delete draft'; }, 3000); return; }
    stop(false);
    store.local(localKey, null);
    await store.remove('submissions', sub.id).catch(() => {});
    location.hash = 'write';
  } }, 'Delete draft');

  const submitBtn = h('button', { class: 'btn primary', onclick: async () => {
    const n = count();
    if (n < 20) { toast('Write a bit more before asking for feedback.'); return; }
    stop(false);
    const patch = { body: state.body, words: n, elapsed: state.elapsed, timer: state.timer, status: 'grading', updated: new Date().toISOString() };
    try { await store.update('submissions', sub.id, patch); } catch { toast('Couldn’t submit. Check your connection.'); return; }
    store.local(localKey, null);
    runGrade({ ...sub, ...patch });
    location.hash = 'sub-' + sub.id;
  } }, 'Submit for feedback');

  const node = h('div', { class: 'page editor-page' },
    h('div', { class: 'bar' }, backLink('#write', 'Write'), status),
    h('div', { class: 'tags' }, tag('Task ' + sub.task), essayDoc ? tag(essayDoc.type) : null),
    h('p', { class: 'prompt-box' }, sub.prompt),
    essayDoc ? figureView(essayDoc.figure) : null,
    h('div', { class: 'editor-tools' }, timerSeg, h('div', { class: 'editor-stats' }, h('span', { class: 'clock-wrap' }, icon('timer', 18), clockEl), wc)),
    ta,
    h('p', { class: 'muted small' }, `Aim for at least ${min} words. Your draft saves automatically.`),
    h('div', { class: 'actions' }, submitBtn, delBtn));

  drawTimer(); tick(); count();
  requestAnimationFrame(autosize);

  const onLeave = () => { if (!node.isConnected) stop(true); };
  window.addEventListener('hashchange', onLeave);
  function stop(save = true) {
    clearInterval(timerHandle);
    window.removeEventListener('hashchange', onLeave);
    if (save && state.body !== (sub.body || '')) saveRemote();
    if (ed && ed.id === sub.id) ed = null;
  }
  return { id: sub.id, node, stop };
}

// ---------- Grading jobs (keep running while you navigate) ----------

const jobs = new Map();

export function runGrade(sub) {
  if (jobs.has(sub.id)) return;
  const ctl = new AbortController();
  const job = { ctl, chars: 0, error: null };
  jobs.set(sub.id, job);
  const progress = () => { const el = document.getElementById('grade-progress'); if (el) el.textContent = job.chars ? `Writing feedback… ${job.chars} characters` : 'Reading your essay… this usually takes about a minute.'; };
  ai.grade(sub, { signal: ctl.signal, onText: ({ text }) => { job.chars = text.length; progress(); } })
    .then(async (feedback) => {
      jobs.delete(sub.id);
      await store.update('submissions', sub.id, { status: 'graded', feedback, gradedAt: new Date().toISOString() });
    })
    .catch(async (e) => {
      job.error = ai.errorText(e);
      jobs.delete(sub.id);
      failed.set(sub.id, job.error);
      await store.update('submissions', sub.id, { status: 'submitted' }).catch(() => {});
    });
}
const failed = new Map();

// ---------- Feedback ----------

export const feedback = {
  tab: 'writing', deps: ['submissions'], title: () => 'Feedback',
  render() {
    const page = h('div', { class: 'page' }, pageHead('Writing'), subnav(SUBNAV, 'feedback'));
    const wait = loading(['submissions']);
    if (wait) return page.append(wait), page;
    const subs = store.list('submissions').filter((s) => s.status !== 'draft').sort((a, b) => (b.updated > a.updated ? 1 : -1));
    if (!subs.length) {
      page.append(empty('No feedback yet', 'Finish an essay in Write and submit it. Claude grades it on the four IELTS criteria.', h('a', { class: 'btn primary', href: '#write' }, 'Write an essay')));
      return page;
    }
    const graded = subs.filter((s) => s.feedback && s.feedback.overall != null);
    if (graded.length >= 2) {
      const recent = graded.slice(0, 5);
      const avg = (k) => recent.reduce((t, s) => t + (s.feedback.criteria[k]?.band || 0), 0) / recent.length;
      page.append(h('section', { class: 'card trend' },
        h('p', { class: 'label' }, `AVERAGE OF YOUR LAST ${recent.length}`),
        h('div', { class: 'crit-grid' }, ...['TR', 'CC', 'LR', 'GRA'].map((k) => h('div', { class: 'crit' }, h('span', { class: 'crit-k' }, k), h('span', { class: 'crit-v' }, avg(k).toFixed(1)))))));
    }
    page.append(h('div', { class: 'list' }, ...subs.map((s) => h('a', { class: 'row card-row band-row', href: '#sub-' + s.id },
      h('div', { class: 'band-num' }, s.feedback?.overall != null ? s.feedback.overall.toFixed(1) : '–'),
      h('div', { class: 'band-text' },
        h('div', { class: 'tags' }, tag('Task ' + s.task), tag(`${s.words} words`, 'quiet'), s.status === 'grading' ? tag('Grading…', 'accent') : null, s.status === 'submitted' ? tag('Not graded', 'quiet') : null),
        h('p', { class: 'row-title clamp2' }, s.prompt),
        h('p', { class: 'row-meta' }, shortDate((s.gradedAt || s.updated).slice(0, 10))))))));
    return page;
  },
};

export const result = {
  tab: 'writing', deps: ['submissions', 'highlights', 'words'], title: () => 'Feedback',
  render(id) {
    const wait = loading(['submissions']);
    if (wait) return wait;
    const s = store.get('submissions', id);
    if (!s) return h('div', { class: 'page' }, backLink('#feedback', 'Feedback'), empty('Essay not found'));
    const names = ai.criteriaNames(s.task);
    const page = h('article', { class: 'page' }, h('div', { class: 'bar' }, backLink('#feedback', 'Feedback')),
      h('div', { class: 'tags' }, tag('Task ' + s.task), tag(`${s.words} words`, 'quiet'), s.elapsed ? tag(`${Math.round(s.elapsed / 60)} min`, 'quiet') : null),
      h('p', { class: 'prompt-box' }, s.prompt));

    if (s.status === 'grading' || jobs.has(s.id)) {
      if (!jobs.has(s.id)) runGrade(s); // page was reloaded mid-grading
      const job = jobs.get(s.id);
      page.append(h('section', { class: 'card stack' },
        h('p', { class: 'row-title' }, 'Grading your essay'),
        h('p', { id: 'grade-progress', class: 'muted' }, job && job.chars ? `Writing feedback… ${job.chars} characters` : 'Reading your essay… this usually takes about a minute.'),
        h('button', { class: 'btn ghost', onclick: () => jobs.get(s.id)?.ctl.abort() }, 'Stop')));
    } else if (!s.feedback) {
      const err = failed.get(s.id);
      page.append(h('section', { class: 'card stack' },
        h('p', { class: 'row-title' }, 'Not graded yet'),
        h('p', { class: 'muted' }, err || 'Ask Claude to grade it here, or say “grade my latest essay” in Claude Code.'),
        h('button', { class: 'btn primary', onclick: async () => { failed.delete(s.id); await store.update('submissions', s.id, { status: 'grading' }); runGrade(s); } }, 'Get feedback')));
    } else {
      const f = s.feedback;
      page.append(
        h('section', { class: 'band-hero' },
          h('div', null, h('p', { class: 'label' }, 'OVERALL (ESTIMATE)'), h('p', { class: 'band-big' }, f.overall != null ? f.overall.toFixed(1) : '–')),
          h('div', { class: 'crit-grid' }, ...['TR', 'CC', 'LR', 'GRA'].map((k) => h('div', { class: 'crit', title: names[k] }, h('span', { class: 'crit-k' }, k), h('span', { class: 'crit-v' }, f.criteria[k]?.band != null ? f.criteria[k].band.toFixed(1) : '–'))))),
        f.summary ? h('p', { class: 'lead' }, f.summary) : null,
        h('section', { class: 'section' }, h('h2', null, 'By criterion'),
          ...['TR', 'CC', 'LR', 'GRA'].map((k) => h('div', { class: 'crit-note' },
            h('p', { class: 'crit-name' }, `${names[k]} · ${f.criteria[k]?.band ?? '–'}`),
            h('p', null, f.criteria[k]?.comment || '')))),
        f.strengths?.length ? h('section', { class: 'section' }, h('h2', null, 'What works'), h('ul', { class: 'bullets' }, ...f.strengths.map((x) => h('li', null, x)))) : null,
        f.fixes?.length ? h('section', { class: 'section' }, h('h2', null, 'Fix these'),
          ...f.fixes.map((x) => h('div', { class: 'fix' },
            h('p', { class: 'fix-quote' }, x.quote),
            h('p', { class: 'fix-better' }, x.better),
            x.why ? h('p', { class: 'muted small' }, x.why) : null))) : null,
        f.nextStep ? h('section', { class: 'card next' }, h('p', { class: 'label' }, 'PRACTISE NEXT'), h('p', null, f.nextStep)) : null);
    }

    page.append(h('section', { class: 'section' }, h('h2', null, 'Your essay'),
      reader((s.body || '').split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean), { kind: 'sub', id: s.id, title: 'My essay' }, { className: 'prose' })),
    h('div', { class: 'actions' },
      h('button', { class: 'btn primary', onclick: () => startDraft({ task: s.task, prompt: s.prompt, essayId: s.essayId }) }, 'Write it again'),
      s.feedback ? h('button', { class: 'btn ghost', onclick: async () => { await store.update('submissions', s.id, { status: 'grading' }); runGrade(s); } }, 'Grade again') : null));
    return page;
  },
};
