// One audio element for the whole app, so playback continues while you browse.
import * as store from '../store.js';

const audio = new Audio();
audio.preload = 'metadata';
let ep = null;
let loop = false;
let loopIndex = -1;
const subs = new Set();
let lastSave = 0;

export const current = () => ep;
export const el = audio;
export const isPlaying = () => !audio.paused && !audio.ended;
export const looping = () => loop;

export function audioSrc(episode) {
  if (episode.audioUrl) return episode.audioUrl;
  if (episode.assetId) return '/_blob/' + episode.assetId;
  return '';
}

export function load(episode) {
  if (ep && ep.id === episode.id) { ep = episode; return; }
  ep = episode;
  loop = false;
  loopIndex = -1;
  const src = audioSrc(episode);
  if (!src) { audio.removeAttribute('src'); audio.load(); notify(); return; }
  audio.src = src;
  const pos = store.local('pos.' + episode.id);
  if (pos) {
    const seekTo = () => { audio.currentTime = pos; audio.removeEventListener('loadedmetadata', seekTo); };
    audio.addEventListener('loadedmetadata', seekTo);
  }
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: episode.title, artist: episode.show || 'English Lab', album: 'English Lab' });
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => skip(-5));
      navigator.mediaSession.setActionHandler('seekforward', () => skip(5));
    } catch { /* not supported */ }
  }
  notify();
}

export function toggle() {
  if (!audio.src) return;
  if (audio.paused) audio.play().catch(() => {}); else audio.pause();
}
export function seek(t) {
  if (!audio.src) return;
  audio.currentTime = Math.max(0, t);
  if (loop) loopIndex = Math.max(0, segIndex(t + 0.01));
  if (audio.paused) audio.play().catch(() => {});
}
export function skip(d) { if (audio.src) audio.currentTime = Math.max(0, audio.currentTime + d); }

export function segIndex(t = audio.currentTime) {
  const segs = ep?.segments || [];
  let lo = 0, hi = segs.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segs[mid].s <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

export function setLoop(on) {
  loop = on;
  loopIndex = on ? Math.max(0, segIndex()) : -1;
  notify();
}

// Subscribe to time/state updates. Returns an unsubscribe function.
export function onTick(fn) { subs.add(fn); return () => subs.delete(fn); }
function notify() { for (const fn of subs) fn(); }

audio.addEventListener('timeupdate', () => {
  const segs = ep?.segments || [];
  if (loop && loopIndex >= 0 && segs[loopIndex]) {
    const seg = segs[loopIndex];
    if (audio.currentTime >= seg.e - 0.05 || audio.currentTime < seg.s - 0.5) audio.currentTime = seg.s;
  }
  const now = Date.now();
  if (ep && now - lastSave > 4000) { lastSave = now; store.local('pos.' + ep.id, Math.floor(audio.currentTime)); }
  notify();
});
for (const ev of ['play', 'pause', 'ended', 'loadedmetadata', 'error']) audio.addEventListener(ev, notify);
