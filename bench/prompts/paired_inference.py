"""Exact paired binary comparisons for fixed benchmark tasks (stdlib only).

Does not infer missing per-task model outputs from aggregate paper tables.
Requires one complete independently recorded EN/ZH row per task.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from math import comb
from typing import Iterable, Mapping


@dataclass(frozen=True)
class PairedResult:
    tasks: int
    en_only: int
    zh_only: int
    both: int
    neither: int
    en_pass: int
    zh_pass: int
    zh_minus_en: float
    exact_mcnemar_two_sided_p: float | None

    def as_dict(self) -> dict:
        return asdict(self)


def exact_mcnemar_p(en_only: int, zh_only: int) -> float | None:
    """Conditional exact binomial test; no discordant pairs => no test.

    Not an equivalence test and not a test of generalization beyond the fixed
    benchmark. Counts are paired by task and frozen model/run settings.
    """
    if type(en_only) is not int or type(zh_only) is not int or min(en_only, zh_only) < 0:
        raise ValueError('discordant counts must be nonnegative integers')
    n = en_only + zh_only
    if n == 0:
        return None
    return min(1., 2 * sum(comb(n, j) for j in range(min(en_only, zh_only) + 1)) / 2**n)


def analyze_paired(rows: Iterable[Mapping], *, en_key: str='en_pass', zh_key: str='zh_pass') -> PairedResult:
    """Fail closed on missing or duplicated task records and non-boolean labels."""
    seen = set()
    counts = {'en_only':0, 'zh_only':0, 'both':0, 'neither':0}
    for row in rows:
        if not isinstance(row, Mapping):
            raise ValueError('paired row must be a mapping')
        task = row.get('task_id')
        if not isinstance(task, str) or not task or task in seen:
            raise ValueError('task_id missing or duplicated')
        seen.add(task)
        en, zh = row.get(en_key), row.get(zh_key)
        if type(en) is not bool or type(zh) is not bool:
            raise ValueError('both outcomes must be independently recorded booleans')
        if en and zh:
            counts['both'] += 1
        elif en:
            counts['en_only'] += 1
        elif zh:
            counts['zh_only'] += 1
        else:
            counts['neither'] += 1
    if not seen:
        raise ValueError('paired dataset is empty')
    n = len(seen)
    return PairedResult(n, counts['en_only'], counts['zh_only'], counts['both'],
                        counts['neither'], counts['en_only'] + counts['both'],
                        counts['zh_only'] + counts['both'],
                        (counts['zh_only'] - counts['en_only']) / n,
                        exact_mcnemar_p(counts['en_only'], counts['zh_only']))
