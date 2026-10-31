// In-app Claude (artifact `sample` capability): word lookup and essay grading.
// Every call spends the viewer's own Claude usage, so calls only happen on a tap.
import * as store from './store.js';
import { wordId } from './util.js';

let samplePromise = null;
function getSample() {
  if (!samplePromise) {
    samplePromise = window.claude && typeof window.claude.use === 'function'
      ? window.claude.use('sample').catch(() => null)
      : Promise.resolve(null);
  }
  return samplePromise;
}

export async function available() { return !!(await getSample()); }

export function errorText(e) {
  switch (e && e.code) {
    case 'unavailable': case 'not_granted': case 'sampling_disabled': case 'not_declared':
    case 'capability_disabled': case 'capability_removed':
      return 'Claude isn’t available here. Open the app in claude.ai and allow it to use Claude.';
    case 'rate_limited': return 'Too many requests right now. Try again in a minute.';
    case 'session_expired': return 'Your claude.ai session expired. Sign in again.';
    case 'cancelled': return 'Stopped.';
    case 'invalid_json': return 'Claude’s reply couldn’t be read. Try again.';
    default: return 'Something went wrong talking to Claude. Try again.';
  }
}

// ---------- word lookup ----------

export async function lookup(term, sentence) {
  const id = wordId(term);
  const cached = await store.fetchDoc('dict', id);
  if (cached && cached.zh) return cached;
  const sample = await getSample();
  if (!sample) throw { code: 'unavailable' };
  const prompt = [
    `Dictionary entry for the English word "${term}" as used in this sentence:`,
    `"${(sentence || '').slice(0, 400)}"`,
    '',
    'Reply with only a JSON object:',
    '{"lemma": base form (keep it as written if it is a proper noun or fixed phrase), "ipa": British IPA between slashes, "pos": part of speech (noun/verb/adjective/adverb/…), "zh": concise Simplified Chinese meaning that fits this sentence (max 12 characters, use ； between senses), "gloss": short English definition (max 12 words)}',
    'Example: {"lemma":"alleviate","ipa":"/əˈliːvieɪt/","pos":"verb","zh":"减轻；缓解","gloss":"make a problem or pain less severe"}',
  ].join('\n');
  const r = await sample.json(prompt, { modelTier: 'quick', cache: { gcTime: 86400000 } });
  const entry = {
    term: String(r.lemma || term).trim(),
    ipa: String(r.ipa || ''),
    pos: String(r.pos || ''),
    zh: String(r.zh || ''),
    gloss: String(r.gloss || ''),
  };
  store.set('dict', id, entry).catch(() => {});
  if (wordId(entry.term) !== id) store.set('dict', wordId(entry.term), entry).catch(() => {});
  return entry;
}

// ---------- pronunciation (on-device speech, no network) ----------

export function speak(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const v = voices.find((x) => x.lang === 'en-GB') || voices.find((x) => x.lang && x.lang.startsWith('en'));
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'en-GB';
    u.rate = 0.92;
    synth.speak(u);
    return true;
  } catch { return false; }
}

// ---------- essay grading ----------

const CRITERIA_NAMES = {
  1: { TR: 'Task Achievement', CC: 'Coherence and Cohesion', LR: 'Lexical Resource', GRA: 'Grammatical Range and Accuracy' },
  2: { TR: 'Task Response', CC: 'Coherence and Cohesion', LR: 'Lexical Resource', GRA: 'Grammatical Range and Accuracy' },
};
export const criteriaNames = (task) => CRITERIA_NAMES[task === 1 ? 1 : 2];

export async function grade(sub, { signal, onText } = {}) {
  const sample = await getSample();
  if (!sample) throw { code: 'unavailable' };
  const task = sub.task === 1 ? 1 : 2;
  const names = criteriaNames(task);
  const minWords = task === 1 ? 150 : 250;
  const prompt = [
    `You are a senior IELTS Academic Writing examiner. Grade this Task ${task} response strictly against the public IELTS band descriptors. The candidate is aiming for Band 8, so be precise about what separates their writing from Band 8 and 9.`,
    '',
    `TASK ${task} PROMPT:`,
    sub.prompt || '(no prompt given)',
    '',
    `CANDIDATE RESPONSE (${sub.words} words; minimum is ${minWords}${sub.elapsed ? `; written in ${Math.round(sub.elapsed / 60)} minutes` : ''}):`,
    sub.body,
    '',
    'Rules:',
    `- Score each criterion in whole or half bands: TR = ${names.TR}, CC = ${names.CC}, LR = ${names.LR}, GRA = ${names.GRA}.`,
    '- overall = mean of the four, rounded to the nearest half band the way IELTS does (x.25 rounds up to x.5, x.75 rounds up to the next whole band).',
    `- Apply the under-length penalty if the response has fewer than ${minWords} words.`,
    '- Each criterion comment: 2–3 sentences naming the descriptor feature that decided the band, quoting the response where useful.',
    '- fixes: 3–6 of the most valuable corrections. quote = exact words from the response; better = a corrected or more natural version; why = one short reason.',
    '- Write in plain English. After any advanced grammar or vocabulary term, add a short Simplified Chinese gloss in brackets, e.g. "cohesive devices (衔接手段)".',
    '',
    'Reply with only this JSON:',
    '{"overall": 7.0, "criteria": {"TR": {"band": 7, "comment": ""}, "CC": {"band": 7, "comment": ""}, "LR": {"band": 7, "comment": ""}, "GRA": {"band": 7, "comment": ""}}, "summary": "two sentences", "strengths": ["", ""], "fixes": [{"quote": "", "better": "", "why": ""}], "nextStep": "the single most useful thing to practise next"}',
  ].join('\n');
  const r = await sample.json(prompt, { modelTier: 'complex', cache: false, signal, onText });
  const band = (x) => { const n = Number(x); return Number.isFinite(n) ? Math.round(n * 2) / 2 : null; };
  const crit = {};
  for (const k of ['TR', 'CC', 'LR', 'GRA']) {
    const c = (r.criteria && r.criteria[k]) || {};
    crit[k] = { band: band(c.band), comment: String(c.comment || '') };
  }
  return {
    overall: band(r.overall),
    criteria: crit,
    summary: String(r.summary || ''),
    strengths: Array.isArray(r.strengths) ? r.strengths.map(String) : [],
    fixes: Array.isArray(r.fixes) ? r.fixes.map((f) => ({ quote: String(f.quote || ''), better: String(f.better || ''), why: String(f.why || '') })) : [],
    nextStep: String(r.nextStep || ''),
    model: 'in-app Claude',
  };
}
