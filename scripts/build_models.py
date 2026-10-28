"""Models, relations and derivations: output/models/src/{models,relations,derivations}.md -> output/models/models.json

    python3 scripts/build_models.py

Hand-written by Claude (format in output/models/src/README.md). Checks: section numbers exist, step names are known,
relation ends are models, derivation "asked:" are exam questions and "models:" are models, every equation number
"(2-1-5)" cited in a body exists in the textbook, every $…$ / $$…$$ parses in KaTeX.
Also writes the equation index (equation number -> block uid, pdf page) for the viewer, and tmp/eqrefs.txt: each
cited equation next to the book's formula, for proofreading.
"""
from collections import defaultdict
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build_exams import katex_check  # noqa: E402

SRC = ROOT / 'output/models/src'
TB = ROOT / 'output/textbook'
STEPS = ['条件', '方程', '边界', '解', '能量', '阻抗', '特性']
RELS = ['类比', '同一数学', '退化', '互易']
QIDS = {q['id'] for p in json.loads((ROOT / 'output/exams/exams.json').read_text(encoding='utf-8'))['papers'] for q in p['questions']}
BYNUM = {n['num']: n['id'] for n in json.loads((TB / 'toc.json').read_text(encoding='utf-8'))['nodes'] if n['kind'] in ('chapter', 'section', 'subsection')}
EQ = re.compile(r'[（(]\s*(\d{1,2})\s*[-−–]\s*(\d{1,2})\s*[-−–]\s*(\d{1,3}[a-z]?)\s*[)）]')


def equations():
    """Equation number -> (uid, pdf page, the display formula before it); first occurrence wins."""
    blocks = [json.loads(ln) for ln in (TB / 'blocks.jsonl').open(encoding='utf-8')]
    eqs = {}
    for i, b in enumerate(blocks):
        if b['label'] != 'formula_number' or not (m := EQ.search(b['text'])):
            continue
        k = f'{m[1]}-{m[2]}-{m[3]}'
        if k not in eqs:
            prev = blocks[i - 1] if i and blocks[i - 1]['label'] in ('display_formula', 'formula') else None
            eqs[k] = (prev['uid'] if prev else b['uid'], b['pdf_page'], re.sub(r'\s+', ' ', prev['text'])[:140] if prev else '')
    return eqs


def sections(text):
    """'## id' blocks -> list of (id, field dict, [(heading, body lines)]), body before the first '###' kept as ''."""
    out = []
    for chunk in re.split(r'^## ', text, flags=re.M)[1:]:
        lines = chunk.splitlines()
        sid, fields, parts, cur = lines[0].strip(), {}, [], None
        for ln in lines[1:]:
            if ln.startswith('### '):
                cur = [ln[4:].strip(), []]
                parts.append(cur)
            elif cur is None and (m := re.match(r'^([a-z]+):\s*(.*)$', ln)):
                fields[m[1]] = m[2].strip()
            elif cur is not None:
                cur[1].append(ln)
        out.append((sid, fields, [(h, '\n'.join(b).strip()) for h, b in parts]))
    return out


def main():
    eqs = equations()
    errors, snippets, cited = [], [], defaultdict(list)

    def text_checks(owner, text):
        disp = re.findall(r'\$\$(.+?)\$\$', text, flags=re.S)
        rest = re.sub(r'\$\$.+?\$\$', '', text, flags=re.S)
        if rest.count('$') % 2:
            errors.append(f'{owner}: unbalanced $')
        snippets.extend([[owner, d] for d in disp] + [[owner, m] for m in re.findall(r'\$([^$]+)\$', rest)])
        for m in EQ.finditer(re.sub(r'\$.+?\$', '', text, flags=re.S)):
            k = f'{m[1]}-{m[2]}-{m[3]}'
            if k not in eqs:
                errors.append(f'{owner}: equation ({k}) not in the textbook')
            else:
                cited[k].append(owner)

    def nodes(owner, nums):
        out = []
        for u in nums.split():
            if u not in BYNUM:
                errors.append(f'{owner}: unknown section {u}')
            else:
                out.append(BYNUM[u])
        return out

    models = []
    for mid, f, parts in sections((SRC / 'models.md').read_text(encoding='utf-8')):
        steps = {}
        for h, body in parts:
            name, _, short = h.partition('|')
            name = name.strip()
            if name not in STEPS:
                errors.append(f'{mid}: unknown step {name}')
                continue
            steps[name] = {'short': short.strip(), 'body': body}
            text_checks(f'{mid}/{name}', short + '\n' + body)
        if not f.get('name'):
            errors.append(f'{mid}: no name')
        text_checks(mid, f.get('brief', ''))
        models.append({'id': mid, 'name': f.get('name', mid), 'brief': f.get('brief', ''), 'nodes': nodes(mid, f.get('nodes', '')), 'steps': steps})
    mids = {m['id'] for m in models}

    relations = []
    for ln in (SRC / 'relations.md').read_text(encoding='utf-8').splitlines():
        if not ln.startswith('- '):
            continue
        parts = [x.strip() for x in ln[2:].split('|')]
        if len(parts) != 4:
            errors.append(f'relation line: {ln[:40]}')
            continue
        kind, a, b, text = parts
        if kind not in RELS:
            errors.append(f'relation {a}-{b}: unknown kind {kind}')
        for x in (a, b):
            if x not in mids:
                errors.append(f'relation {a}-{b}: unknown model {x}')
        text_checks(f'relation {a}-{b}', text)
        relations.append({'kind': kind, 'a': a, 'b': b, 'text': text})

    derivations = []
    for did, f, parts in sections((SRC / 'derivations.md').read_text(encoding='utf-8')):
        for q in f.get('asked', '').split():
            if q not in QIDS:
                errors.append(f'{did}: asked {q} is not an exam question')
        for m in f.get('models', '').split():
            if m not in mids:
                errors.append(f'{did}: unknown model {m}')
        if not parts:
            errors.append(f'{did}: no steps')
        for h, body in parts:
            text_checks(f'{did}/{h}', h + '\n' + body)
        text_checks(did, f.get('goal', '') + '\n' + f.get('note', ''))
        derivations.append({'id': did, 'name': f.get('name', did), 'nodes': nodes(did, f.get('nodes', '')), 'asked': f.get('asked', '').split(),
                            'models': f.get('models', '').split(), 'goal': f.get('goal', ''), 'note': f.get('note', ''),
                            'steps': [{'title': h, 'body': body} for h, body in parts]})

    # list derivations in book order (by their first section)
    order = {n['id']: i for i, n in enumerate(json.loads((TB / 'toc.json').read_text(encoding='utf-8'))['nodes'])}
    derivations.sort(key=lambda d: order.get(d['nodes'][0], 10**6) if d['nodes'] else 10**6)
    errors += katex_check(snippets)
    out = {'steps': STEPS, 'models': models, 'relations': relations, 'derivations': derivations,
           'eqs': {k: [u, p] for k, (u, p, _) in eqs.items()}}
    (ROOT / 'output/models/models.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (ROOT / 'tmp').mkdir(exist_ok=True)
    (ROOT / 'tmp/eqrefs.txt').write_text(''.join(f'({k}) {", ".join(sorted(set(v)))}\n    {eqs[k][2]}\n' for k, v in sorted(cited.items(), key=lambda kv: [int(x) if x.isdigit() else x for x in re.split(r'[-a-z]', kv[0]) if x])), encoding='utf-8')
    cells = sum(len(m['steps']) for m in models)
    print(f'{len(models)} models ({cells} cells), {len(relations)} relations, {len(derivations)} derivations '
          f'({sum(len(d["steps"]) for d in derivations)} steps), {len(cited)} equations cited, formulas {len(snippets)}, errors {len(errors)}')
    for e in errors:
        print('  ', e)


if __name__ == '__main__':
    main()
