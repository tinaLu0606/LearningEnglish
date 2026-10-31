// Discover: News · Literature · Saved
import { h, todayStr, addDays, longDate, shortDate } from '../util.js';
import * as store from '../store.js';
import { reader } from '../components/reader.js';
import { pageHead, backLink, subnav, empty, loading, saveButton, tag } from './common.js';

const SUBNAV = [['discover', 'News'], ['literature', 'Literature'], ['saved', 'Saved']];
const LEVELS = ['', 'Easy', 'Light', 'Standard', 'Hard', 'Very hard'];

// Literature is generated ahead of time; never show a date after today.
export function visible(col, days = 14) {
  const today = todayStr();
  const from = addDays(today, -(days - 1));
  return store.list(col).filter((d) => d.date <= today && (d.date >= from || d.saved)).sort((a, b) => (b.date > a.date ? 1 : -1));
}

export function latest(col) {
  const today = todayStr();
  return store.list(col).filter((d) => d.date <= today).sort((a, b) => (b.date > a.date ? 1 : -1))[0] || null;
}

const litEyebrow = (l) => `LITERATURE · ${l.author.toUpperCase()}, ${l.work.toUpperCase()}`;

export const news = {
  tab: 'discover', deps: ['news'], title: () => 'News',
  render() {
    const page = h('div', { class: 'page' }, pageHead('Discover'), subnav(SUBNAV, 'discover'));
    const wait = loading(['news']);
    if (wait) return page.append(wait), page;
    const items = visible('news');
    if (!items.length) {
      page.append(empty('No news yet', 'In Claude Code, say “Add today’s news”.'));
      return page;
    }
    page.append(h('div', { class: 'list' }, ...items.map((n) => h('a', { class: 'row card-row', href: '#news-' + n.date },
      h('p', { class: 'eyebrow' }, `${shortDate(n.date).toUpperCase()} · ${(n.tags && n.tags[0] || 'Singapore').toUpperCase()}`),
      h('p', { class: 'row-title' }, n.hook || n.title),
      h('p', { class: 'row-meta' }, n.title)))));
    return page;
  },
};

export const newsItem = {
  tab: 'discover', deps: ['news', 'highlights', 'words'], title: () => 'News',
  render(date) {
    const wait = loading(['news']);
    if (wait) return wait;
    const n = store.get('news', date);
    if (!n) return h('div', { class: 'page' }, backLink('#discover', 'News'), empty('Not found', 'This item may have been cleaned up.'));
    const src = { kind: 'news', id: n.id, title: n.title };
    return h('article', { class: 'page' },
      h('div', { class: 'bar' }, backLink('#discover', 'News'), saveButton('news', n)),
      h('p', { class: 'eyebrow' }, `NEWS · ${(n.tags && n.tags[0] || 'Singapore').toUpperCase()} · ${longDate(n.date).toUpperCase()}`),
      h('h1', { class: 'article-title' }, n.hook || n.title),
      n.hook ? h('p', { class: 'muted' }, n.title) : null,
      reader(n.body || [], src, { className: 'prose' }),
      n.url ? h('p', { class: 'source' }, 'Source: ', h('a', { href: n.url, target: '_blank', rel: 'noopener' }, n.source || n.url)) : h('p', { class: 'source' }, 'Source: ' + (n.source || '')));
  },
};

export const literature = {
  tab: 'discover', deps: ['literature'], title: () => 'Literature',
  render() {
    const page = h('div', { class: 'page' }, pageHead('Discover'), subnav(SUBNAV, 'literature'));
    const wait = loading(['literature']);
    if (wait) return page.append(wait), page;
    const items = visible('literature');
    if (!items.length) {
      page.append(empty('No excerpts yet', 'In Claude Code, say “Generate the next 30 days of literature”.'));
      return page;
    }
    page.append(h('div', { class: 'list' }, ...items.map((l) => h('a', { class: 'row card-row', href: '#lit-' + l.date },
      h('p', { class: 'eyebrow' }, `${shortDate(l.date).toUpperCase()} · ${l.author.toUpperCase()}`),
      h('p', { class: 'row-title lit-title' }, l.work + (l.year ? ` (${l.year})` : '')),
      h('p', { class: 'row-meta clamp2 serif' }, (l.text && l.text[0] || '').replace(/\n/g, ' / ')),
      h('div', { class: 'tags' }, tag(`Level ${l.level} · ${LEVELS[l.level] || ''}`, l.level >= 4 ? 'accent' : 'quiet'))))));
    return page;
  },
};

export const litItem = {
  tab: 'discover', deps: ['literature', 'highlights', 'words'], title: () => 'Literature',
  render(date) {
    const wait = loading(['literature']);
    if (wait) return wait;
    const l = store.get('literature', date);
    if (!l || l.date > todayStr()) return h('div', { class: 'page' }, backLink('#literature', 'Literature'), empty('Not available yet'));
    const src = { kind: 'lit', id: l.id, title: `${l.author}, ${l.work}` };
    return h('article', { class: 'page' },
      h('div', { class: 'bar' }, backLink('#literature', 'Literature'), saveButton('literature', l)),
      h('p', { class: 'eyebrow' }, litEyebrow(l)),
      h('h1', { class: 'article-title' }, l.work),
      h('div', { class: 'tags' }, tag(l.year ? String(l.year) : ''), tag(`Level ${l.level} · ${LEVELS[l.level] || ''}`, l.level >= 4 ? 'accent' : 'quiet'), tag(l.form === 'verse' ? 'Poetry' : 'Prose', 'quiet')),
      reader(l.text || [], src, { className: 'literary', verse: l.form === 'verse' }),
      (l.notes || []).length ? h('section', { class: 'section notes' }, h('h2', null, 'Today’s notes'),
        ...l.notes.map((n) => h('div', { class: 'note' },
          h('p', { class: 'label' }, n.kind.toUpperCase()),
          h('p', { class: 'note-title' }, n.title),
          h('p', null, n.body)))) : null);
  },
};

export const saved = {
  tab: 'discover', deps: ['news', 'literature', 'essays'], title: () => 'Saved',
  render() {
    const page = h('div', { class: 'page' }, pageHead('Discover'), subnav(SUBNAV, 'saved'));
    const wait = loading(['news', 'literature']);
    if (wait) return page.append(wait), page;
    const rows = [
      ...store.list('news').filter((n) => n.saved).map((n) => ({ when: n.date, eyebrow: 'NEWS', title: n.hook || n.title, href: '#news-' + n.date })),
      ...store.list('literature').filter((l) => l.saved).map((l) => ({ when: l.date, eyebrow: `LITERATURE · ${l.author.toUpperCase()}`, title: l.work, href: '#lit-' + l.date })),
      ...store.list('essays').filter((e) => e.saved).map((e) => ({ when: (e.added || '').slice(0, 10), eyebrow: `ESSAY · TASK ${e.task}`, title: e.prompt, href: '#essay-' + e.id })),
    ].sort((a, b) => (b.when > a.when ? 1 : -1));
    if (!rows.length) { page.append(empty('Nothing saved yet', 'Tap the bookmark on a news item, excerpt or essay to keep it here. Saved items are never cleaned up.')); return page; }
    page.append(h('div', { class: 'list' }, ...rows.map((r) => h('a', { class: 'row card-row', href: r.href },
      h('p', { class: 'eyebrow' }, r.eyebrow), h('p', { class: 'row-title clamp2' }, r.title)))));
    return page;
  },
};
