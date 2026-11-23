"""Exact paired EN/ZH analysis from Prompt-to-Bench raw JSONL + frozen metadata.

Refuses invented pairings, mismatched budgets, incomplete run samples, stale
records, and invalid attempt receipts. Only paired observations can be tested.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from typing import Iterable
from .paired_inference import analyze_paired
from .run_provenance import audit_protocols

FROZEN = ('models', 'samples', 'feedback', 'max_repairs', 'temperature',
          'seed_base', 'num_ctx', 'num_predict', 'think', 'system')


def _sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _meta(path, lang):
    data = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(data, dict) or not isinstance(data.get('args'), dict):
        raise ValueError('metadata requires an args object')
    args = data['args']
    if args.get('lang') != lang or any(k not in args for k in FROZEN):
        raise ValueError('language or frozen experimental configuration missing')
    commit = data.get('git_commit')
    if not isinstance(commit, str) or not commit or '+uncommitted' in commit:
        raise ValueError('must use a clean pinned benchmark revision')
    return data


def _records(path, lang, model):
    result = {}
    lines = path.read_text(encoding='utf-8').splitlines()
    if not lines:
        raise ValueError('empty model-run JSONL')
    for number, line in enumerate(lines, 1):
        try:
            row = json.loads(line)
        except ValueError as error:
            raise ValueError(f'invalid line {number}') from error
        if not isinstance(row, dict) or row.get('lang') != lang or row.get('model') != model:
            raise ValueError('row language/model differs from metadata')
        task, sample = row.get('task'), row.get('sample')
        if not isinstance(task, str) or not task or type(sample) is not int or sample < 0:
            raise ValueError('invalid task/sample identity')
        key = (task, sample)
        if key in result:
            raise ValueError('duplicate completed task/sample')
        if row.get('needs_rerun'):
            raise ValueError('stale record marked for rerun')
        attempts = row.get('attempts')
        if not isinstance(attempts, list) or not attempts:
            raise ValueError('missing attempt records')
        if any(not isinstance(a, dict) for a in attempts):
            raise ValueError('invalid attempt entry')
        if (any(type(a.get('passed')) is not bool or
                not isinstance(a.get('render'), dict) or
                type(a['render'].get('ok')) is not bool for a in attempts)):
            raise ValueError('attempt booleans missing or malformed')
        if row.get('attempts_used') != len(attempts):
            raise ValueError('attempt count mismatch')
        if type(row.get('passed')) is not bool or type(row.get('first_pass')) is not bool:
            raise ValueError('invalid task outcome flags')
        if (row['passed'] != any(a['passed'] for a in attempts) or
                row['first_pass'] != attempts[0]['passed']):
            raise ValueError('outcome flags contradict underlying attempts')
        if type(row.get('max_repairs')) is not int or row['max_repairs'] < 0:
            raise ValueError('invalid repair budget')
        if len(attempts) > 1 + row['max_repairs']:
            raise ValueError('attempts exceed allowed repair budget')
        result[key] = row
    return result


def analyze_raw(en_log: str | Path, zh_log: str | Path,
                en_meta: str | Path, zh_meta: str | Path,
                *, expected_task_ids: Iterable[str] | None = None,
                require_bound: bool = False) -> dict:
    paths = [Path(p) for p in (en_log, zh_log, en_meta, zh_meta)]
    em, zm = _meta(paths[2], 'en'), _meta(paths[3], 'zh')
    ea, za = em['args'], zm['args']
    if any(ea[k] != za[k] for k in FROZEN):
        raise ValueError('unmatched model, temperature, seed or budget')
    if em['git_commit'] != zm['git_commit']:
        raise ValueError('EN/ZH benchmark source revision differs')
    models = ea['models']
    if not isinstance(models, list) or len(models) != 1 or not isinstance(models[0], str):
        raise ValueError('exactly one model is required')
    en, zh = _records(paths[0], 'en', models[0]), _records(paths[1], 'zh', models[0])
    if set(en) != set(zh):
        raise ValueError('missing EN/ZH task/sample pair')
    provenance = audit_protocols(em, zm, list(en.values()), list(zh.values()),
                                 require_bound=require_bound)
    tasks = {task for task, sample in en}
    if expected_task_ids is not None:
        exp = tuple(expected_task_ids)
        if not exp or len(set(exp)) != len(exp) or set(exp) != tasks:
            raise ValueError('incomplete declared benchmark task set')
    if type(ea['samples']) is not int or ea['samples'] < 1 or len(en) != ea['samples'] * len(tasks):
        raise ValueError('incomplete sample coverage')
    paired = {}
    for (task, sample), er in sorted(en.items()):
        zr = zh[(task, sample)]
        if er.get('max_repairs') != ea['max_repairs'] or zr.get('max_repairs') != ea['max_repairs']:
            raise ValueError('row repair budget differs from metadata')
        if er.get('feedback') != ea['feedback'] or zr.get('feedback') != ea['feedback']:
            raise ValueError('feedback mode differs from metadata')
        paired.setdefault(sample, []).append({
            'task_id': task,
            'en_pass': er['passed'], 'zh_pass': zr['passed'],
            'en_render': er['attempts'][0]['render']['ok'],
            'zh_render': zr['attempts'][0]['render']['ok']
        })
    if set(paired) != set(range(ea['samples'])):
        raise ValueError('missing indexed samples')
    result = {}
    for sample, rows in sorted(paired.items()):
        result[str(sample)] = {
            'full_pass': analyze_paired(rows).as_dict(),
            'first_render': analyze_paired(rows, en_key='en_render',
                                           zh_key='zh_render').as_dict()
        }
    return {
        'inputs_sha256': dict(zip(('en_log','zh_log','en_meta','zh_meta'), map(_sha, paths))),
        'model': models[0], 'git_commit': em['git_commit'],
        'task_count': len(tasks), 'sample_count': ea['samples'],
        'declared_task_set_verified': expected_task_ids is not None,
        'run_provenance': provenance,
        'paired_results': result,
        'scope': 'Actual per-task receipts only; not a test of equivalence or population generalization.'
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('en_log','zh_log','en_meta','zh_meta'):
        parser.add_argument(name)
    parser.add_argument('--task-ids', help='Newline-separated expected task IDs')
    parser.add_argument('--require-bound', action='store_true',
                        help='Reject legacy runs without per-row protocol fingerprints')
    a = parser.parse_args()
    ids = Path(a.task_ids).read_text(encoding='utf-8').splitlines() if a.task_ids else None
    print(json.dumps(analyze_raw(a.en_log,a.zh_log,a.en_meta,a.zh_meta,
                                 expected_task_ids=ids, require_bound=a.require_bound), indent=2))


if __name__ == '__main__':
    main()
