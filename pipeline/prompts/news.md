# Daily news item

One item per day, document `news/<YYYY-MM-DD>`. Field shape: see `data/schema.md`.

1. **Find a real story** from the last few days with WebSearch (prefer CNA, The Straits Times, Mothership, BBC, Reuters; Singapore first, then Asia or global stories a Singapore professional would talk about at work). Open the article with WebFetch and use only facts it states. Never invent or "fill in" numbers, quotes or dates.
2. **Write it lively, at IELTS Band 8 reading level**:
   - `hook`: one question starting "Did you know…?", built on the most surprising true fact.
   - `title`: a plain headline.
   - `body`: 3–4 short paragraphs (220–320 words). Paragraph 1 sets the scene the way you'd tell a friend; then the facts; then why it matters. Use natural collocations and some formal vocabulary (it's study material), no clickbait.
   - Last paragraph: "Useful words from this story:" plus 3 words or phrases, each with a short English explanation and a Chinese gloss in brackets.
   - `source` = outlet + date; `url` = the article; `tags` = [region, topic].
3. Keep 14 days: after writing, delete `news` documents older than 14 days unless `saved: true`.

Backfill: if several days are missing (the cloud routine didn't run), add one item per missing date, each about news from around that date.
