// Building blocks shared by the views.
import { h, icon } from '../util.js';
import * as store from '../store.js';

export function pageHead(title, { eyebrow, action } = {}) {
  return h('header', { class: 'page-head' },
    h('div', { class: 'page-title' },
      eyebrow ? h('p', { class: 'eyebrow' }, eyebrow) : null,
      h('h1', null, title)),
    action || null);
}

export function backLink(href, label) {
  return h('a', { class: 'back', href }, icon('back', 20), label);
}

// Sub-navigation inside a tab, e.g. Model Essays | Write | Feedback
export function subnav(items, active) {
  return h('nav', { class: 'seg', 'aria-label': 'Section' },
    ...items.map(([id, label]) => h('a', { href: '#' + id, 'aria-current': id === active ? 'page' : null }, label)));
}

export function empty(title, text, extra) {
  return h('div', { class: 'empty' }, h('p', { class: 'empty-title' }, title), text ? h('p', { class: 'muted' }, text) : null, extra || null);
}

export function loading(cols) {
  if (!store.ready() || cols.some((c) => !store.isLoaded(c))) return h('div', { class: 'empty' }, h('p', { class: 'muted' }, 'Loading…'));
  return null;
}

export function saveButton(col, doc, label = 'Save') {
  const on = !!doc.saved;
  return h('button', {
    class: 'icon-btn' + (on ? ' on' : ''), 'aria-label': on ? 'Remove from Saved' : label, 'aria-pressed': String(on),
    onclick: () => store.update(col, doc.id, { saved: !on }).catch(() => {}),
  }, icon('bookmark', 22));
}

export function tag(text, cls = '') { return h('span', { class: 'tag ' + cls }, text); }

// Where a word's source link goes.
export function sourceHref(src) {
  if (!src || !src.id) return null;
  const map = { essay: 'essay-', news: 'news-', lit: 'lit-', ep: 'ep-', sub: 'sub-' };
  return map[src.kind] ? '#' + map[src.kind] + src.id : null;
}
