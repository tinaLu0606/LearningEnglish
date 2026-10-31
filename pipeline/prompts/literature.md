# Literature excerpts (generate 30 days ahead)

Documents `literature/<YYYY-MM-DD>`, one per day. The app never shows a date after today, so it is safe to write ahead. Field shape: `data/schema.md`. The first 30 days are in `data/seed/literature.json`; look at them for tone and to avoid repeats.

Rules (agreed with the learner):
- **Public-domain texts only** (author died before 1956, or published before 1930 in the US). Quote exactly; only use passages you know word for word. If unsure of the wording, choose another passage.
- **Length**: prose 60–180 words; poems one to three stanzas.
- **Level**: default 3 (Melville-level). Every 3–4 days make one harder (level 4–5: Hopkins, Woolf, Joyce, George Eliot, Conrad, Henry James, late Shakespeare) or a different kind of text (poem after prose, drama, essay, letter).
- **Variety**: don't repeat an author within 7 days; mix British, American, Irish and other English-language writers; include women writers regularly.
- **Notes**: only 1–2 per day, rotating among `Word` (a hard or old word), `Technique` (a literary device, named in English with a Chinese gloss), `Metre` (for poems: metre, rhyme scheme, sound patterns, explained by tapping out the beat), and `Trivia` (a small true fact about the work or author; at most one, never more). Each note 40–70 words, in plain English, with Chinese glosses in brackets for technical terms.
- Explain *why* the device matters in that passage; no bare definitions.

Batch: write the 30 documents with one ArtifactData `batch` call (max 50 writes, 1 MiB). Also save them to `data/seed/literature-<start-date>.json` in git so the content is backed up.
