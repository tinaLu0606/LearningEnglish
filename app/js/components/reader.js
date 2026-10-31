// Reading surface used everywhere text is read (essays, news, literature,
// transcripts, your own essays). Tap a word → lookup sheet; select text or use the
// sheet → highlight / underline a word, sentence or paragraph.
import { h, icon, toast, todayStr, wordId, newId } from '../util.js';
import * as store from '../store.js';
import * as ai from '../ai.js';
import { openSheet, closeSheet } from './sheet.js';

const WORD_CHAR = /[A-Za-z0-9'’-]/;

// paras: string[]; src: {kind, id, title}; opts: {verse, lead(i) → Node, className}
export function reader(paras, src, opts = {}) {
  const hid = `${src.kind}-${src.id}`;
  const marks = store.get('highlights', hid)?.items || [];
  const wrap = h('div', { class: 'reader ' + (opts.className || '') + (opts.verse ? ' verse' : ''), dataset: { src: hid } });
  paras.forEach((text, i) => {
    const p = h('p', { class: 'para', dataset: { para: String(i) } }, ...renderMarks(text, marks.filter((m) => m.para === i)));
    if (opts.lead) wrap.append(h('div', { class: 'para-row', dataset: { row: String(i) } }, opts.lead(i), p));
    else wrap.append(p);
  });
  wrap.addEventListener('click', (e) => onTap(e, paras, src));
  wrap._src = src;
  wrap._paras = paras;
  return wrap;
}

function renderMarks(text, items) {
  if (!items.length) return [text];
  const cuts = new Set([0, text.length]);
  for (const m of items) { cuts.add(clamp(m.start, text)); cuts.add(clamp(m.end, text)); }
  const pts = [...cuts].sort((a, b) => a - b);
  const out = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    const piece = text.slice(a, b);
    const cover = items.filter((m) => m.start <= a && m.end >= b);
    if (!cover.length) { out.push(piece); continue; }
    const cls = ['mk'];
    if (cover.some((m) => m.kind === 'highlight')) cls.push('hl');
    if (cover.some((m) => m.kind === 'underline')) cls.push('ul');
    out.push(h('span', { class: cls.join(' '), dataset: { mid: cover[cover.length - 1].id } }, piece));
  }
  return out;
}
const clamp = (n, text) => Math.max(0, Math.min(text.length, n | 0));

// ---------- tap → word ----------

function caretAt(x, y) {
  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    return r && { node: r.startContainer, offset: r.startOffset };
  }
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    return p && { node: p.offsetNode, offset: p.offset };
  }
  return null;
}

function offsetIn(paraEl, node, offset) {
  const walker = document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT);
  let total = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n === node) return total + offset;
    total += n.textContent.length;
  }
  return -1;
}

export function wordAt(text, i) {
  if (!WORD_CHAR.test(text[i] || '') && WORD_CHAR.test(text[i - 1] || '')) i -= 1;
  if (!WORD_CHAR.test(text[i] || '')) return null;
  let s = i, e = i;
  while (s > 0 && WORD_CHAR.test(text[s - 1])) s--;
  while (e < text.length && WORD_CHAR.test(text[e])) e++;
  while (s < e && /['’-]/.test(text[s])) s++;
  while (e > s && /['’-]/.test(text[e - 1])) e--;
  if (s >= e || !/[A-Za-z]/.test(text.slice(s, e))) return null;
  return { start: s, end: e, word: text.slice(s, e) };
}

export function sentenceAt(text, start, end) {
  let s = start, e = end;
  while (s > 0 && !/[.!?\n]/.test(text[s - 1])) s--;
  while (s < start && /[\s"'“”‘’)\]]/.test(text[s])) s++;
  while (e < text.length && !/[.!?\n]/.test(text[e])) e++;
  while (e < text.length && /[.!?"'”’)\]]/.test(text[e])) e++;
  return { start: s, end: e, text: text.slice(s, e).trim() };
}

function onTap(e, paras, src) {
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed) return;
  if (e.target.closest('button, a, input, textarea')) return;
  const paraEl = e.target.closest('[data-para]');
  if (!paraEl) return;
  const c = caretAt(e.clientX, e.clientY);
  if (!c || !paraEl.contains(c.node)) return;
  const i = Number(paraEl.dataset.para);
  const text = paras[i];
  const off = offsetIn(paraEl, c.node, c.offset);
  if (off < 0) return;
  const w = wordAt(text, off);
  if (!w) return;
  const sentence = sentenceAt(text, w.start, w.end);
  const markEl = e.target.closest('[data-mid]');
  openLookup({ term: w.word, sentence: sentence.text, src, para: i, word: w, sent: sentence, paraText: text, markId: markEl?.dataset.mid });
}

// ---------- lookup sheet ----------

export function openLookup(ctx) {
  const { term, sentence, src } = ctx;
  const head = h('div', { class: 'lk-head' },
    h('div', { class: 'lk-title' },
      h('p', { class: 'lk-term' }, term),
      h('p', { class: 'lk-meta' }, 'Looking up…')),
    h('button', { class: 'icon-btn soft', 'aria-label': 'Play pronunciation', onclick: () => { if (!ai.speak(entry?.term || term)) toast('Speech isn’t available on this device.'); } }, icon('speaker', 22)));
  const zh = h('p', { class: 'lk-zh' });
  const gloss = h('p', { class: 'lk-gloss' });
  const addBtn = h('button', { class: 'btn primary block', disabled: true }, 'Add to Words');
  const body = h('div', { class: 'stack' }, head, zh, gloss, addBtn);
  let entry = null;

  let addedId = null;
  const existing = () => store.get('words', wordId(entry?.term || term)) || store.get('words', wordId(term)) || (addedId && { id: addedId });
  const refreshAdd = () => {
    const w = existing();
    if (w) {
      addBtn.textContent = 'In your Words · open';
      addBtn.className = 'btn ghost block';
      addBtn.disabled = false;
      addBtn.onclick = () => { closeSheet(); location.hash = 'word-' + w.id; };
    } else {
      addBtn.textContent = 'Add to Words';
      addBtn.className = 'btn primary block';
      addBtn.disabled = !entry;
      addBtn.onclick = async () => {
        addBtn.disabled = true;
        try {
          addedId = await addWord(entry, sentence, src);
          toast(`Added “${entry.term}”`);
          refreshAdd();
        } catch (err) { console.warn(err); toast('Couldn’t save the word. Try again.'); addBtn.disabled = false; }
      };
    }
  };

  if (ctx.para != null && src) body.append(markControls(ctx));

  openSheet(body, { label: `Look up ${term}` });
  refreshAdd();

  ai.lookup(term, sentence).then((r) => {
    entry = r;
    head.querySelector('.lk-term').textContent = r.term || term;
    head.querySelector('.lk-meta').textContent = [r.ipa, r.pos].filter(Boolean).join(' · ');
    zh.textContent = r.zh;
    gloss.textContent = r.gloss;
    refreshAdd();
  }).catch((err) => {
    head.querySelector('.lk-meta').textContent = '';
    gloss.textContent = ai.errorText(err);
    // Still allow saving the bare word; Claude Code can fill in the meaning later.
    entry = { term, ipa: '', pos: '', zh: '', gloss: '' };
    refreshAdd();
  });
}

export async function addWord(entry, sentence, src) {
  const id = wordId(entry.term);
  const today = todayStr();
  await store.set('words', id, {
    term: entry.term, zh: entry.zh || '', ipa: entry.ipa || '', pos: entry.pos || '', gloss: entry.gloss || '',
    example: sentence || '', source: src ? { kind: src.kind, id: src.id, title: src.title || '' } : null,
    stage: 0, due: today, added: new Date().toISOString(), firstSeen: null, lastReviewed: null, lapses: 0,
  });
  return id;
}

function markControls(ctx) {
  let kind = 'highlight';
  const seg = h('div', { class: 'seg small', role: 'group', 'aria-label': 'Mark style' });
  const setKind = (k) => { kind = k; for (const b of seg.children) b.setAttribute('aria-pressed', String(b.dataset.k === k)); };
  seg.append(
    h('button', { dataset: { k: 'highlight' }, onclick: () => setKind('highlight') }, 'Highlight'),
    h('button', { dataset: { k: 'underline' }, onclick: () => setKind('underline') }, 'Underline'));
  setKind('highlight');
  const mark = (start, end) => { addMark(ctx.src, { para: ctx.para, start, end, kind, text: ctx.paraText.slice(start, end) }); closeSheet(); };
  const row = h('div', { class: 'mark-row' },
    h('button', { class: 'chip', onclick: () => mark(ctx.word.start, ctx.word.end) }, 'Word'),
    h('button', { class: 'chip', onclick: () => mark(ctx.sent.start, ctx.sent.end) }, 'Sentence'),
    h('button', { class: 'chip', onclick: () => mark(0, ctx.paraText.length) }, 'Paragraph'));
  const box = h('div', { class: 'mark-box' }, h('p', { class: 'label' }, 'MARK'), seg, row);
  if (ctx.markId) {
    box.append(h('button', { class: 'btn ghost small', onclick: () => { removeMark(ctx.src, ctx.markId); closeSheet(); } }, 'Remove this mark'));
  }
  return box;
}

export async function addMark(src, item) {
  const id = `${src.kind}-${src.id}`;
  const cur = store.get('highlights', id);
  const items = [...(cur?.items || []), { ...item, id: newId(), created: new Date().toISOString() }];
  try { await store.set('highlights', id, { srcKind: src.kind, srcId: src.id, title: src.title || '', items, updated: new Date().toISOString() }); }
  catch { toast('Couldn’t save the mark.'); }
}

export async function removeMark(src, markId) {
  const id = `${src.kind}-${src.id}`;
  const cur = store.get('highlights', id);
  if (!cur) return;
  const items = cur.items.filter((m) => m.id !== markId);
  try { await store.set('highlights', id, { ...cur, items, updated: new Date().toISOString() }); }
  catch { toast('Couldn’t remove the mark.'); }
}

// ---------- text selection → floating mark bar ----------

let selBar = null;
export function installSelectionBar() {
  selBar = document.getElementById('selbar');
  const check = () => {
    const sel = window.getSelection();
    const info = selectionInfo(sel);
    if (!info) { selBar.hidden = true; return; }
    selBar.replaceChildren(
      h('button', { class: 'chip', onmousedown: (e) => e.preventDefault(), onclick: () => applySel(info, 'highlight') }, 'Highlight'),
      h('button', { class: 'chip', onmousedown: (e) => e.preventDefault(), onclick: () => applySel(info, 'underline') }, 'Underline'),
      info.single ? h('button', { class: 'chip', onmousedown: (e) => e.preventDefault(), onclick: () => { selBar.hidden = true; sel.removeAllRanges(); openLookup(info.lookup); } }, 'Look up') : null);
    selBar.hidden = false;
  };
  let t;
  document.addEventListener('selectionchange', () => { clearTimeout(t); t = setTimeout(check, 250); });
}

function selectionInfo(sel) {
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const startEl = (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement)?.closest('[data-para]');
  if (!startEl) return null;
  const readerEl = startEl.closest('.reader');
  if (!readerEl || !readerEl._src) return null;
  const i = Number(startEl.dataset.para);
  const text = readerEl._paras[i];
  const start = offsetIn(startEl, range.startContainer, range.startOffset);
  let end = startEl.contains(range.endContainer) ? offsetIn(startEl, range.endContainer, range.endOffset) : text.length;
  if (start < 0 || end <= start) return null;
  // trim whitespace
  let s = start; while (s < end && /\s/.test(text[s])) s++;
  let e = end; while (e > s && /\s/.test(text[e - 1])) e--;
  if (e <= s) return null;
  const chunk = text.slice(s, e);
  const single = /^[A-Za-z][A-Za-z'’-]*$/.test(chunk);
  const w = single ? { start: s, end: e, word: chunk } : null;
  const sent = sentenceAt(text, s, e);
  return {
    src: readerEl._src, para: i, start: s, end: e, text: chunk, single,
    lookup: w && { term: chunk, sentence: sent.text, src: readerEl._src, para: i, word: w, sent, paraText: text },
  };
}

function applySel(info, kind) {
  addMark(info.src, { para: info.para, start: info.start, end: info.end, kind, text: info.text });
  window.getSelection().removeAllRanges();
  selBar.hidden = true;
}
