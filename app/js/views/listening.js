// Listening: episode list and player with a timed transcript.
import { h, icon, clock, shortDate } from '../util.js';
import * as store from '../store.js';
import * as player from '../components/player.js';
import { reader } from '../components/reader.js';
import { pageHead, backLink, empty, loading, tag } from './common.js';

const byAdded = (a, b) => ((b.added || '') > (a.added || '') ? 1 : -1);

export const list = {
  tab: 'listening', deps: ['episodes'], title: () => 'Listening',
  render() {
    const page = h('div', { class: 'page' }, pageHead('Listening'));
    const wait = loading(['episodes']);
    if (wait) return page.append(wait), page;
    const eps = store.list('episodes').sort(byAdded);
    if (!eps.length) {
      page.append(empty('No episodes yet',
        'In Claude Code, say “Find a new listening episode about Singapore” or “Transcribe this: <YouTube link>”. Claude downloads the audio, transcribes it on your Mac and adds it here.'));
      return page;
    }
    page.append(h('div', { class: 'list' }, ...eps.map((ep) => {
      const pos = store.local('pos.' + ep.id) || 0;
      const pct = ep.duration ? Math.min(100, (pos / ep.duration) * 100) : 0;
      return h('a', { class: 'row card-row', href: '#ep-' + ep.id },
        h('p', { class: 'eyebrow' }, `${(ep.show || 'Episode').toUpperCase()}${ep.added ? ' · ' + shortDate(ep.added.slice(0, 10)).toUpperCase() : ''}`),
        h('p', { class: 'row-title' }, ep.title),
        h('div', { class: 'tags' }, tag(clock(ep.duration), 'quiet'), ep.accent ? tag(ep.accent + ' accent', 'quiet') : null, player.audioSrc(ep) ? null : tag('Transcript only', 'quiet')),
        pct > 1 ? h('div', { class: 'progress thin' }, h('div', { class: 'progress-fill', style: { width: pct + '%' } })) : null);
    })));
    page.append(h('p', { class: 'muted small' }, 'Audio is kept for the latest 10 episodes. Transcripts stay.'));
    return page;
  },
};

// Blind mode is the default every time you open an episode.
let shown = { id: null, transcript: false };
let unsub = null;

export const episode = {
  tab: 'listening', deps: ['episodes', 'highlights', 'words'], focus: true, title: () => 'Listening',
  render(id, ctx) {
    const wait = loading(['episodes']);
    if (wait) return wait;
    const ep = store.get('episodes', id);
    if (!ep) return h('div', { class: 'page' }, backLink('#listening', 'Listening'), empty('Episode not found'));
    if (shown.id !== id) shown = { id, transcript: false };
    player.load(ep);
    if (unsub) unsub();

    const hasAudio = !!player.audioSrc(ep);
    const segs = ep.segments || [];
    const playBtn = h('button', { class: 'play-btn', 'aria-label': 'Play', onclick: () => player.toggle(), disabled: !hasAudio }, icon('play', 30));
    const loopBtn = h('button', { class: 'icon-btn', 'aria-label': 'Loop current sentence', 'aria-pressed': String(player.looping()), onclick: () => player.setLoop(!player.looping()) }, icon('loop', 22));
    const scrub = h('input', { id: 'scrub', class: 'scrub', type: 'range', min: '0', max: String(Math.round(ep.duration || 0)), step: '1', value: '0', 'aria-label': 'Position', disabled: !hasAudio });
    const tCur = h('span', null, '0:00');
    const tDur = h('span', null, clock(ep.duration));
    const nowLine = h('p', { class: 'now-line' }, shown.transcript ? '' : 'Transcript hidden — listen first.');
    let dragging = false;
    scrub.addEventListener('input', () => { dragging = true; tCur.textContent = clock(scrub.value); });
    scrub.addEventListener('change', () => { dragging = false; player.seek(Number(scrub.value)); });

    const lead = (i) => h('button', { class: 'ts', 'aria-label': `Play from ${clock(segs[i].s)}`, onclick: () => player.seek(segs[i].s) }, clock(segs[i].s));
    const transcript = shown.transcript
      ? reader(segs.map((s) => s.t), { kind: 'ep', id: ep.id, title: ep.title }, { className: 'transcript', lead })
      : null;

    let lastIdx = -2;
    const sync = () => {
      if (!scrub.isConnected) { if (unsub) { unsub(); unsub = null; } return; }
      const t = player.el.currentTime || 0;
      if (!dragging) { scrub.value = String(Math.floor(t)); tCur.textContent = clock(t); }
      if (player.el.duration && Number.isFinite(player.el.duration)) { scrub.max = String(Math.floor(player.el.duration)); tDur.textContent = clock(player.el.duration); }
      const playing = player.isPlaying();
      playBtn.replaceChildren(icon(playing ? 'pause' : 'play', 30));
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      loopBtn.setAttribute('aria-pressed', String(player.looping()));
      const idx = player.segIndex(t);
      if (idx !== lastIdx) {
        lastIdx = idx;
        if (transcript) {
          for (const r of transcript.querySelectorAll('.para-row.now')) r.classList.remove('now');
          const row = transcript.querySelector(`[data-row="${idx}"]`);
          if (row) {
            row.classList.add('now');
            if (playing && !window.getSelection()?.toString()) row.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
          }
        }
      }
    };
    unsub = player.onTick(sync);

    const page = h('div', { class: 'page player-page' },
      h('div', { class: 'bar' }, backLink('#listening', 'Listening')),
      h('p', { class: 'eyebrow' }, `${(ep.show || '').toUpperCase()}${ep.accent ? ' · ' + ep.accent.toUpperCase() + ' ACCENT' : ''}`),
      h('h1', { class: 'article-title' }, ep.title),
      ep.url ? h('a', { class: 'small', href: ep.url, target: '_blank', rel: 'noopener' }, 'Original source') : null,
      h('section', { class: 'player card' },
        hasAudio ? null : h('p', { class: 'muted small' }, 'Audio for this episode was cleaned up. The transcript is still here.'),
        h('div', { class: 'scrub-row' }, scrub, h('div', { class: 'times' }, tCur, tDur)),
        h('div', { class: 'controls' },
          h('button', { class: 'icon-btn', 'aria-label': 'Back 5 seconds', onclick: () => player.skip(-5), disabled: !hasAudio }, icon('rewind', 24)),
          playBtn,
          h('button', { class: 'icon-btn', 'aria-label': 'Forward 5 seconds', onclick: () => player.skip(5), disabled: !hasAudio }, icon('forward', 24)),
          loopBtn)),
      h('div', { class: 'split' },
        h('h2', null, 'Transcript'),
        h('button', { class: 'btn ghost small', 'aria-pressed': String(shown.transcript), onclick: () => { shown.transcript = !shown.transcript; ctx.refresh(); } },
          icon('eye', 18), shown.transcript ? 'Hide' : 'Show')),
      transcript || nowLine,
      transcript ? h('p', { class: 'muted small' }, 'Tap a time to play from there. Tap a word to look it up. Loop repeats the current sentence.') : null);
    requestAnimationFrame(sync);
    return page;
  },
};
