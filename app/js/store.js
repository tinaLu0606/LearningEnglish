// Data layer. Cloud db (artifact `db` capability) is the single source of truth;
// every watched collection is mirrored in memory and views re-render on change.
// Outside claude.ai (local preview) a localStorage mock stands in, seeded from data/seed.

export const WATCHED = ['words', 'essays', 'submissions', 'highlights', 'episodes', 'news', 'literature', 'daily', 'inbox'];

let db = null;
export let mode = 'connecting'; // connecting | online | offline
const cache = new Map();        // collection → Map(id → doc)
const loaded = new Set();
const listeners = new Set();

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(col) { for (const fn of listeners) fn(col); }

export async function init() {
  let real = null;
  if (window.claude && typeof window.claude.use === 'function') {
    try { real = await window.claude.use('db'); } catch { real = null; }
  }
  if (real) { db = real; mode = 'online'; }
  else { db = await mockDb(); mode = 'offline'; }
  for (const col of WATCHED) watch(col);
  emit('*');
}

function watch(col) {
  cache.set(col, new Map());
  const subscribe = () => db.collection(col).onSnapshot(
    (snap) => {
      const m = new Map();
      for (const d of snap.docs) m.set(d.id, { ...d.data(), id: d.id });
      cache.set(col, m);
      loaded.add(col);
      emit(col);
    },
    (err) => {
      console.warn('[store]', col, err && err.code);
      // A dead bridge needs a fresh subscription; anything else is terminal.
      if (err && err.code === 'unavailable') setTimeout(subscribe, 4000);
      else { loaded.add(col); emit(col); }
    },
  );
  subscribe();
}

export const ready = () => mode !== 'connecting';
export const isLoaded = (col) => loaded.has(col);
export const list = (col) => [...(cache.get(col)?.values() ?? [])];
export const get = (col, id) => cache.get(col)?.get(id) ?? null;

// Read a document that is not watched (e.g. the dict cache).
export async function fetchDoc(col, id) {
  if (!db) return null;
  try {
    const s = await db.doc(`${col}/${id}`).get();
    return s.exists ? { ...s.data(), id } : null;
  } catch { return null; }
}

const clean = (data) => { const { id, ...rest } = data; return JSON.parse(JSON.stringify(rest)); };

async function retryOnce(fn) {
  try { return await fn(); }
  catch (e) {
    if (e && e.code === 'unavailable') {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
      return fn();
    }
    throw e;
  }
}

export function set(col, id, data) { return retryOnce(() => db.doc(`${col}/${id}`).set(clean(data))); }
export function update(col, id, data) { return retryOnce(() => db.doc(`${col}/${id}`).update(clean(data))); }
export function remove(col, id) { return retryOnce(() => db.doc(`${col}/${id}`).delete()); }

// ---------- device preferences (never synced) ----------

const PREF_KEY = 'el.prefs';
const PREF_DEFAULTS = { accent: '#3B7A63', theme: 'system', fontSize: 18 };

export function prefs() {
  try { return { ...PREF_DEFAULTS, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; }
  catch { return { ...PREF_DEFAULTS }; }
}
export function setPrefs(patch) {
  const next = { ...prefs(), ...patch };
  try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  return next;
}
export function local(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem('el.' + key) || 'null');
    if (value === null) localStorage.removeItem('el.' + key);
    else localStorage.setItem('el.' + key, JSON.stringify(value));
  } catch { return null; }
  return value;
}

// ---------- offline mock (local preview only) ----------

async function mockDb() {
  const KEY = 'el.mockdb';
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { data = {}; }
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (isLocal && !Object.keys(data).length) {
    for (const name of ['essays', 'literature', 'news']) {
      try {
        const rows = await (await fetch(`../data/seed/${name}.json`)).json();
        data[name] = Object.fromEntries(rows.map(({ id, ...r }) => [id, r]));
      } catch { /* no seed available */ }
    }
  }
  const subs = new Map();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* full */ } };
  const snap = (col) => {
    const docs = Object.entries(data[col] || {}).map(([id, d]) => ({ id, exists: true, data: () => d, metadata: {} }));
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {} };
  };
  const notify = (col) => { for (const fn of subs.get(col) || []) fn(snap(col)); };
  const doc = (path) => {
    const [col, id] = path.split('/');
    return {
      id,
      get: async () => ({ id, exists: !!data[col]?.[id], data: () => data[col]?.[id], metadata: {} }),
      set: async (body) => { (data[col] ||= {})[id] = body; save(); notify(col); },
      update: async (body) => { if (!data[col]?.[id]) throw { code: 'invalid_argument' }; data[col][id] = { ...data[col][id], ...body }; save(); notify(col); },
      delete: async () => { if (data[col]) delete data[col][id]; save(); notify(col); },
    };
  };
  return {
    doc,
    collection: (col) => ({
      onSnapshot(next) {
        if (!subs.has(col)) subs.set(col, new Set());
        subs.get(col).add(next);
        setTimeout(() => next(snap(col)), 0);
        return () => subs.get(col).delete(next);
      },
      doc: (id) => doc(`${col}/${id}`),
    }),
  };
}
