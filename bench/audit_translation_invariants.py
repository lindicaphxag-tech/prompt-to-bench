#!/usr/bin/env python3
"""Audit technical invariants in translated Prompt-to-Bench task descriptions.

This intentionally does not certify the semantics of a translation: numeric and
signed-axis checks detect regressions but cannot replace a technical review.
"""
from __future__ import annotations

import argparse
from collections import Counter
from decimal import Decimal
from pathlib import Path
import re
import sys

import yaml

NUMBER_RE = re.compile(r"(?<![A-Za-z0-9_.])([+-]?(?:\d+(?:\.\d+)?|\.\d+))(?![A-Za-z0-9_.])")
DIRECTION_RE = re.compile(r"(?<![a-zA-Z0-9])([+-][XYZ])(?![a-zA-Z0-9])")


def number_counts(text: str) -> Counter[str]:
    return Counter(str(Decimal(n).normalize()) for n in NUMBER_RE.findall(text))


def direction_counts(text: str) -> Counter[str]:
    return Counter(DIRECTION_RE.findall(text))


def audit(task_file: Path, translations_file: Path, language: str = "zh") -> list[str]:
    tasks = yaml.safe_load(task_file.read_text(encoding="utf-8"))
    translations = yaml.safe_load(translations_file.read_text(encoding="utf-8"))
    errors = []
    if not isinstance(tasks, list):
        return ["tasks.yaml must contain a list of tasks"]
    if not isinstance(translations, dict) or not isinstance(translations.get(language), dict):
        return [f"translations.yaml lacks language mapping: {language}"]
    expected = {}
    for item in tasks:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            errors.append("task without an id")
            continue
        if item["id"] in expected:
            errors.append(f"duplicate source task ID: {item['id']}")
        expected[item["id"]] = item.get("prompt", "")
    actual = translations[language]
    for task_id in sorted(set(expected) - set(actual)):
        errors.append(f"missing {language} translation: {task_id}")
    for task_id in sorted(set(actual) - set(expected)):
        errors.append(f"unknown translated task ID: {task_id}")
    for task_id in sorted(set(expected) & set(actual)):
        en, target = expected[task_id], actual[task_id]
        if not isinstance(en, str) or not isinstance(target, str) or not target.strip():
            errors.append(f"invalid/empty prompt: {task_id}")
            continue
        if number_counts(en) != number_counts(target):
            a, b = number_counts(en), number_counts(target)
            errors.append(f"{task_id}: numeric changes: missing={dict(a - b)} extra={dict(b - a)}")
        if direction_counts(en) != direction_counts(target):
            a, b = direction_counts(en), direction_counts(target)
            errors.append(f"{task_id}: axis directions changed: missing={dict(a - b)} extra={dict(b - a)}")
        if "mm" in en and "mm" not in target:
            errors.append(f"{task_id}: millimetre unit missing from translation")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tasks", type=Path, default=Path("bench/tasks.yaml"))
    parser.add_argument("--translations", type=Path, default=Path("bench/prompts/translations.yaml"))
    parser.add_argument("--language", default="zh")
    args = parser.parse_args()
    errors = audit(args.tasks, args.translations, args.language)
    if errors:
        print("\n".join(f"FAIL: {error}" for error in errors), file=sys.stderr)
        return 1
    translated = yaml.safe_load(args.translations.read_text(encoding="utf-8"))[args.language]
    print(f"PASS: {len(translated)} {args.language} task prompts preserve the audited numeric/axis invariants")
    print("Note: language and physical-geometry meaning require expert review.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
