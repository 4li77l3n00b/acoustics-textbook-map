"""Solutions: output/solutions/src/ch*.md and misc.md (written by Claude; format in src/README.md) -> output/solutions/solutions.json

    python3 scripts/build_solutions.py

Checks: every id is an exercise (4-10) or an exam question (2022-四); "same:" targets exist; "uses:" are textbook
section numbers; every $…$ / $$…$$ parses in KaTeX. Numbers come from scripts/verify/*.py (run them separately).
"""
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build_exams import katex_check  # noqa: E402

SRC = ROOT / 'output/solutions/src'
TB = ROOT / 'output/textbook'
EXERCISES = {x['id'] for x in json.loads((TB / 'exercises.json').read_text(encoding='utf-8'))}
QIDS = {q['id'] for p in json.loads((ROOT / 'output/exams/exams.json').read_text(encoding='utf-8'))['papers'] for q in p['questions']}
BYNUM = {n['num']: n['id'] for n in json.loads((TB / 'toc.json').read_text(encoding='utf-8'))['nodes'] if n['kind'] in ('chapter', 'section', 'subsection')}


def parse():
    sols, cur, body = {}, None, []
    def close():
        if cur:
            sols[cur]['body'] = '\n'.join(body).strip()
    for f in sorted(SRC.glob('ch*.md')) + [SRC / 'misc.md']:
        for ln in f.read_text(encoding='utf-8').splitlines():
            if ln.startswith('## '):
                close()
                cur, body = ln[3:].strip(), []
                if cur in sols:
                    raise SystemExit(f'duplicate solution {cur}')
                sols[cur] = {'answer': '', 'uses': [], 'same': '', 'note': '', 'file': f.name}
            elif cur is None or ln.startswith('# '):
                continue
            elif not body and (m := re.match(r'^(answer|uses|same|note):\s*(.*)$', ln)):
                k, v = m[1], m[2].strip()
                sols[cur][k] = v.split() if k == 'uses' else v
            else:
                body.append(ln)
        close()
        cur = None
    return sols


def main():
    sols = parse()
    errors = []
    snippets = []
    for sid, s in sols.items():
        if sid not in EXERCISES and sid not in QIDS:
            errors.append(f'{sid}: neither an exercise nor an exam question')
        if s['same'] and s['same'] not in sols:
            errors.append(f'{sid}: same {s["same"]} has no solution')
        if not s['same'] and not s['body']:
            errors.append(f'{sid}: empty solution')
        if not s['answer'] and not s['same']:
            errors.append(f'{sid}: no answer line')
        nodes = []
        for u in s['uses']:
            if u not in BYNUM:
                errors.append(f'{sid}: unknown section {u}')
            else:
                nodes.append(BYNUM[u])
        s['uses'] = nodes
        text = '\n'.join([s['answer'], s['note'], s['body']])
        disp = re.findall(r'\$\$(.+?)\$\$', text, flags=re.S)
        rest = re.sub(r'\$\$.+?\$\$', '', text, flags=re.S)
        if rest.count('$') % 2:
            errors.append(f'{sid}: unbalanced $')
        snippets += [[sid, d] for d in disp] + [[sid, m] for m in re.findall(r'\$([^$]+)\$', rest)]
        del s['file']
    # a "same" solution inherits answer / uses from its target unless it sets its own
    for sid, s in sols.items():
        if s['same']:
            t = sols.get(s['same'], {})
            s['answer'] = s['answer'] or t.get('answer', '')
            s['uses'] = s['uses'] or t.get('uses', [])
    errors += katex_check(snippets)
    (ROOT / 'output/solutions/solutions.json').write_text(json.dumps(sols, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    ex = sum(k in EXERCISES for k in sols)
    print(f'{len(sols)} solutions ({ex} exercises, {len(sols) - ex} exam questions), formulas {len(snippets)}, errors {len(errors)}')
    for e in errors:
        print('  ', e)


if __name__ == '__main__':
    main()
