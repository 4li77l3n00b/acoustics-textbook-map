"""Syllabus layer: output/syllabus/src/{考纲,评级,习题}.md (hand-written) -> output/syllabus/syllabus.json + 考纲报告.md

    python3 scripts/build_syllabus.py

- 考纲.md   syllabus items -> textbook nodes
- 评级.md   ★ rating per chapter / section / subsection; a rating covers every descendant not rated itself
- 习题.md   每道习题的档次（必做 / 选做 / 跳过）与理由；正文例题的档次（必看 / 选看）
Checks: every node exists; every leaf of chapters 1–8 and 11 is rated; every exercise is listed exactly once;
exam ids cited in reasons (2009-四, 2017-二（1）…) exist in output/exams/exams.json.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'output/syllabus/src'
OUT = ROOT / 'output/syllabus'
TOC = json.loads((ROOT / 'output/textbook/toc.json').read_text(encoding='utf-8'))['nodes']
BYNUM = {n['num']: n['id'] for n in TOC if n['kind'] in ('chapter', 'section', 'subsection')}
EXERCISES = [x['id'] for x in json.loads((ROOT / 'output/textbook/exercises.json').read_text(encoding='utf-8'))]
EXAMPLES = {e['id'] for e in json.loads((ROOT / 'output/textbook/examples.json').read_text(encoding='utf-8'))}
EXAMS = json.loads((ROOT / 'output/exams/exams.json').read_text(encoding='utf-8'))
QIDS = {q['id'] for p in EXAMS['papers'] for q in p['questions']}
STARS = {'★★★': 3, '★★': 2, '★': 1, '✗': 0}
EXAM_REF = re.compile(r'(?<![\d.])((?:19|20)\d\d[a-z]?-(?:[一二三四五六七八九十]+|\d+)(?:（\d）)?)')
errors = []


def lines(name):
    return [ln.rstrip() for ln in (SRC / name).read_text(encoding='utf-8').splitlines()]


def node(num):
    if num not in BYNUM:
        errors.append(f'unknown node {num}')
    return BYNUM.get(num)


def check_refs(text, where):
    for ref in EXAM_REF.findall(text):
        if ref not in QIDS:
            errors.append(f'{where}: exam {ref} not in the question bank')


def parse_items():
    items, part = [], None
    for ln in lines('考纲.md'):
        if m := re.match(r'^# ([一二三四五六七]) (.+)$', ln):
            part = {'part': m[1], 'title': m[2]}
        elif m := re.match(r'^## (\d\.\d) (.+)$', ln):
            items.append({'id': m[1], 'part': part['part'], 'part_title': part['title'], 'title': m[2], 'nodes': [], 'note': ''})
        elif ln.startswith('nodes:'):
            items[-1]['nodes'] = [node(x) for x in ln[6:].split()]
        elif ln.startswith('note:'):
            items[-1]['note'] = ln[5:].strip()
    return items


def parse_ratings():
    rated = {}
    for ln in lines('评级.md'):
        if m := re.match(r'^- (\d+(?:\.\d+)*) (★★★|★★|★|✗) (.+)$', ln):
            nid = node(m[1])
            tags = re.findall(r'\[(新增|预测)\]', m[3])
            note = re.sub(r'\s*\[(新增|预测)\]', '', m[3]).strip()
            check_refs(note, m[1])
            rated[nid] = {'stars': STARS[m[2]], 'note': note, 'tags': tags}
        elif ln.startswith('- '):
            errors.append(f'评级.md: line not understood: {ln}')
    # every node gets the rating of itself or its nearest rated ancestor
    out = {}
    for n in TOC:
        if n['kind'] not in ('chapter', 'section', 'subsection'):
            continue
        parts = n['id'].split('/')
        for k in range(len(parts), 1, -1):
            a = '/'.join(parts[:k])
            if a in rated:
                out[n['id']] = dict(rated[a], **({'from': a} if a != n['id'] else {}))
                break
    leaves = [n for n in TOC if n['kind'] in ('section', 'subsection') and not any(m['id'].startswith(n['id'] + '/') for m in TOC)]
    missing = [n['num'] for n in leaves if n['id'] not in out]
    # a chapter or section with no rating of its own (its introduction text) takes the best rating among its parts
    for n in TOC:
        if n['kind'] in ('chapter', 'section') and n['id'] not in out:
            kids = [out[m['id']] for m in leaves if m['id'].startswith(n['id'] + '/') and m['id'] in out]
            if kids:
                best = max(kids, key=lambda r: r['stars'])
                out[n['id']] = {'stars': best['stars'], 'note': '（下属小节的最高评级）', 'tags': [], 'from': 'children'}
    if missing:
        errors.append('leaves without a rating: ' + ' '.join(missing))
    return out


def expand(spec):
    ids = []
    for part in spec.split('、'):
        if m := re.fullmatch(r'(\d+)-(\d+)~(\d+)-(\d+)', part):
            ids += [f'{m[1]}-{k}' for k in range(int(m[2]), int(m[4]) + 1)]
        else:
            ids.append(part)
    return ids


def parse_exercises():
    ex, eg = {}, {}
    for ln in lines('习题.md'):
        if m := re.match(r'^- (必做|选做|跳过) (\S+) (.+)$', ln):
            check_refs(m[3], m[2])
            for i in expand(m[2]):
                if i in ex:
                    errors.append(f'exercise {i} listed twice')
                if i not in EXERCISES:
                    errors.append(f'unknown exercise {i}')
                ex[i] = {'level': m[1], 'reason': m[3]}
        elif m := re.match(r'^- (必看|选看) (\S+) (.+)$', ln):
            check_refs(m[3], m[2])
            for i in m[2].split('、'):
                if i not in EXAMPLES:
                    errors.append(f'unknown example {i}')
                eg[i] = {'level': m[1], 'reason': m[3]}
        elif ln.startswith('- '):
            errors.append(f'习题.md: line not understood: {ln}')
    errors.extend(f'exercise {i} not listed' for i in EXERCISES if i not in ex)
    return ex, eg


def report(items, ratings, ex, eg):
    leaves = [n for n in TOC if n['kind'] in ('section', 'subsection') and not any(m['id'].startswith(n['id'] + '/') for m in TOC)]
    md = ['# 考纲层报告', '', f'- 考纲条目 {len(items)} 条（七部分），每条都对应到教材小节', '']
    md += ['## 各章小节评级分布', '', '| 章 | ★★★ | ★★ | ★ | ✗ |', '|---|---|---|---|---|']
    for ch in [n for n in TOC if n['kind'] == 'chapter']:
        ls = [ratings[n['id']]['stars'] for n in leaves if n['id'].startswith(ch['id'] + '/')]
        md.append(f"| {ch['num']} {ch['title']} | " + ' | '.join(str(ls.count(s)) for s in (3, 2, 1, 0)) + ' |')
    lv = lambda d, k: sum(v['level'] == k for v in d.values())  # noqa: E731
    md += ['', f"## 习题：必做 {lv(ex, '必做')}，选做 {lv(ex, '选做')}，跳过 {lv(ex, '跳过')}（共 {len(ex)}）",
           f"## 例题：必看 {lv(eg, '必看')}，选看 {lv(eg, '选看')}", '',
           '## 预测与新增', '']
    md += [f"- {n} {'/'.join(r['tags'])}：{r['note']}" for n, r in ratings.items() if r['tags'] and 'from' not in r]
    md += ['', f'## 检查：{len(errors)} 处问题', ''] + [f'- {e}' for e in errors]
    return '\n'.join(md) + '\n'


def main():
    items = parse_items()
    ratings = parse_ratings()
    ex, eg = parse_exercises()
    data = {'items': items, 'ratings': ratings, 'exercises': ex, 'examples': eg}
    (OUT / 'syllabus.json').write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (OUT / '考纲报告.md').write_text(report(items, ratings, ex, eg), encoding='utf-8')
    print(f'items {len(items)}, rated nodes {len(ratings)}, exercises {len(ex)}, examples {len(eg)}, problems {len(errors)}')
    for e in errors:
        print('  ', e)


if __name__ == '__main__':
    main()
