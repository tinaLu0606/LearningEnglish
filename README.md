# English Lab

A personal English study app for IELTS (target: overall 8) and everyday professional English.

- **Frontend**: one claude.ai artifact (`app/`), opened in iPhone Safari via "Add to Home Screen" and on desktop.
- **Data**: the artifact's `db` (the single source of truth). Audio lives in the artifact's asset store.
- **Control**: Claude Code CLI with plain-language prompts. The `english-lab` skill (`skills/english-lab/SKILL.md`) tells Claude how to do each job.
- **Plan**: Notion page "plan scripts" (v3.1).

## What the app does

| Tab | What's inside |
|---|---|
| Today | Words due, today's news and literature excerpt, writing and listening shortcuts |
| Writing | Model Essays (Task 1 / Task 2), Write (full essays, optional 20/40-min timer, autosave), Feedback (graded on TR/TA, CC, LR, GRA by in-app Claude) |
| Listening | Episodes with timed transcripts. Blind mode by default, tap a timestamp to seek, loop one sentence |
| Words | Review (spaced repetition: 1 → 2 → 4 → 7 → 15 → 30 days, max 10 new words a day) and Library |
| Discover | One lively news item and one literature excerpt per day, plus Saved |

Every reading surface supports: tap a word for Chinese + pronunciation + "Add to Words" (keeps the source sentence and a link back), and highlight or underline a word, sentence or paragraph.

## Layout

```
learningEnglish/
├── README.md
├── app/                      the artifact (published as-is, no build step)
│   ├── index.html            shell + colour tokens
│   ├── css/base.css          layout and components
│   └── js/
│       ├── main.js           boot, router, navigation, mini player
│       ├── store.js          db wrapper (live collections) + device prefs + offline mock
│       ├── srs.js            spaced-repetition rules (pure functions)
│       ├── ai.js             in-app Claude: word lookup, essay grading
│       ├── theme.js          accent palette → light/dark tokens
│       ├── util.js           DOM helper, dates, icons
│       ├── components/       reader (lookup + marks), sheet, player
│       └── views/            today, writing, listening, words, discover, prefs
├── data/
│   ├── schema.md             every collection and field
│   └── seed/                 JSON written into the db on first setup
├── pipeline/
│   ├── transcribe.sh         audio → timed transcript JSON (yt-dlp, ffmpeg, whisper.cpp; runs locally)
│   ├── upload.md             how Claude uploads audio + transcript
│   └── prompts/              prompts for content generation
├── skills/english-lab/SKILL.md   Claude Code skill (symlinked into ~/.claude/skills)
├── scripts/
│   ├── backup.md             weekly JSON backup of the db into backups/
│   └── cleanup.md            retention rules (news 14 days, audio last 10 episodes)
└── backups/                  JSON backups (no audio)
```

## Everyday use (talk to Claude Code)

Open Claude Code in this folder and say things like:

- "Add today's news" / "Fill news for the past week"
- "Generate the next 30 days of literature"
- "Find a new listening episode about Singapore" / "Transcribe this: <YouTube link>"
- "Quiz me on the words I added this week"
- "Import Cambridge IELTS 18 Test 2 essays from ~/Downloads/cambridge18.pdf"
- "Grade my latest essay" (if in-app grading wasn't available)
- "Check my inbox" (requests sent from the app's Preferences page)
- "Back up the app data" / "Clean up old content"

## Publishing

The artifact is published from `app/`: `index.html` is the page, `css/` and `js/` go up as supporting files, and it declares the capabilities `db`, `sample` and `assets`. The artifact URL is recorded in `skills/english-lab/SKILL.md`.

## Local preview

```
cd app && python3 -m http.server 8765
# open http://localhost:8765 – offline mode with the seed data, stored in this browser only
```
