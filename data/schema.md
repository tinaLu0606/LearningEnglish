# Data schema

All app data lives in the artifact's `db` (JSON documents, path `collection/docId`).
Device-only preferences (text size, accent, theme, drafts, playback position) live in the browser's `localStorage` under `el.*` keys and are never synced.

Limits to respect: 256 KiB per document, 5,000 documents per artifact, doc ids use only `A-Z a-z 0-9 _ - . ~ : @ +`.
Dates are local Singapore dates `YYYY-MM-DD`; timestamps are ISO strings.

## words/{wordId}
`wordId` = lower-cased lemma with anything outside `a-z0-9-` replaced by `_` (so the same word never appears twice).

| field | type | notes |
|---|---|---|
| term | string | lemma as shown |
| zh | string | concise Chinese meaning |
| ipa | string | British IPA, e.g. `/əˈliːvieɪt/` |
| pos | string | part of speech |
| gloss | string | short English definition (optional) |
| example | string | the sentence it was found in |
| source | {kind, id, title} \| null | kind ∈ essay, news, lit, ep, sub, manual |
| stage | number | 0 = new … 6 = reached the 30-day interval (mastered); 7 = maintenance |
| due | date | next review date |
| added | ISO | |
| firstSeen | date \| null | first day it was reviewed (drives the 10-new-words-a-day cap) |
| lastReviewed | date \| null | |
| lapses | number | times rated "Don't know" |

SRS rules (`app/js/srs.js`): intervals 1, 2, 4, 7, 15, 30 days. *Know it* moves one stage up; *Unsure* keeps the stage and repeats its interval; *Don't know* resets to stage 0, due tomorrow, and the card comes back once more in the same session. After stage 6, reviews are every 90 days.

## essays/{essayId}
| field | type | notes |
|---|---|---|
| task | 1 \| 2 | |
| type | string | Task 2: Opinion, Discussion, Advantages/Disadvantages, Problem/Solution, Two-part. Task 1: Bar chart, Line graph, Table, Pie chart, Process, Map, Mixed |
| prompt | string | the question as printed |
| figure | object \| null | Task 1 data: `{kind:"table", caption, columns:[...], rows:[[...]]}` or `{kind:"image", assetId, caption}` or `{kind:"steps", caption, items:[...]}` |
| body | string[] | paragraphs |
| band | number \| null | only for official band-scored scripts |
| kind | "examiner" \| "candidate" \| "model" | examiner model answer / real candidate script / Claude-written model |
| examiner | string | examiner comment, if published |
| source | string | e.g. "Cambridge IELTS 18 · Test 2" |
| saved | bool | |
| added | ISO | |

## submissions/{subId}
| field | type | notes |
|---|---|---|
| task | 1 \| 2 | |
| prompt | string | |
| essayId | string \| null | prompt taken from a model essay |
| body | string | the user's essay |
| words | number | |
| timer | 0 \| 20 \| 40 | minutes |
| elapsed | number | seconds spent writing |
| status | "draft" \| "submitted" \| "grading" \| "graded" | |
| feedback | object | `{overall, criteria:{TR,CC,LR,GRA:{band,comment}}, summary, strengths[], fixes[{quote,better,why}], nextStep, model}` |
| created, updated, gradedAt | ISO | |

## highlights/{srcKind}-{srcId}
One document per source text.
`{srcKind, srcId, title, items:[{id, para, start, end, kind:"highlight"|"underline", text, created}], updated}`
`para` is the paragraph (or transcript segment) index; `start`/`end` are character offsets inside it.

## episodes/{epId}
`{title, show, url, accent, duration (s), assetId, audioUrl, segments:[{s, e, t}], added, published}`
`s`/`e` are seconds. Only the latest 10 episodes keep audio; older ones keep the transcript and drop `assetId`.

## news/{date}
`{date, title, hook, body:[paragraphs], source, url, tags[], saved}` — kept 14 days unless `saved`.

## literature/{date}
`{date, author, work, year, level (1–5), form:"prose"|"verse", text:[paragraphs or stanzas], notes:[{kind, title, body}], saved}`
`kind` ∈ Word, Technique, Metre, Trivia. Each day shows 1–2 notes. Pre-generated 30 days ahead; the app never shows a date after today.

## dict/{wordId}
Lookup cache: `{term, ipa, pos, zh, gloss}`.

## daily/{date}
`{reviewed, learned}` counters for the day.

## inbox/{id}
Requests typed into the app for Claude Code: `{text, created, status:"open"|"done", reply}`.
