"""Where does the book define a term?  Ranks blocks by definitional phrasing near the term.

    python3 scripts/defsearch.py 声阻抗率 品质因数 …     (term, or term=alias1/alias2 to search several spellings)
    python3 scripts/defsearch.py -n 3 -w 90 声强        top 3 blocks, ±90 characters of context

Scoring: the term in a heading; "称为/叫做/称作/定义为/简称/即为" right after it, or "X 是/为" right before a
definition; earlier and in-syllabus chapters win ties. Prints uid, printed page, node and a snippet.
"""
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BLOCKS = [json.loads(ln) for ln in (ROOT / 'output/textbook/blocks.jsonl').open(encoding='utf-8')]
OUT_OF_SCOPE = ('AC/9', 'AC/10')
DEF_AFTER = r'(称为|叫做|叫作|称作|简称|即为|定义为|定义成)'
DEF_BEFORE = r'(称为|叫做|叫作|称作|简称|定义为|所谓)'


def plain(t):
    return re.sub(r'\s+', '', re.sub(r'\$[^$]*\$', '◇', t))


def score(b, term):
    t = plain(b['text'])
    if term not in t:
        return 0, -1
    k = t.find(term)
    s = 1
    if b['label'] in ('paragraph_title', 'doc_title'):
        s += 6
    if re.search(DEF_BEFORE + r'.{0,6}' + re.escape(term), t):
        s += 5
    if re.search(re.escape(term) + r'.{0,4}' + DEF_AFTER, t):
        s += 4
    if re.search(re.escape(term) + r'[，,]?(是|为)', t):
        s += 2
    if b['zone'] != 'body' or (b['node'] or '').startswith(OUT_OF_SCOPE):
        s -= 3
    return s, k


def main():
    args = sys.argv[1:]
    n, w = 2, 70
    if '-n' in args:
        i = args.index('-n'); n = int(args[i + 1]); args = args[:i] + args[i + 2:]
    if '-w' in args:
        i = args.index('-w'); w = int(args[i + 1]); args = args[:i] + args[i + 2:]
    for arg in args:
        name, _, al = arg.partition('=')
        spells = [name] + [a for a in al.split('/') if a]
        hits = []
        for i, b in enumerate(BLOCKS):
            best = max((score(b, sp) + (sp,) for sp in spells), key=lambda x: x[0])
            if best[0] > 0:
                hits.append((best[0], -i, b, best[1], best[2]))
        hits.sort(key=lambda h: (h[0], h[1]), reverse=True)
        print(f'## {arg}  ({len(hits)} blocks)')
        for s, _, b, k, sp in hits[:n]:
            t = plain(b['text'])
            print(f"  [{s}] {b['uid']} p{b['page']} {b['node']}: …{t[max(0, k - w):k + len(sp) + w]}…")


if __name__ == '__main__':
    main()
