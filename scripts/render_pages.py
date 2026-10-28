"""Render textbook pages for the viewer: output/viz/pages/AC/<pdf page>.webp

    python3 scripts/render_pages.py            all pages (existing files are kept)
    python3 scripts/render_pages.py 30 31      just these pdf pages (re-rendered)

Same geometry as the OCR (`pdftoppm -cropbox -r 144`, 2 px per PDF point), so block bboxes from
output/textbook/blocks.jsonl can be drawn on the images directly. Grey keeps heat colours readable and files small.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import io
import subprocess
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PDF = next(p for p in ROOT.glob('声学基础*.pdf') if 'PaddleOCR' not in p.name)
OUT = ROOT / 'output/viz/pages/AC'
DPI, QUALITY = 144, 62


def pages_in_pdf():
    info = subprocess.run(['pdfinfo', str(PDF)], capture_output=True, text=True, check=True).stdout
    return int(next(ln.split()[-1] for ln in info.splitlines() if ln.startswith('Pages:')))


def render(page, force=False):
    dst = OUT / f'{page:04d}.webp'
    if dst.exists() and not force:
        return
    png = subprocess.run(['pdftoppm', '-cropbox', '-r', str(DPI), '-f', str(page), '-l', str(page), '-png', '-gray', str(PDF)],
                         capture_output=True, check=True).stdout  # the scan's JBIG2 warnings go to stderr
    dst.parent.mkdir(parents=True, exist_ok=True)
    Image.open(io.BytesIO(png)).save(dst, 'WEBP', quality=QUALITY, method=4)


def main():
    pick = [int(a) for a in sys.argv[1:]]
    jobs = pick or range(1, pages_in_pdf() + 1)
    with ThreadPoolExecutor(12) as ex:
        list(ex.map(lambda p: render(p, force=bool(pick)), jobs))
    files = list(OUT.glob('*.webp'))
    print(f'{len(files)} pages, {sum(f.stat().st_size for f in files) / 1e6:.1f} MB in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
