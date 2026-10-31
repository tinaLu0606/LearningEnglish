#!/usr/bin/env bash
# Turn a YouTube/podcast link or a local audio file into:
#   pipeline/work/<id>/audio.mp4     AAC audio in an MP4 container (the artifact asset store accepts video/mp4), < 19 MB
#   pipeline/work/<id>/episode.json  {title, show, url, duration, accent, segments:[{s,e,t}]}
# Everything runs on this Mac; no tokens are spent. Official captions are used when they exist,
# otherwise whisper.cpp transcribes locally.
#
# Usage: pipeline/transcribe.sh <url-or-file> [--id ID] [--show "Show name"] [--accent "Singaporean"] [--model small.en]
# Needs: yt-dlp, ffmpeg, whisper-cpp (brew install yt-dlp ffmpeg whisper-cpp) and a model in pipeline/models/.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:?usage: transcribe.sh <url-or-file> [--id ID] [--show NAME] [--accent ACCENT] [--model small.en]}"
shift
ID="" SHOW="" ACCENT="" MODEL="small.en"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --id) ID="$2"; shift 2 ;;
    --show) SHOW="$2"; shift 2 ;;
    --accent) ACCENT="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done

for tool in ffmpeg ffprobe python3; do
  command -v "$tool" >/dev/null || { echo "missing $tool (brew install ffmpeg)" >&2; exit 1; }
done

[[ -n "$ID" ]] || ID="ep$(date +%Y%m%d%H%M%S)"
WORK="$HERE/work/$ID"
mkdir -p "$WORK"
TITLE="" URL=""

if [[ -f "$SRC" ]]; then
  cp "$SRC" "$WORK/source"
  TITLE="$(basename "${SRC%.*}")"
else
  command -v yt-dlp >/dev/null || { echo "missing yt-dlp (brew install yt-dlp)" >&2; exit 1; }
  URL="$SRC"
  TITLE="$(yt-dlp --no-playlist --print title "$URL")"
  [[ -n "$SHOW" ]] || SHOW="$(yt-dlp --no-playlist --print channel "$URL" 2>/dev/null || true)"
  yt-dlp --no-playlist -f "bestaudio" -o "$WORK/source.%(ext)s" "$URL"
  mv "$WORK"/source.* "$WORK/source" 2>/dev/null || true
  # Official (human-made) English captions, if any. Auto-generated ones are skipped: whisper is better.
  yt-dlp --no-playlist --skip-download --write-subs --sub-langs "en.*,en" --sub-format vtt -o "$WORK/captions.%(ext)s" "$URL" || true
fi

DURATION="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/source")"
# Keep the file under ~19 MB: bitrate (kbit/s) = 19 MB * 8 / duration, capped at 64k, floor 24k. Mono speech.
KBPS="$(python3 -c "d=float('$DURATION'); print(max(24, min(64, int(19*8*1024/d))))")"
ffmpeg -y -loglevel error -i "$WORK/source" -vn -ac 1 -c:a aac -b:a "${KBPS}k" -movflags +faststart "$WORK/audio.mp4"

CAP="$(ls "$WORK"/captions*.vtt 2>/dev/null | head -1 || true)"
if [[ -n "$CAP" ]]; then
  echo "Using official captions: $(basename "$CAP")"
  RAW="$CAP"
else
  command -v whisper-cli >/dev/null || { echo "missing whisper-cli (brew install whisper-cpp)" >&2; exit 1; }
  MODEL_FILE="$HERE/models/ggml-$MODEL.bin"
  [[ -f "$MODEL_FILE" ]] || { echo "missing model $MODEL_FILE — download from https://huggingface.co/ggerganov/whisper.cpp" >&2; exit 1; }
  ffmpeg -y -loglevel error -i "$WORK/source" -ar 16000 -ac 1 -c:a pcm_s16le "$WORK/speech.wav"
  whisper-cli -m "$MODEL_FILE" -f "$WORK/speech.wav" -l en -oj -of "$WORK/whisper" >/dev/null
  RAW="$WORK/whisper.json"
  rm -f "$WORK/speech.wav"
fi

python3 -I "$HERE/segments.py" "$RAW" \
  --title "$TITLE" --show "$SHOW" --url "$URL" --accent "$ACCENT" --duration "$DURATION" \
  > "$WORK/episode.json"
rm -f "$WORK/source"

SIZE="$(du -h "$WORK/audio.mp4" | cut -f1)"
echo "Done: $WORK/audio.mp4 ($SIZE) and $WORK/episode.json"
echo "Next: follow pipeline/upload.md to upload the audio and write episodes/$ID."
