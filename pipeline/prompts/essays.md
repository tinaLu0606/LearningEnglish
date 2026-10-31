# Adding model essays

Documents `essays/<id>`, shape in `data/schema.md`. Ids: `c<book>-t<test>-task<n>` for Cambridge (e.g. `c18-t2-task2`), `o-<slug>` for official samples, `m-<slug>` for Claude-written models.

## From Cambridge IELTS e-books the learner provides
1. The learner gives a file path (PDF). Use the pdf skill to extract the Writing tasks and the "Model and sample answers" section for the requested tests. Do not download books from the internet.
2. For each task: `prompt` exactly as printed; `type` (see schema); for Task 1, extract the figure. If it's a chart, put the data in a `table` figure when the values are readable; otherwise crop the figure image, upload it as an asset (Artifact publish with `asset: true`) and use `{kind: "image", assetId, caption}`.
3. Sample answers: `kind` = `examiner` for "model answer" by an examiner, `candidate` for a band-scored candidate script; copy `band` and the examiner comment exactly. Keep the candidate's errors: they are the point.
4. `source` = "Cambridge IELTS <book> · Test <n>". Write with one ArtifactData `batch`.

## From official sources
IELTS.org, British Council, IDP sample scripts, and ielts-simon.com. Fetch the page, copy prompt + answer exactly, set `source` with the page title and URL. Personal study use only; always keep the source.

## Claude-written models
Only when asked. Band 8–9 style, natural rather than showy, 260–320 words (Task 2) or 170–200 (Task 1); `kind: "model"`, `band: null`, `source` says it was written by Claude.
