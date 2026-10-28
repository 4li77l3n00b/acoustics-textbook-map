"""Glossary: output/glossary/src/*.md (written by Claude from the textbook; format in src/README.md)
-> output/glossary/glossary.json + 名词库报告.md

    python3 scripts/build_glossary.py

Checks: cited blocks exist and contain the term (or an alias) unless the entry has a note explaining why;
"see" targets exist; every term asked in the exams (output/exams/exams.json) maps to at least one entry;
all formulas parse in KaTeX. Each entry gets the papers that asked it and the ★ rating of its section.
"""
from collections import defaultdict
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build_exams import katex_check  # noqa: E402

SRC = ROOT / 'output/glossary/src'
OUT = ROOT / 'output/glossary'
BLOCKS = {}
for ln in (ROOT / 'output/textbook/blocks.jsonl').open(encoding='utf-8'):
    b = json.loads(ln)
    BLOCKS[b['uid']] = b
EXAMS = json.loads((ROOT / 'output/exams/exams.json').read_text(encoding='utf-8'))
SYL = json.loads((ROOT / 'output/syllabus/syllabus.json').read_text(encoding='utf-8'))
SPELLINGS = {'赫姆霍兹': '亥姆霍兹', '拉密': '拉梅', '品质因素': '品质因数'}  # the book's spelling -> usual spelling


def plain(t):
    t = re.sub(r'\$[^$]*\$', '', t)
    for a, b in SPELLINGS.items():
        t = t.replace(a, b)
    return re.sub(r'[\s·\-–—]', '', t)


def parse():
    entries = []
    for f in sorted(SRC.glob('*.md')):
        if f.name == 'README.md':
            continue
        e = None
        for raw in f.read_text(encoding='utf-8').splitlines():
            ln = raw.rstrip()
            if ln.startswith('## '):
                e = {'name': ln[3:].strip(), 'aliases': [], 'book': [], 'cite': [], 'def': '', 'formula': '', 'unit': '',
                     'points': [], 'see': [], 'note': '', 'file': f.name}
                entries.append(e)
            elif e is None or not ln.strip() or ln.startswith('# '):
                continue
            elif m := re.match(r'^(alias|book|cite|def|formula|unit|see|note):\s*(.*)$', ln):
                k, v = m[1], m[2].strip()
                if k in ('alias', 'book'):
                    e['aliases' if k == 'alias' else 'book'] = [a.strip() for a in v.split('|') if a.strip()]
                elif k in ('cite', 'see'):
                    e[k] = v.split()
                else:
                    e[k] = v
            elif ln.startswith('- '):
                e['points'].append(ln[2:].strip())
            else:
                raise SystemExit(f'{f.name}: line not understood under {e["name"]}: {ln}')
    return entries


def main():
    entries = parse()
    errors, warnings = [], []
    names = {e['name'] for e in entries}
    if len(names) != len(entries):
        errors.append('duplicate entry names')
    snippets = []
    for e in entries:
        if not e['def']:
            errors.append(f"{e['name']}: no def")
        for u in e['cite']:
            if u not in BLOCKS:
                errors.append(f"{e['name']}: unknown block {u}")
            elif BLOCKS[u].get('merged_into'):
                errors.append(f"{e['name']}: {u} is empty (its text is in {BLOCKS[u]['merged_into']}); cite that block")
        if not e['cite']:
            errors.append(f"{e['name']}: no cite")
        text = plain(' '.join(BLOCKS[u]['text'] for u in e['cite'] if u in BLOCKS))
        if not any(plain(s) in text for s in [e['name'], *e['aliases'], *e['book']]) and not e['note']:
            warnings.append(f"{e['name']}: term not found in the cited block(s) {' '.join(e['cite'])}")
        for s in e['see']:
            if s not in names:
                errors.append(f"{e['name']}: see {s} — no such entry")
        if e['formula']:
            snippets.append([e['name'], e['formula']])
        for field in [e['def'], e['note'], *e['points']]:
            if field.count('$') % 2:
                errors.append(f"{e['name']}: unbalanced $ in: {field[:50]}")
            snippets += [[e['name'], m] for m in re.findall(r'\$([^$]+)\$', field)]
    errors += katex_check(snippets)

    # exam terms -> entries
    by_alias = defaultdict(list)
    for e in entries:
        for a in {e['name'], *e['aliases']}:
            by_alias[a].append(e['name'])
    asked = defaultdict(set)
    unmapped = []
    for t in EXAMS['terms']:
        hits = by_alias.get(t['term'], [])
        if not hits:
            unmapped.append(t['term'])
        for h in hits:
            asked[h].update(t['papers'])
    errors += [f'exam term not in the glossary: {u}' for u in unmapped]

    rating = SYL['ratings']
    for e in entries:
        e['asked'] = sorted(asked.get(e['name'], []))
        node = BLOCKS[e['cite'][0]]['node'] if e['cite'] and e['cite'][0] in BLOCKS else None
        e['node'] = node
        r = rating.get(node or '', {})
        e['stars'] = r.get('stars')
        del e['file']
    (OUT / 'glossary.json').write_text(json.dumps(entries, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    top = sorted(entries, key=lambda e: (-len(e['asked']), e['name']))
    md = ['# 名词库报告', '',
          f"- 条目 {len(entries)} 个；真题考过的 {sum(bool(e['asked']) for e in entries)} 个，覆盖真题中全部 {len(EXAMS['terms'])} 种写法" if not unmapped
          else f"- 条目 {len(entries)} 个；未归并的真题写法 {len(unmapped)} 个",
          f'- 公式 {len(snippets)} 个，KaTeX 与结构检查问题 {len(errors)} 处，提示 {len(warnings)} 条', '',
          '## 考过的名词（按次数）', '', '| 名词 | 次数 | 试卷 | 所在小节评级 |', '|---|---|---|---|']
    md += [f"| {e['name']} | {len(e['asked'])} | {', '.join(e['asked'])} | {'★' * e['stars'] if e['stars'] else ('✗' if e['stars'] == 0 else '')} |"
           for e in top if e['asked']]
    md += ['', '## 未考过但收录的名词', '', '、'.join(e['name'] for e in entries if not e['asked'])]
    md += ['', '## 问题', ''] + [f'- {x}' for x in errors] + ['', '## 提示', ''] + [f'- {x}' for x in warnings]
    (OUT / '名词库报告.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(f'{len(entries)} entries, asked {sum(bool(e["asked"]) for e in entries)}, formulas {len(snippets)}, errors {len(errors)}, warnings {len(warnings)}')
    for x in errors + warnings:
        print('  ', x)


if __name__ == '__main__':
    main()
