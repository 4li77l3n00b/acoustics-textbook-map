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



# ---------- symbols: which quantities a derivation uses, and what they mean (symbols.md) ----------
NOT_SYMBOLS = set(r"""\frac \dfrac \tfrac \sqrt \int \oint \iint \partial \nabla \ln \lg \log \exp \sin \cos \tan \cot \sinh \cosh \tanh
\arcsin \arccos \arctan \pi \infty \left \right \quad \qquad \cdot \times \approx \le \ge \leq \geq \ll \gg \to \sum \prod \lim \max \min
\Big \big \bigg \Bigg \displaystyle \overline \bar \hat \tilde \vec \dot \ddot \mathcal \boldsymbol \mathbf \circ \pm \mp \ne \neq \propto
\equiv \sim \cdots \ldots \dots \leftrightarrow \Rightarrow \rightarrow \xrightarrow \iff \in \perp \parallel \angle \deg \Re \Im \mid
\prime \limits \over \begin \end \not \colon \star \ast \bullet \div \forall \exists \underbrace \overbrace \stackrel \overset
\underset \mathbb \mathit \lfloor \rfloor \lceil \rceil \land \lor \wedge \vee""".split())
SYM = re.compile(r"(SPL|SIL|SWL|TL(?![A-Za-z])|\\[A-Za-z]+|[A-Za-z])((?:_(?:\{[^{}]*\}|\\[A-Za-z]+|[A-Za-z0-9])|\^\{?\(?[0-9]+\)?\}?|')*)")


def symbol_tokens(text):
    """Symbols in the $…$ / $$…$$ of a text, in order: 'M_m', '\\xi_{st}', "\\eta'", 'SPL' … Powers are dropped, primes and
    subscripts kept; j, e, d (imaginary unit, Euler's number, differential) and operator names are not symbols."""
    out = []
    for a, b in re.findall(r'\$\$(.+?)\$\$|\$(.+?)\$', text, re.S):
        m = re.sub(r'\\(?:text|mathrm|operatorname)\{[^}]*\}', ' ', a or b)
        m = re.sub(r'_\{(\\[A-Za-z]+|[A-Za-z0-9])\}', r'_\1', m)
        for mm in SYM.finditer(m):
            base, sub = mm.group(1), re.sub(r'\^\{?\(?[0-9]+\)?\}?', '', mm.group(2))
            if base in NOT_SYMBOLS or base in ('j', 'e', 'd'):
                continue
            out.append(base + sub)
    return out


def symbol_table(path, ids):
    """symbols.md: '## 通用' and '## d-id' sections of 'TeX | meaning' lines, '~ a b' = tokens that need no entry."""
    common, per, ignore, errors = [], defaultdict(list), defaultdict(set), []
    sec = None
    for ln in path.read_text(encoding='utf-8').splitlines():
        if ln.startswith('## '):
            sec = ln[3:].strip()
            if sec != '通用' and sec not in ids:
                errors.append(f'symbols: unknown derivation {sec}')
        elif sec and ln.startswith('~'):
            ignore[sec].update(ln[1:].split())
        elif sec and '|' in ln:
            tex, meaning = (x.strip() for x in ln.split('|', 1))
            entry = (tex, meaning, set(symbol_tokens(f'${tex}$')))
            (common if sec == '通用' else per[sec]).append(entry)
    return common, per, ignore, errors


def attach_symbols(derivations, path):
    """Give each derivation its symbol list (own entries first in priority, then 通用 ones it uses), ordered by first
    use; returns errors for symbols used without a definition."""
    common, per, ignore, errors = symbol_table(path, {d['id'] for d in derivations})
    for d in derivations:
        text = '\n'.join([d['goal'], d['note'], d['intro']] + [s['body'] + '\n' + s['why'] for s in d['steps']] + [d['outro']])
        used = symbol_tokens(text)
        first = {}
        for i, t in enumerate(used):
            first.setdefault(t, i)
        own = per.get(d['id'], [])
        covered = set().union(*(e[2] for e in own)) if own else set()
        rows = [e for e in own]
        for e in common:  # a 通用 entry is added for the used symbols it explains that nothing above already does
            if (e[2] & set(first)) - covered:
                rows.append(e); covered |= e[2]
        missing = sorted(set(first) - covered - ignore[d['id']] - ignore['通用'])
        if missing:
            errors.append(f'symbols {d["id"]}: no meaning for {" ".join(missing)}')
        rows.sort(key=lambda e: min((first[t] for t in e[2] if t in first), default=10**6))
        d['symbols'] = [[tex, meaning] for tex, meaning, _ in rows]
    return errors


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
        # "### 导读" (before the steps) and "### 理解与联系" (after) are reading notes, not steps;
        # inside a step, lines starting with "> " are its explanation (hidden in recite mode)
        intro = '\n'.join(b for h, b in parts if h == '导读')
        outro = '\n'.join(b for h, b in parts if h == '理解与联系')
        steps = []
        for h, body in parts:
            if h in ('导读', '理解与联系'):
                continue
            lines = body.splitlines()
            why = '\n'.join(ln[2:] for ln in lines if ln.startswith('> ')).strip()
            main = '\n'.join(ln for ln in lines if not ln.startswith('> ')).strip()
            steps.append({'title': h, 'body': main, 'why': why})
        derivations.append({'id': did, 'name': f.get('name', did), 'nodes': nodes(did, f.get('nodes', '')), 'asked': f.get('asked', '').split(),
                            'models': f.get('models', '').split(), 'goal': f.get('goal', ''), 'note': f.get('note', ''),
                            'intro': intro, 'outro': outro, 'steps': steps})

    # guided-reading notes (guide*.md): "## d-id", then "### 导读", "### 1" … (why of step 1 …), "### 理解与联系"
    did_of = {d['id']: d for d in derivations}
    for gp in sorted(SRC.glob('guide*.md')):
        for gid, f, parts in sections(gp.read_text(encoding='utf-8')):
            d = did_of.get(gid)
            if not d:
                errors.append(f'guide: unknown derivation {gid}')
                continue
            for h, body in parts:
                text_checks(f'guide {gid}/{h}', body)
                if h == '导读':
                    d['intro'] = body
                elif h == '理解与联系':
                    d['outro'] = body
                elif h.isdigit() and 1 <= int(h) <= len(d['steps']):
                    d['steps'][int(h) - 1]['why'] = '\n'.join(ln[2:] if ln.startswith('> ') else ln for ln in body.splitlines()).strip()
                else:
                    errors.append(f'guide {gid}: unknown part {h} ({len(d["steps"])} steps)')
    errors += attach_symbols(derivations, SRC / 'symbols.md')
    for d in derivations:
        for tex, meaning in d['symbols']:
            text_checks(f'symbols {d["id"]}', f'${tex}$ {meaning}')
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
          f'({sum(len(d["steps"]) for d in derivations)} steps, {sum(bool(d["intro"]) for d in derivations)} with guided notes, {sum(len(d["symbols"]) for d in derivations)} symbol rows), {len(cited)} equations cited, formulas {len(snippets)}, errors {len(errors)}')
    for e in errors:
        print('  ', e)


if __name__ == '__main__':
    main()
