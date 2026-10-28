"""Question bank: output/exams/src/*.md (hand transcriptions, format in src/README.md) -> output/exams/exams.json

    python3 scripts/build_exams.py

Also writes output/exams/题库报告.md (papers, sources, completeness, how often each term was asked) and checks
every $…$ with KaTeX (node + the KaTeX copy in the math2 project's viewer, or $KATEX).
"""
from collections import defaultdict
from pathlib import Path
import json
import os
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'output/exams/src'
OUT = ROOT / 'output/exams'
KATEX = os.environ.get('KATEX', '/home/ctrwaz/数学二/output/viz/vendor/katex/katex.min.js')
TERM_KINDS = ('名词解释',)


def parse(path):
    paper = {'notes': []}
    qs, q = [], None
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.rstrip()
        if line.startswith('## '):
            parts = [p.strip() for p in line[3:].split('·')]
            q = {'no': parts[0], 'label': None, 'score': None, 'text': [], 'terms': [], 'figs': [], 'notes': [], 'proto': []}
            for p in parts[1:]:
                if p.isdigit():
                    q['score'] = int(p)
                else:
                    q['label'] = p
            qs.append(q)
        elif q is None:
            if m := re.match(r'^(\w+):\s*(.*)$', line):
                k, v = m[1], m[2].strip()
                if k == 'note':
                    paper['notes'].append(v)
                else:
                    paper[k] = int(v) if k == 'year' else v
        elif line.startswith('- ') and q['label'] in TERM_KINDS:
            name, _, orig = (s.strip() for s in line[2:].partition('|'))
            q['terms'].append({'name': name, **({'raw': orig} if orig else {})})
        elif line.startswith('proto:'):
            q['proto'] = line[6:].split()
        elif line.startswith('fig:'):
            q['figs'].append(line[4:].strip())
        elif line.startswith('>'):
            q['notes'].append(line.lstrip('> ').strip())
        elif line.strip():
            q['text'].append(line.strip())
    pid = f"{paper['year']}{paper.get('variant', '')}"
    for q in qs:
        q['id'] = f"{pid}-{q['no']}"
        q['type'] = 'term' if q['terms'] or q['label'] in TERM_KINDS else 'problem'
        q['text'] = '\n'.join(q['text'])
    paper.update(id=pid, questions=qs)
    return paper


def atoms(name):
    """"声压级、A 计权声压级" asks two concepts; count each one."""
    return [a.strip() for a in re.split(r'[、]', name) if a.strip()]


def katex_check(snippets):
    if not Path(KATEX).exists():
        return ['KaTeX not found: set $KATEX']
    js = ("const k=require(process.argv[1]);const xs=JSON.parse(require('fs').readFileSync(0,'utf8'));"
          "const bad=[];for(const [w,t] of xs){try{k.renderToString(t,{throwOnError:true,strict:'ignore'})}catch(e){bad.push(w+': '+e.message.slice(0,120))}}"
          "console.log(JSON.stringify(bad))")
    r = subprocess.run(['node', '-e', js, KATEX], input=json.dumps(snippets), capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def main():
    papers = [parse(p) for p in sorted(SRC.glob('[12]*.md'))]
    snippets = []
    for p in papers:
        for q in p['questions']:
            for field in [q['text'], *q['notes'], *q['figs']]:
                if field.count('$') % 2:
                    snippets.append([q['id'], '$ unbalanced in: ' + field[:60] + '\\'])  # forces a KaTeX error
                snippets += [[q['id'], m] for m in re.findall(r'\$([^$]+)\$', field)]
    bad = katex_check(snippets)
    # prototypes must exist in the textbook index: exercise "4-28", example "AC/…#例4" or node "AC/…"
    tb = ROOT / 'output/textbook'
    known = {x['id'] for x in json.loads((tb / 'exercises.json').read_text(encoding='utf-8'))}
    known |= {e['id'] for e in json.loads((tb / 'examples.json').read_text(encoding='utf-8'))}
    known |= {n['id'] for n in json.loads((tb / 'toc.json').read_text(encoding='utf-8'))['nodes']}
    bad += [f"{q['id']}: unknown prototype {r}" for p in papers for q in p['questions'] for r in q['proto'] if r not in known]

    index = defaultdict(list)
    for p in papers:
        for q in p['questions']:
            for t in q['terms']:
                for a in atoms(t['name']):
                    index[a].append(p['id'])
    terms = sorted(({'term': k, 'count': len(v), 'papers': v} for k, v in index.items()), key=lambda t: (-t['count'], t['term']))
    data = {'papers': papers, 'terms': terms}
    (OUT / 'exams.json').write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    nq = sum(q['type'] == 'problem' for p in papers for q in p['questions'])
    nt = sum(len(q['terms']) for p in papers for q in p['questions'])
    md = ['# 题库报告', '', f'- 试卷 {len(papers)} 份（{papers[0]["year"]}–{papers[-1]["year"]}），大题/简答题 {nq} 道，名词解释 {nt} 条（{len(terms)} 个不同概念）',
          '- 没有一份是官方原卷：都是考生回忆或答案整理中的题干，每题的出入与存疑写在题下注中。', '',
          '| 试卷 | 来源 | 类型 | 完整度 | 名词 | 大题 |', '|---|---|---|---|---|---|']
    for p in papers:
        md.append(f"| {p['id']} | {p['source']} | {p['kind']} | {p['complete']} | "
                  f"{sum(len(q['terms']) for q in p['questions'])} | {sum(q['type'] == 'problem' for q in p['questions'])} |")
    years = {p['year'] for p in papers}
    md += ['', f"缺少的年份：{', '.join(str(y) for y in range(1998, 2026) if y not in years)}", '',
           '## 名词解释出现次数（≥2 次）', '', '| 概念 | 次数 | 试卷 |', '|---|---|---|']
    md += [f"| {t['term']} | {t['count']} | {', '.join(t['papers'])} |" for t in terms if t['count'] >= 2]
    protos = [(q['id'], r) for p in papers for q in p['questions'] for r in q['proto']]
    md += ['', f'## 课本原型（{len(protos)} 条）', '', '真题与教材习题 / 例题 / 小节的对应，已逐条对照教材原文核实。', '']
    md += [f'- {qid} → {r}' for qid, r in protos]
    md += ['', f'## 公式检查', '', f'KaTeX 解析 {len(snippets)} 个公式；公式错误与无效原型共 {len(bad)} 处' + ('：' if bad else '。')] + [f'- {b}' for b in bad]
    (OUT / '题库报告.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(f'{len(papers)} papers, {nq} problems, {nt} term items ({len(terms)} distinct), formulas {len(snippets)}, KaTeX errors {len(bad)}')
    for b in bad:
        print('  ', b)


if __name__ == '__main__':
    main()
