# Which transcription model, and why

Tested 2026-11-01 on an Apple M5 (24 GB) with whisper.cpp. Each clip is the first 4 minutes of a video that also has human-made captions; word error rate (WER) is computed by `eval_wer.py` against those captions after lower-casing and stripping punctuation.

| Clip (accent) | small.en | medium.en-q5_0 | large-v3-turbo-q5_0 |
|---|---|---|---|
| CNA Talking Point, haze (Singaporean) | 9.2% | 13.3% | 12.9% |
| TED, Ashweetha Shetty (Indian) | 3.3% | 3.7% | 3.5% |
| BBC 6 Minute English (British) | 8.3% | 4.8% | 5.1% |

## What the numbers mean

- Most of the remaining "errors" are not mis-hearings. Captions write `PM2.5`, numerals and tidied-up speech; Whisper writes what was said ("PM two point five", "um, so"). Both are right, but WER counts them as differences.
- Genuine mis-hearings were rare and mostly local names (Lau Pa Sat) or near-homophones (grills → grails, smog → smoke).
- No model is clearly more accurate across accents. The larger models help on clear studio speech (BBC) and do not help on the Singaporean clip.

## Decision

1. **Use official captions whenever the video has them** (`transcribe.sh` checks first). They are human-checked, so they beat every model.
2. Otherwise use **large-v3-turbo-q5_0** (default in `transcribe.sh`): about 9 s per 4 minutes of audio, tied for best overall, and best on standard British/American speech, which is what IELTS Listening uses.
3. After transcribing, proofread proper nouns (place names, people, brands) against the video title and description. That catches the few real mistakes.

Override with `MODEL=small.en bash pipeline/transcribe.sh …` if needed. Models live in `~/.cache/whisper-cpp/` (or `$WHISPER_MODELS`).
