"""Bind benchmark rows to the actual invocation metadata (not a signature)."""
import hashlib
import json

SCHEMA = 'ptb-run-protocol-v1'
COMMON_INPUTS = ('task_source_sha256', 'reference_sha256', 'system_sha256', 'task_ids')


def digest(value):
    payload = json.dumps(value, sort_keys=True, separators=(',', ':'),
                         ensure_ascii=True, allow_nan=False).encode('ascii')
    return hashlib.sha256(payload).hexdigest()


def text_digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def bind_metadata(meta, *, task_source_sha256, reference_sha256, system, prompts):
    """Snapshot effective prompts and common input files before any new row."""
    meta['protocol'] = {
        'schema': SCHEMA, 'task_source_sha256': task_source_sha256,
        'reference_sha256': reference_sha256, 'system_sha256': text_digest(system),
        'task_ids': sorted(prompts),
        'prompt_sha256': {k: text_digest(v) for k, v in prompts.items()},
    }
    meta['protocol_sha256'] = protocol_digest(meta)
    return meta['protocol_sha256']


def protocol_digest(meta):
    """Exclude invocation timestamp; include all effective args and known runtime."""
    protocol = meta.get('protocol')
    if not isinstance(protocol, dict) or protocol.get('schema') != SCHEMA:
        raise ValueError('missing or unknown run protocol')
    return digest({'protocol': protocol, 'args': meta['args'],
                   'git_commit': meta['git_commit'],
                   'runtime': {k: meta.get(k) for k in ('host', 'cpu', 'python', 'openscad', 'ollama')}})


def audit_protocols(en_meta, zh_meta, en_rows, zh_rows, *, require_bound=False):
    """Reject mixed invocation rows; label old unbound logs exploratory only."""
    sides = ((en_meta, en_rows), (zh_meta, zh_rows))
    if all('protocol_sha256' not in m and all('protocol_sha256' not in r for r in rows)
           for m, rows in sides):
        if require_bound:
            raise ValueError('legacy records lack per-row protocol binding')
        return 'LEGACY_UNBOUND'
    for meta, rows in sides:
        expected = protocol_digest(meta)
        if meta.get('protocol_sha256') != expected:
            raise ValueError('metadata protocol digest mismatch')
        if any(r.get('protocol_sha256') != expected for r in rows):
            raise ValueError('row protocol digest mismatch; mixed or unbound invocation')
        actual_tasks = sorted({r['task'] for r in rows})
        if meta['protocol'].get('task_ids') != actual_tasks:
            raise ValueError('protocol task inventory differs from observed rows')
        hashes = meta['protocol'].get('prompt_sha256')
        if not isinstance(hashes, dict) or set(hashes) != set(actual_tasks):
            raise ValueError('protocol prompt inventory incomplete')
    if any(en_meta['protocol'].get(k) != zh_meta['protocol'].get(k) for k in COMMON_INPUTS):
        raise ValueError('common task, reference or system input differs')
    if ('render_timeout' not in en_meta['args'] or 'render_timeout' not in zh_meta['args']
            or en_meta['args']['render_timeout'] != zh_meta['args']['render_timeout']):
        raise ValueError('renderer time budget differs')
    for k in ('python', 'openscad', 'ollama'):
        if en_meta.get(k) != zh_meta.get(k):
            raise ValueError('recorded runtime version differs: ' + k)
    return 'ROW_BOUND'
