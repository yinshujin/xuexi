#!/usr/bin/env python3
"""Render the pages of a picture-book PDF to JPEG and extract their text.

Used by `pnpm content book import-pdf` (e.g. RAZ Plus printable books from the
family's own subscription). Needs PyMuPDF:  pip3 install pymupdf

  pdf_pages.py BOOK.pdf OUT_DIR [--dpi 150] [--split 1|2] [--first N] [--last M]

--split 2 cuts every sheet into a left and a right half (booklet / fold layouts).
Prints a JSON list: [{"image": "pages/01.jpg", "text": "..."}]
"""
import argparse
import json
import os
import sys

try:
    import pymupdf
except ImportError:  # older PyMuPDF
    try:
        import fitz as pymupdf  # type: ignore
    except ImportError:
        sys.exit("需要 PyMuPDF：pip3 install pymupdf")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("out")
    ap.add_argument("--dpi", type=int, default=150)
    ap.add_argument("--split", type=int, default=1, choices=[1, 2])
    ap.add_argument("--first", type=int, default=1)
    ap.add_argument("--last", type=int, default=0)
    a = ap.parse_args()

    doc = pymupdf.open(a.pdf)
    os.makedirs(os.path.join(a.out, "pages"), exist_ok=True)
    last = a.last or doc.page_count
    result = []
    n = 0
    for index in range(a.first - 1, min(last, doc.page_count)):
        page = doc[index]
        r = page.rect
        clips = [r] if a.split == 1 else [
            pymupdf.Rect(r.x0, r.y0, (r.x0 + r.x1) / 2, r.y1),
            pymupdf.Rect((r.x0 + r.x1) / 2, r.y0, r.x1, r.y1),
        ]
        for clip in clips:
            n += 1
            name = f"pages/{n:02d}.jpg"
            pix = page.get_pixmap(dpi=a.dpi, clip=clip)
            pix.save(os.path.join(a.out, name), jpg_quality=85)
            text = page.get_text("text", clip=clip).strip()
            result.append({"image": name, "text": text})
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
