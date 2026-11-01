# Adding model essays

Documents `essays/<id>`, shape in `data/schema.md`. Ids: `c<book>-t<test>-task<n>` for Cambridge (e.g. `c18-t2-task2`), `o-<slug>` for official samples, `m-<slug>` for Claude-written models.

## From Cambridge IELTS e-books the learner provides
The learner's books 4–20 are in `~/study/书籍/真题4-20/`. Never download books from the internet, and never commit the book text to this repo (it is copyrighted): it goes only into the app's private database.

**Already imported** (2026-11-02, 16 essays): Cambridge 18 Tests 1–4 and Cambridge 20 Tests 1–4, both tasks. Cambridge 18 is special: 6 of its 8 answers are examiner-written models ("an example of a very good answer"), the best band-8 reference. Cambridge 17, 19 and 20 have only candidate scripts (band 5–7.5). Keep each import small; ask before adding another book.

**Tools** (macOS built-ins, nothing to install), in `pipeline/cambridge/`:
- `swift ocr.swift <pdf> <outdir> [first last]`: OCR each page to text with Vision, language correction **off** so candidates' real spelling mistakes survive. Books 18–20 are scans with no text layer; 17 has text. Find the pages with `grep -l "WRITING TASK"` and `"TEST 1, WRITING TASK 1"`.
- `swift render.swift <pdf> <page> <out.png> 1500`: render a page, then Read it to proofread the OCR and see the paragraph breaks (OCR loses them). OCR is about 99% accurate, but check every script against the image: a misread can look like a candidate's error.
- `swift crop.swift <pdf> <page> x0 y0 x1 y1 <out.png>`: crop a Task 1 figure, using box coordinates from the 1500px render. Convert to JPEG (`sips -s format jpeg -s formatOptions 82 -Z 1400`) before uploading.

Steps:
1. Locate the Writing tasks (in each test) and "Sample Writing answers" (near the back) for the requested tests.
2. For each task: `prompt` exactly as printed; `type` (see schema); for Task 1, extract the figure. If it's a chart, put the data in a `table` figure when the values are readable; otherwise crop the figure image, upload it as an asset (Artifact publish with `asset: true`) and use `{kind: "image", assetId, caption}`.
3. Sample answers: `kind` = `examiner` for "model answer" by an examiner, `candidate` for a band-scored candidate script; copy `band` and the examiner comment exactly (paragraphs joined with a blank line; the app splits on it; include any "Example overview" as a final paragraph). Keep the candidate's errors: they are the point.
4. `source` = "Cambridge IELTS <book> · Test <n>". Write with one ArtifactData `batch`.

## From official sources
IELTS.org, British Council, IDP sample scripts, and ielts-simon.com. Fetch the page, copy prompt + answer exactly, set `source` with the page title and URL. Personal study use only; always keep the source.

## Claude-written models
Only when asked. Band 8–9 style, natural rather than showy, 260–320 words (Task 2) or 170–200 (Task 1); `kind: "model"`, `band: null`, `source` says it was written by Claude.
