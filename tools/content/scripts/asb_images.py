#!/usr/bin/env python3
"""Convert downloaded picture-book pages (PNG, often with transparency) to JPEG.

Used by `pnpm content book import-asb` / `book import-samples` for African
Storybook books, whose pages are PNG files: JPEG keeps the app package small.
Needs Pillow:  pip3 install pillow

  asb_images.py JOBS.json [--max-width 1200] [--quality 80]

JOBS.json is a list of {"src": "in.png", "dest": "out.jpg"}; each src is
flattened onto white, scaled down to at most --max-width, saved as dest and
removed. Prints a JSON list of the bytes written.
"""
import argparse
import json
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("需要 Pillow：pip3 install pillow")


def convert(src: str, dest: str, max_width: int, quality: int) -> int:
    with Image.open(src) as im:
        im.load()
        if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
            rgba = im.convert("RGBA")
            flat = Image.new("RGB", rgba.size, (255, 255, 255))
            flat.paste(rgba, mask=rgba.getchannel("A"))
        else:
            flat = im.convert("RGB")
    if flat.width > max_width:
        flat = flat.resize((max_width, round(flat.height * max_width / flat.width)), Image.LANCZOS)
    flat.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
    return os.path.getsize(dest)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("jobs")
    ap.add_argument("--max-width", type=int, default=1200)
    ap.add_argument("--quality", type=int, default=80)
    a = ap.parse_args()
    with open(a.jobs, encoding="utf-8") as f:
        jobs = json.load(f)
    sizes = []
    for j in jobs:
        sizes.append(convert(j["src"], j["dest"], a.max_width, a.quality))
        os.remove(j["src"])
    print(json.dumps(sizes))


if __name__ == "__main__":
    main()
