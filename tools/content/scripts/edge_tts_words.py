#!/usr/bin/env python3
"""Synthesize sentences with Microsoft Edge voices and record word timings.

Used by `pnpm content book tts --engine edge`. Needs:  pip3 install edge-tts
Reads a JSON job list on stdin: [{"text": "...", "audio": "x.mp3", "words": "x.json"}]
and writes each MP3 plus a JSON list of words: [{"text", "start", "end"}] (ms).
"""
import argparse
import asyncio
import json
import sys

import edge_tts


async def one(job, voice, rate, sem):
    async with sem:
        for attempt in range(3):
            try:
                words = []
                com = edge_tts.Communicate(job["text"], voice, rate=rate, boundary="WordBoundary")
                with open(job["audio"], "wb") as f:
                    async for chunk in com.stream():
                        if chunk["type"] == "audio":
                            f.write(chunk["data"])
                        elif chunk["type"] == "WordBoundary":
                            start = chunk["offset"] / 10000
                            words.append({"text": chunk["text"], "start": round(start), "end": round(start + chunk["duration"] / 10000)})
                with open(job["words"], "w", encoding="utf-8") as f:
                    json.dump(words, f, ensure_ascii=False)
                return
            except Exception as e:  # network hiccups
                if attempt == 2:
                    raise
                await asyncio.sleep(2 * (attempt + 1))


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="en-US-AnaNeural")
    ap.add_argument("--rate", default="-10%")
    ap.add_argument("--concurrency", type=int, default=4)
    a = ap.parse_args()
    jobs = json.load(sys.stdin)
    sem = asyncio.Semaphore(a.concurrency)
    await asyncio.gather(*(one(j, a.voice, a.rate, sem) for j in jobs))


if __name__ == "__main__":
    asyncio.run(main())
