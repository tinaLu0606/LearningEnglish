// Today: what to do now, in priority order.
import { h, icon, todayStr, longDate, countWords } from '../util.js';
import * as store from '../store.js';
import * as srs from '../srs.js';
import { latest } from './discover.js';

export default {
  tab: 'today', deps: ['words', 'news', 'literature', 'submissions', 'episodes', 'daily'], title: () => 'Today',
  render() {
    const today = todayStr();
    const page = h('div', { class: 'page today' },
      h('header', { class: 'page-head' },
        h('div', { class: 'page-title' }, h('p', { class: 'eyebrow' }, longDate(today).toUpperCase()), h('h1', null, 'Today')),
        h('a', { class: 'icon-btn', href: '#prefs', 'aria-label': 'Preferences' }, icon('gear', 22))));

    if (!store.ready()) { page.append(h('p', { class: 'muted' }, 'Loading…')); return page; }

    // Words
    const q = srs.queue(store.list('words'), today);
    const done = store.get('daily', today);
    const n = q.all.length;
    page.append(h('section', { class: 'card hero-card' },
      h('div', { class: 'split' }, h('p', { class: 'card-k' }, 'Words due'), h('p', { class: 'muted small' }, n ? `about ${Math.max(1, Math.round(n * 12 / 60))} min` : (done ? `${done.reviewed} reviewed today` : ''))),
      h('p', { class: 'big-num accent' }, String(n)),
      n ? h('a', { class: 'btn primary block', href: '#review' }, 'Start review')
        : h('a', { class: 'btn ghost block', href: '#library' }, store.list('words').length ? 'All caught up · open Library' : 'Tap words while reading to collect them')));

    // Writing: continue a draft, or a gentle nudge
    const subs = store.list('submissions');
    const draft = subs.filter((s) => s.status === 'draft').sort((a, b) => (b.updated > a.updated ? 1 : -1))[0];
    const lastGraded = subs.filter((s) => s.feedback && s.feedback.overall != null).sort((a, b) => ((b.gradedAt || '') > (a.gradedAt || '') ? 1 : -1))[0];
    page.append(h('a', { class: 'card link-card', href: draft ? '#draft-' + draft.id : '#write' },
      h('p', { class: 'eyebrow' }, 'WRITING'),
      h('p', { class: 'card-title' }, draft ? 'Continue your draft' : 'Write one essay today'),
      h('p', { class: 'muted small clamp2' }, draft ? `${countWords(draft.body || '')} words · ${draft.prompt}` : lastGraded ? `Last band: ${lastGraded.feedback.overall.toFixed(1)} · target 8.0` : 'Task 2 · 40 minutes · 250+ words')));

    // News
    const news = latest('news');
    if (news) {
      page.append(h('a', { class: 'card link-card', href: '#news-' + news.date },
        h('p', { class: 'eyebrow' }, `NEWS · ${(news.tags && news.tags[0] || 'Singapore').toUpperCase()}${news.date !== today ? ' · ' + news.date.slice(5) : ''}`),
        h('p', { class: 'card-title' }, news.hook || news.title),
        h('p', { class: 'muted small' }, `${Math.max(1, Math.round(countWords((news.body || []).join(' ')) / 200))} min read`)));
    }

    // Literature
    const lit = latest('literature');
    if (lit) {
      const first = (lit.text && lit.text[0]) || '';
      page.append(h('a', { class: 'card link-card', href: '#lit-' + lit.date },
        h('p', { class: 'eyebrow' }, `LITERATURE · ${lit.author.toUpperCase()}, ${lit.work.toUpperCase()}`),
        h('p', { class: 'lit-preview' }, first.length > 160 ? first.slice(0, 157).replace(/\s+\S*$/, '') + '…' : first),
        lit.notes && lit.notes[0] ? h('p', { class: 'muted small' }, 'Today’s note: ' + lit.notes[0].title) : null));
    }

    // Listening
    const ep = store.list('episodes').sort((a, b) => ((b.added || '') > (a.added || '') ? 1 : -1))[0];
    if (ep) {
      page.append(h('a', { class: 'card link-card', href: '#ep-' + ep.id },
        h('p', { class: 'eyebrow' }, `LISTENING · ${(ep.show || '').toUpperCase()}`),
        h('p', { class: 'card-title' }, ep.title),
        h('p', { class: 'muted small' }, `${Math.round((ep.duration || 0) / 60)} min${ep.accent ? ' · ' + ep.accent + ' accent' : ''}`)));
    }
    return page;
  },
};
