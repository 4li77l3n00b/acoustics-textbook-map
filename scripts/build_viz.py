"""Pack everything the viewer needs into output/viz/data.js (window.DATA).

    python3 scripts/build_viz.py

Inputs: output/textbook (toc, blocks, examples, exercises), output/exams/exams.json,
output/syllabus/syllabus.json, output/glossary/glossary.json, output/solutions/solutions.json, output/models/models.json, and the page images in output/viz/pages/AC
(their pixel sizes go into the data so the reader can scale bboxes).

Question -> textbook links are derived here: a question is linked to a node when that node's rating note
cites the question id (评级.md) or when the question's prototype lies in that node.
"""
from collections import defaultdict
from pathlib import Path
import json
import re

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/viz'
TB = ROOT / 'output/textbook'
load = lambda p: json.loads(p.read_text(encoding='utf-8'))  # noqa: E731


def main():
    toc = load(TB / 'toc.json')
    blocks = [json.loads(ln) for ln in (TB / 'blocks.jsonl').open(encoding='utf-8')]
    examples = load(TB / 'examples.json')
    exercises = load(TB / 'exercises.json')
    exams = load(ROOT / 'output/exams/exams.json')
    syl = load(ROOT / 'output/syllabus/syllabus.json')
    glossary = load(ROOT / 'output/glossary/glossary.json')
    sp = ROOT / 'output/solutions/solutions.json'
    solutions = load(sp) if sp.exists() else {}
    mp = ROOT / 'output/models/models.json'
    models = load(mp) if mp.exists() else {'steps': [], 'models': [], 'relations': [], 'derivations': [], 'eqs': {}}

    pages = []
    for f in sorted((OUT / 'pages/AC').glob('*.webp')):
        w, h = Image.open(f).size
        p = int(f.stem)
        pages.append([p, w, h, p - toc['offset'] if p - toc['offset'] >= 1 else None])

    # question -> nodes: rating notes cite question ids; prototypes point at exercises / examples / nodes
    qids = {q['id'] for p in exams['papers'] for q in p['questions']}
    ref = re.compile(r'(?<![\d.])((?:19|20)\d\d[a-z]?-(?:[一二三四五六七八九十]+|\d+)(?:（\d）)?)')
    qnodes = defaultdict(set)
    for nid, r in syl['ratings'].items():
        if r.get('from'):
            continue
        for qid in ref.findall(r['note']):
            if qid in qids:
                qnodes[qid].add(nid)
    ex_node = {}
    for x in exercises:
        ex_node[x['id']] = f"{toc['book']}/{x['chapter']}/习题"
    eg_node = {e['id']: e['node'] for e in examples}
    for p in exams['papers']:
        for q in p['questions']:
            for r in q['proto']:
                if r in eg_node:
                    qnodes[q['id']].add(eg_node[r])
                elif r in ex_node:
                    pass  # an exercise is a prototype, not a section; shown as its own link
                else:
                    qnodes[q['id']].add(r)
            # sections a written solution relies on also count
            qnodes[q['id']].update((solutions.get(q['id']) or {}).get('uses', []))
            q['nodes'] = sorted(qnodes[q['id']])

    # which glossary entries a block defines (for the reader's side panel)
    defines = defaultdict(list)
    for i, e in enumerate(glossary):
        for u in e['cite']:
            defines[u].append(i)

    slim = []
    for b in blocks:
        d = {'u': b['uid'], 'p': b['pdf_page'], 'b': b['bbox'], 'n': b['node'], 'l': b['label'], 't': b['text']}
        for k_src, k in (('example', 'eg'), ('exercise', 'ex'), ('extra_bbox', 'xb'), ('merged_into', 'mi')):
            if b.get(k_src):
                d[k] = b[k_src]
        if b['uid'] in defines:
            d['g'] = defines[b['uid']]
        slim.append(d)

    data = {
        'book': {'id': toc['book'], 'name': toc['name'], 'offset': toc['offset'], 'nodes': toc['nodes'], 'pages': pages},
        'blocks': slim,
        'examples': examples,
        'exercises': [dict({k: x[k] for k in ('id', 'chapter', 'num', 'start', 'pdf_pages', 'text', 'figs')},
                           nodes=(solutions.get(x['id']) or {}).get('uses', [])) for x in exercises],
        'solutions': solutions,
        'papers': exams['papers'],
        'syllabus': syl,
        'glossary': glossary,
        'models': models,
    }
    js = 'window.DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (OUT / 'data.js').write_text(js, encoding='utf-8')
    linked = sum(bool(q['nodes']) for p in exams['papers'] for q in p['questions'])
    total = sum(len(p['questions']) for p in exams['papers'])
    print(f'data.js {len(js) / 1e6:.1f} MB: {len(pages)} pages, {len(slim)} blocks, {total} questions ({linked} linked to sections), '
          f'{len(glossary)} terms, {len(solutions)} solutions, {len(models["models"])} models, {len(models["derivations"])} derivations')


if __name__ == '__main__':
    main()
