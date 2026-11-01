"""Word error rate of a whisper.cpp transcript against human captions, over the first N seconds.

usage: python3 -I pipeline/eval_wer.py captions.vtt whisper.json [seconds]
Prints: WER, reference word count. Used to choose the whisper model (see pipeline/MODEL.md).
"""
import json
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from segments import from_vtt, from_whisper  # noqa: E402

NUM = {"0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
       "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten"}


def words(text):
    text = text.lower().replace("’", "'").replace("%", " percent")
    text = re.sub(r"\[[^\]]*\]|\([^)]*\)", " ", text)          # [music], (laughs)
    text = re.sub(r"^[a-z ]{2,20}:\s", " ", text)                # speaker labels
    toks = re.findall(r"[a-z0-9']+", text)
    return [NUM.get(t, t) for t in toks if t not in {"um", "uh", "er", "erm", "ah", "mm"}]


def wer(ref, hyp):
    d = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, h in enumerate(hyp, 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (r != h))
            prev, d[j] = d[j], cur
    return d[len(hyp)] / max(1, len(ref))


def main():
    vtt, hyp_json = sys.argv[1], sys.argv[2]
    limit = float(sys.argv[3]) if len(sys.argv) > 3 else 1e9
    ref = [t for s, e, t in from_vtt(open(vtt, encoding="utf-8").read()) if s < limit]
    hyp = [t for s, e, t in from_whisper(json.load(open(hyp_json, encoding="utf-8"))) if s < limit]
    r, h = words(" ".join(ref)), words(" ".join(hyp))
    print(f"{wer(r, h) * 100:.1f}% WER over {len(r)} reference words")


if __name__ == "__main__":
    main()
