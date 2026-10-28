"""Block-level index of 《声学基础》(第3版, 杜功焕 等) from its PaddleOCR-VL JSON.

    python3 scripts/build_textbook_index.py

Outputs (output/textbook/):
  toc.json        chapter / section / subsection / exercise-set / appendix nodes, each anchored to the block
                  that starts it (anchor_method says how it was found)
  blocks.jsonl    every OCR block in reading order with page, bbox (px at 144 dpi = 2 px per PDF point),
                  raw text, node, zone (front | body | exercises | back) and its example / exercise id
  examples.json   worked examples (例 n) inside the body, numbered per subsection as in the book
  exercises.json  end-of-chapter exercises (习题 n-m) with their text
  构建报告.md      counts and everything that needs a human look (unanchored nodes, gaps)

PaddleOCR's merge_layout_blocks puts the text of some regions into a neighbour of the same layout group and
leaves the region itself empty; such blocks get `merged_into` (the block holding their text), and that block
gets `extra_bbox`, so highlighting covers both. Text the OCR missed entirely is added from MANUAL
(output/textbook/manual_blocks.json, transcribed from the page image, `text_source: manual`).

The OCR text is never edited: derived fields record how they were decided, so later stages can cite
block uids and check them against the scanned page.
"""
from pathlib import Path
from difflib import SequenceMatcher
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/textbook'
BOOK = 'AC'
BOOK_NAME = '声学基础（第3版，杜功焕 朱哲民 龚秀芬）'
OCR = next(ROOT.glob('声学基础*PaddleOCR-VL-1.6.json'))
PDF = next(p for p in ROOT.glob('声学基础*.pdf') if 'PaddleOCR' not in p.name)
DROP = {'header', 'number', 'header_image', 'footer', 'footer_image'}
HEAD_LABELS = {'paragraph_title', 'doc_title', 'text', 'content'}
TOC_LINE = re.compile(r'^(?P<t>.*?\S)\s*(?:\.{2,}|…+|\s)\s*(?P<p>\d{1,3})\s*$')
EXAMPLE = re.compile(r'^\s*#*\s*例\s*(\d{1,2})(?!\d)')
# "2-18 …" starts an exercise; "1-4-22" is an equation number, not an exercise
EXERCISE = re.compile(r'^\s*(\d{1,2})\s*[-－—–~～]\s*(\d{1,2})(?!\s*[-－—–]\s*\d)(?!\d)')
# regions the OCR did not detect at all (found by scanning for uncovered vertical gaps), keyed by pdf page
# blocks the OCR missed, transcribed from the page images: {pdf page: [PaddleOCR-style block]}.
# Kept with the (private) data because it is textbook text.
_mp = OUT / 'manual_blocks.json'
MANUAL = {int(k): v for k, v in json.loads(_mp.read_text(encoding='utf-8')).items()} if _mp.exists() else {}


def save(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(text, encoding='utf-8')
    tmp.replace(path)


def key(s):
    """Fuzzy-matching key: no markup, spaces or punctuation."""
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'(?m)^\s*#+\s*', '', s)
    return re.sub(r'[\s$#§\\{}（）()、，,.．:：—\-–…·“”"]', '', s)


def sim(a, b):
    a, b = key(a), key(b)
    if not a or not b:
        return 0.0
    if a == b or (b in a and len(a) <= len(b) + 4):
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


# ---------- pages and reading order ----------

def load_pages():
    pages = json.loads(OCR.read_text(encoding='utf-8'))
    out = []
    for i, p in enumerate(pages, 1):
        raw = p['prunedResult']['parsing_res_list'] + [dict(b, group_id=-1, manual=True) for b in MANUAL.get(i, [])]
        printed = next((int(b['block_content']) for b in raw
                        if b['block_label'] == 'number' and re.fullmatch(r'\d{1,3}', b['block_content'].strip())), None)
        out.append({'pdf_page': i, 'printed': printed, 'raw': raw})
    return out


def page_offset(pages):
    """pdf page − printed page, which must be the same on every numbered page."""
    offs = {p['pdf_page'] - p['printed'] for p in pages if p['printed']}
    assert len(offs) == 1, f'printed page numbers are not a fixed offset: {sorted(offs)}'
    return offs.pop()


def reading_order(raw):
    """OCR gives an order to text blocks only; figures, captions and tables go after the last
    ordered block that starts above them."""
    keep = [b for b in raw if b['block_label'] not in DROP]
    ordered = sorted((b for b in keep if b.get('block_order') is not None), key=lambda b: b['block_order'])
    for b in sorted((b for b in keep if b.get('block_order') is None), key=lambda b: b['block_bbox'][1]):
        at = 0
        for k, o in enumerate(ordered):
            if o['block_bbox'][1] <= b['block_bbox'][1]:
                at = k + 1
        ordered.insert(at, b)
    return ordered


def flatten(pages, offset):
    blocks = []
    for p in pages:
        for k, b in enumerate(reading_order(p['raw'])):
            pr = p['pdf_page'] - offset
            blocks.append({'uid': f"{BOOK}-p{p['pdf_page']:03d}-b{b['block_id']:02d}", 'book': BOOK,
                           'pdf_page': p['pdf_page'], 'page': pr if pr >= 1 else None,
                           'label': b['block_label'], 'bbox': b['block_bbox'], 'text': b['block_content'],
                           'group': b['group_id']})
            if b.get('manual'):
                blocks[-1]['text_source'] = 'manual'
    for i, b in enumerate(blocks):
        b['i'] = i
    for b in blocks:
        if b['label'] == 'text' and not b['text'].strip():
            sib = next((o for o in blocks if o['pdf_page'] == b['pdf_page'] and o['group'] == b['group']
                        and o is not b and o['text'].strip()), None)
            if sib:
                b['merged_into'] = sib['uid']
                sib.setdefault('extra_bbox', []).append(b['bbox'])
    return blocks


# ---------- table of contents ----------

def parse_toc(pages):
    lines = []
    for p in pages[:16]:
        heads = [re.sub(r'\s', '', b['block_content']) for b in p['raw'] if b['block_label'] == 'header']
        titles = [b['block_content'] for b in p['raw'] if b['block_label'] == 'paragraph_title']
        if '目录' not in heads and not any('目录' in t for t in titles):
            continue
        for b in sorted((b for b in p['raw'] if b['block_label'] in ('content', 'text')), key=lambda b: b.get('block_order') or 0):
            lines += [ln.strip() for ln in b['block_content'].split('\n') if ln.strip()]
    nodes, ch, sec = [], None, None
    for ln in lines:
        m = TOC_LINE.match(ln)
        if not m:
            raise ValueError(f'TOC line not understood: {ln!r}')
        t, page = m['t'].strip(), int(m['p'])
        if mm := re.match(r'^(\d+\.\d+\.\d+)\s*(\S.*)$', t):
            nodes.append({'id': f'{sec}/{mm[1]}', 'kind': 'subsection', 'num': mm[1], 'title': mm[2]})
        elif mm := re.match(r'^(\d+\.\d+)\s*(\S.*)$', t):
            sec = f'{ch}/{mm[1]}'
            nodes.append({'id': sec, 'kind': 'section', 'num': mm[1], 'title': mm[2]})
        elif mm := re.match(r'^(\d+)\s+(\S.*)$', t):
            ch = sec = f'{BOOK}/{mm[1]}'
            nodes.append({'id': ch, 'kind': 'chapter', 'num': mm[1], 'title': mm[2]})
        elif mm := re.match(r'^习题\s*(\d+)$', t):
            nodes.append({'id': f'{BOOK}/{mm[1]}/习题', 'kind': 'exercises', 'num': f'习题{mm[1]}', 'title': f'习题{mm[1]}'})
        elif mm := re.match(r'^(?:附录\s*)?([A-Z])\s+(\S.*)$', t):
            nodes.append({'id': f'{BOOK}/附录{mm[1]}', 'kind': 'appendix', 'num': f'附录{mm[1]}', 'title': mm[2]})
        else:
            raise ValueError(f'TOC entry not classified: {t!r}')
        nodes[-1]['page'] = page
    return nodes


def anchor(nodes, blocks, offset):
    """Find the block where each TOC node starts, in book order, near its listed page."""
    cur = 0
    for n in nodes:
        lo, hi = n['page'] + offset - 1, n['page'] + offset + 2
        # real headings first: a chapter's opening page lists its sections as plain text
        best = match(n, blocks, cur, lo, hi, {'paragraph_title', 'doc_title'}) or match(n, blocks, cur, lo, hi, HEAD_LABELS)
        if best:
            b = best
            # a bare number block ("## 1", "### 4.3") belongs with the title that follows it
            if b['i'] > 0 and key(blocks[b['i'] - 1]['text']) == key(n['num']):
                b = blocks[b['i'] - 1]
            n.update(pdf_page=b['pdf_page'], anchor=b['uid'], anchor_method='title_match' if best['label'] != 'text' else 'text_match')
            cur = b['i']
        else:
            first = next(b for b in blocks if b['pdf_page'] >= n['page'] + offset)
            n.update(pdf_page=first['pdf_page'], anchor=first['uid'], anchor_method='page_start')
    return nodes


def match(n, blocks, cur, lo, hi, labels):
    best = None
    for b in blocks[cur:]:
        if b['pdf_page'] > hi:
            break
        if b['pdf_page'] < lo or b['label'] not in labels:
            continue
        nxt = blocks[b['i'] + 1]['text'] if b['i'] + 1 < len(blocks) else ''
        if n['kind'] == 'exercises':
            score = 1.0 if key(b['text']) == key(n['title']) else 0.0
        elif n['kind'] == 'appendix':
            score = max(sim(b['text'], n['title']), sim(b['text'], n['num'] + n['title']))
        else:
            score = max(sim(b['text'], n['num'] + n['title']),
                        # "### 4.3" and "### 理想流体…" are separate blocks; chapter titles stand alone
                        sim(b['text'] + nxt, n['num'] + n['title']) if key(b['text']) == key(n['num']) else 0,
                        sim(b['text'], n['title']) if b['label'] in ('paragraph_title', 'doc_title') else 0)
        if score >= 0.88 and (best is None or score > best[0]):
            best = (score, b)
            if score == 1.0:
                break
    return best[1] if best else None


# ---------- assignment, examples, exercises ----------

def assign(nodes, blocks):
    start = {n['anchor']: n for n in nodes}
    path, zone = None, 'front'
    for b in blocks:
        if n := start.get(b['uid']):
            path = n['id']
            zone = {'exercises': 'exercises', 'appendix': 'back'}.get(n['kind'], 'body')
        b['node'], b['zone'] = path, zone
        b['example'] = b['exercise'] = None


def find_examples(blocks, nodes):
    starts = {n['anchor'] for n in nodes}
    out, cur = [], None
    for b in blocks:
        if b['uid'] in starts or b['label'] == 'paragraph_title' and not EXAMPLE.match(b['text']):
            cur = None  # a new heading ends the running example
        if b['zone'] == 'body' and (m := EXAMPLE.match(b['text'])) and b['label'] in HEAD_LABELS:
            eid = f"{b['node']}#例{int(m[1])}"
            if any(e['id'] == eid for e in out):
                eid += f"-p{b['pdf_page']}"
            first = re.sub(r'^\s*#*\s*', '', b['text']).split('\n')[0]
            cur = {'id': eid, 'node': b['node'], 'num': int(m[1]), 'title': first[:80], 'start': b['uid'], 'blocks': []}
            out.append(cur)
        if cur:
            cur['blocks'].append(b['uid'])
            b['example'] = cur['id']
    for e in out:
        e['end'] = e['blocks'][-1]
        e['pdf_pages'] = sorted({int(u.split('-p')[1][:3]) for u in e['blocks']})
        del e['blocks']
    return out


def find_exercises(blocks):
    """Items "n-m" inside each chapter's exercise set; a block may hold the end of one item and the start of the next."""
    out, cur = [], None
    for b in blocks:
        if b['zone'] != 'exercises':
            cur = None
            continue
        ch = b['node'].split('/')[1]
        pieces = [b['text']] if b['label'] != 'text' else re.split(r'\n(?=\s*\d{1,2}\s*[-－—–~～]\s*\d{1,2}(?!\s*[-－—–]\s*\d)(?!\d))', b['text'])
        for piece in pieces:
            m = EXERCISE.match(piece) if b['label'] in ('text', 'content') else None
            if m and m[1] == ch:
                cur = {'id': f'{m[1]}-{int(m[2])}', 'chapter': int(ch), 'num': int(m[2]), 'start': b['uid'], 'blocks': [], 'text': []}
                out.append(cur)
            if cur:
                if b['uid'] not in cur['blocks']:
                    cur['blocks'].append(b['uid'])
                if b['label'] in ('text', 'display_formula', 'formula_number', 'table', 'figure_title'):
                    cur['text'].append(piece.strip())
        if cur:
            b['exercise'] = cur['id']
    for x in out:
        x['end'] = x['blocks'][-1]
        x['pdf_pages'] = sorted({int(u.split('-p')[1][:3]) for u in x['blocks']})
        x['text'] = '\n'.join(t for t in x['text'] if t)
        del x['blocks']
    return out


# ---------- report ----------

def report(nodes, blocks, examples, exercises, offset):
    by_ch = {}
    for x in exercises:
        by_ch.setdefault(x['chapter'], []).append(x['num'])
    gaps, dups = [], []
    for ch, nums in sorted(by_ch.items()):
        seen = set()
        for k in nums:
            if k in seen:
                dups.append(f'{ch}-{k}')
            seen.add(k)
        gaps += [f'{ch}-{k}' for k in range(1, max(nums) + 1) if k not in seen]
    empty = [b for b in blocks if b['label'] == 'text' and not b['text'].strip() and not b.get('merged_into') and b['zone'] != 'front']
    merged = sum(bool(b.get('merged_into')) for b in blocks)
    manual = [b for b in blocks if b.get('text_source') == 'manual']
    loose = [n for n in nodes if n['anchor_method'] != 'title_match']
    kinds = {k: sum(n['kind'] == k for n in nodes) for k in ('chapter', 'section', 'subsection', 'exercises', 'appendix')}
    md = [f'# 教材索引构建报告：{BOOK_NAME}', '',
          f'- 来源：`{OCR.name}`（PaddleOCR-VL 1.6，{blocks[-1]["pdf_page"]} 页）',
          f'- 印刷页码 = PDF 页码 − {offset}（所有带页码的页一致）',
          f'- 坐标：144 dpi 渲染像素（每 PDF 点 2 像素），可直接 `pdftoppm -cropbox -r 144` 截图核对',
          f'- 目录节点：' + '，'.join(f'{k} {v}' for k, v in kinds.items()),
          f'- 文本块：{len(blocks)}（正文 {sum(b["zone"] == "body" for b in blocks)}，习题 {sum(b["zone"] == "exercises" for b in blocks)}，'
          f'附录 {sum(b["zone"] == "back" for b in blocks)}，前置 {sum(b["zone"] == "front" for b in blocks)}）',
          f'- 例题：{len(examples)}；习题：{len(exercises)}（' + '，'.join(f'第{c}章 {len(v)}' for c, v in sorted(by_ch.items())) + '）', '',
          '## 需要人工查看', '',
          f'### 未按标题定位的目录节点（{len(loose)}）', '']
    md += [f"- {n['id']} {n['title']}（第 {n['page']} 页，按页首定位）" for n in loose] or ['无']
    md += ['', f'### 习题编号缺口（{len(gaps)}）与重复（{len(dups)}）', '',
           '缺口可能是 OCR 漏识或编号被并入上一题；重复多为正文引用被误判为题首。', '']
    md += [f'- 缺：{", ".join(gaps) or "无"}', f'- 重复：{", ".join(dups) or "无"}']
    md += ['', f'### OCR 内容为空且无处可寻的文本块（{len(empty)}）', '', '原书有字但识别结果为空、同组块里也没有，引用时以原书截图为准。', '']
    md += [f"- {b['uid']}（印刷第 {b['page']} 页，{b['node']}）" for b in empty] or ['无']
    md += ['', '### 说明', '',
           f'- {merged} 个文本块识别为空，但文字已被 OCR 合并进同组的相邻块（`merged_into`），文字不缺；相邻块记了 `extra_bbox`。',
           f'- OCR 完全漏检、按原书截图补录的块（{len(manual)}）：' + ('，'.join(b['uid'] for b in manual) or '无') + '。'
           '补录前已扫描全书各页未被任何块覆盖的竖向空白，其余空白均为标题间距、脚注线或章首页留白。']
    md += ['', '## 例题', '']
    md += [f"- {e['id']}：{e['title']}（PDF {e['pdf_pages'][0]}{'–' + str(e['pdf_pages'][-1]) if len(e['pdf_pages']) > 1 else ''}）" for e in examples]
    return '\n'.join(md) + '\n'


def main():
    pages = load_pages()
    offset = page_offset(pages)
    blocks = flatten(pages, offset)
    nodes = anchor(parse_toc(pages), blocks, offset)
    assign(nodes, blocks)
    examples = find_examples(blocks, nodes)
    exercises = find_exercises(blocks)
    for b in blocks:
        del b['i'], b['group']
    save(OUT / 'toc.json', json.dumps({'book': BOOK, 'name': BOOK_NAME, 'pdf': PDF.name, 'offset': offset,
                                       'nodes': nodes}, ensure_ascii=False, indent=1) + '\n')
    save(OUT / 'blocks.jsonl', ''.join(json.dumps(b, ensure_ascii=False) + '\n' for b in blocks))
    save(OUT / 'examples.json', json.dumps(examples, ensure_ascii=False, indent=1) + '\n')
    save(OUT / 'exercises.json', json.dumps(exercises, ensure_ascii=False, indent=1) + '\n')
    save(OUT / '构建报告.md', report(nodes, blocks, examples, exercises, offset))
    loose = sum(n['anchor_method'] != 'title_match' for n in nodes)
    print(f'nodes {len(nodes)} (page-start anchors {loose}), blocks {len(blocks)}, examples {len(examples)}, exercises {len(exercises)}')


if __name__ == '__main__':
    main()
