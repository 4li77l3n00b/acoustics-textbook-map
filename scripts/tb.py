"""Look things up in the indexed textbook (output/textbook, built by build_textbook_index.py).

    python3 scripts/tb.py toc [CHAPTER]          section tree with printed / pdf pages
    python3 scripts/tb.py read NODE              text of a node and everything under it, e.g. 4.3 or 2.2.2 or 习题7
    python3 scripts/tb.py page PDF_PAGE          blocks of one pdf page, in reading order
    python3 scripts/tb.py ex 7-3 | ex 7          one exercise, or a chapter's exercises (first line each)
    python3 scripts/tb.py examples [NODE]        worked examples (例 n), optionally under a node
    python3 scripts/tb.py search WORD [WORD…]    blocks containing all the words (case-insensitive)
    python3 scripts/tb.py crop UID [UID…] [-o FILE]   cut the blocks out of the page images (for checking OCR)

NODE may be given without the book prefix: "4.3", "AC/4/4.3" and "2.2.2" all work.
"""
from pathlib import Path
import io
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
TB = ROOT / 'output/textbook'
TOC = json.loads((TB / 'toc.json').read_text(encoding='utf-8'))
BLOCKS = [json.loads(ln) for ln in (TB / 'blocks.jsonl').open(encoding='utf-8')]
NODES = TOC['nodes']


def node_id(arg):
    if arg in {n['id'] for n in NODES}:
        return arg
    for n in NODES:
        if n['num'] == arg or n['num'] == arg.replace('习题', '习题'):
            return n['id']
    if m := re.fullmatch(r'\d+', arg):
        return f"{TOC['book']}/{m[0]}"
    sys.exit(f'no node {arg!r}')


def under(nid, b):
    return b['node'] and (b['node'] == nid or b['node'].startswith(nid + '/'))


def show(b, width=None):
    t = b['text'].strip()
    if not t:
        return
    tag = b['label'] if b['label'] != 'text' else ''
    mark = (f" [{b['example'].split('#')[1]}]" if b.get('example') else '') + (f" [{b['exercise']}]" if b.get('exercise') else '')
    src = ' (补录)' if b.get('text_source') == 'manual' else ''
    print(f"--- {b['uid']} p{b['page']}{(' ' + tag) if tag else ''}{mark}{src}")
    print(t if not width else t[:width].replace('\n', ' '))


def cmd_toc(ch=None):
    for n in NODES:
        if ch and not n['id'].startswith(f"{TOC['book']}/{ch}"):
            continue
        ind = {'chapter': '', 'section': '  ', 'subsection': '    ', 'exercises': '  ', 'appendix': ''}[n['kind']]
        flag = '' if n['anchor_method'] == 'title_match' else f"  ({n['anchor_method']})"
        print(f"{ind}{n['num']} {n['title'] if n['kind'] != 'exercises' else ''}  p{n['page']} / pdf {n['pdf_page']}{flag}")


def cmd_read(arg):
    nid = node_id(arg)
    for b in BLOCKS:
        if under(nid, b):
            show(b)


def cmd_page(p):
    for b in BLOCKS:
        if b['pdf_page'] == int(p):
            show(b)


def cmd_ex(arg):
    xs = json.loads((TB / 'exercises.json').read_text(encoding='utf-8'))
    if '-' in arg:
        x = next((x for x in xs if x['id'] == arg), None) or sys.exit(f'no exercise {arg}')
        print(f"{x['id']}  (pdf {', '.join(map(str, x['pdf_pages']))})\n{x['text']}")
    else:
        for x in xs:
            if x['chapter'] == int(arg):
                print(x['text'].split('\n')[0][:110])


def cmd_examples(arg=None):
    nid = node_id(arg) if arg else None
    for e in json.loads((TB / 'examples.json').read_text(encoding='utf-8')):
        if not nid or e['node'] == nid or e['node'].startswith(nid + '/'):
            print(f"{e['id']}  pdf {e['pdf_pages']}  {e['title'][:70]}")


def cmd_search(*words):
    ws = [w.lower() for w in words]
    hits = [b for b in BLOCKS if all(w in b['text'].lower() for w in ws)]
    for b in hits[:60]:
        print(f"{b['uid']} p{b['page']} {b['node']}: ", end='')
        t = b['text'].replace('\n', ' ')
        k = t.lower().find(ws[0])
        print(t[max(0, k - 40):k + 80])
    print(f'{len(hits)} blocks')


def cmd_crop(*args):
    from PIL import Image
    out = None
    if '-o' in args:
        k = args.index('-o')
        out, args = args[k + 1], args[:k] + args[k + 2:]
    byuid = {b['uid']: b for b in BLOCKS}
    pdf = ROOT / TOC['pdf']
    parts = []
    for uid in args:
        b = byuid[uid]
        png = subprocess.run(['pdftoppm', '-cropbox', '-r', '144', '-f', str(b['pdf_page']), '-l', str(b['pdf_page']), '-png', '-gray', str(pdf)],
                             capture_output=True, check=True).stdout
        x0, y0, x1, y1 = b['bbox']
        for e in b.get('extra_bbox', []):
            x0, y0, x1, y1 = min(x0, e[0]), min(y0, e[1]), max(x1, e[2]), max(y1, e[3])
        parts.append(Image.open(io.BytesIO(png)).crop((max(0, x0 - 8), max(0, y0 - 8), x1 + 8, y1 + 8)))
    img = Image.new('L', (max(p.width for p in parts), sum(p.height + 10 for p in parts)), 255)
    y = 0
    for p in parts:
        img.paste(p, (0, y))
        y += p.height + 10
    out = out or str(ROOT / 'tmp' / f'crop_{args[0]}.png')
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    print(out)


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in {'toc', 'read', 'page', 'ex', 'examples', 'search', 'crop'}:
        sys.exit(__doc__)
    globals()['cmd_' + sys.argv[1]](*sys.argv[2:])
