"""Convert whisper.cpp JSON (-oj) or a WebVTT caption file into English Lab episode JSON.

Short fragments are merged into sentence-sized segments (ending at . ? ! or after ~15 s),
so "loop this sentence" and tap-to-seek work on whole sentences.
"""
import argparse
import json
import re
import sys


def ts(value):
    """'00:01:02.345' or '01:02.345' or '00:01:02,345' -> seconds"""
    parts = value.replace(",", ".").split(":")
    secs = 0.0
    for p in parts:
        secs = secs * 60 + float(p)
    return secs


def from_whisper(data):
    out = []
    for item in data.get("transcription", []):
        off = item.get("offsets") or {}
        if "from" in off:
            s, e = off["from"] / 1000, off["to"] / 1000
        else:
            t = item.get("timestamps") or {}
            s, e = ts(t["from"]), ts(t["to"])
        text = item.get("text", "").strip()
        if text:
            out.append((s, e, text))
    return out


def from_vtt(text):
    out = []
    blocks = re.split(r"\n\s*\n", text.replace("\r", ""))
    for b in blocks:
        lines = [l for l in b.split("\n") if l.strip()]
        for i, line in enumerate(lines):
            m = re.match(r"([\d:.,]+)\s+-->\s+([\d:.,]+)", line)
            if m:
                body = " ".join(lines[i + 1:])
                body = re.sub(r"<[^>]+>", "", body).strip()
                if body:
                    out.append((ts(m.group(1)), ts(m.group(2)), body))
                break
    # captions often repeat the previous line; drop exact consecutive duplicates
    dedup = []
    for seg in out:
        if not dedup or dedup[-1][2] != seg[2]:
            dedup.append(seg)
    return dedup


def merge(raw, max_len=15.0):
    segs, cur = [], None
    for s, e, t in raw:
        if cur is None:
            cur = [s, e, t]
        else:
            cur[1] = e
            cur[2] = (cur[2] + " " + t).strip()
        if re.search(r"[.?!][\"'”’)]?$", cur[2]) or cur[1] - cur[0] >= max_len:
            segs.append(cur)
            cur = None
    if cur:
        segs.append(cur)
    return [{"s": round(s, 2), "e": round(e, 2), "t": re.sub(r"\s+", " ", t)} for s, e, t in segs]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("raw")
    ap.add_argument("--title", default="")
    ap.add_argument("--show", default="")
    ap.add_argument("--url", default="")
    ap.add_argument("--accent", default="")
    ap.add_argument("--duration", type=float, default=0)
    a = ap.parse_args()
    with open(a.raw, encoding="utf-8") as f:
        content = f.read()
    raw = from_vtt(content) if a.raw.endswith(".vtt") else from_whisper(json.loads(content))
    segs = merge(raw)
    json.dump({
        "title": a.title, "show": a.show, "url": a.url, "accent": a.accent,
        "duration": round(a.duration or (segs[-1]["e"] if segs else 0)),
        "segments": segs,
    }, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
