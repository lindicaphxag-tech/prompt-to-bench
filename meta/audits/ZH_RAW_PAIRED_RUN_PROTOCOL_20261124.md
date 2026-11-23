# Exact-head research method: pair English/Chinese raw CAD agent traces

**Addition to Prompt-to-Bench PR #4 · 2026-11-24.**

## Scientific purpose

Previously reported paired pilots summarize 16 tasks per language but do not publish their individual model attempts and task-level outcome records. Aggregate marginals alone cannot always determine paired contingency tables. This contribution **does not fabricate those missing rows**: the new utility analyzes complete raw files from a future run, and refuses to produce a paired test when the records are missing or incompatible.

New files:

- `bench/prompts/paired_from_runs.py`: standard-library JSONL/metadata ingest + exact paired McNemar statistics, reusing `paired_inference.py`.
- `bench/prompts/test_paired_from_runs.py`: 14 adversarial CPU tests, including missing tasks on one or **both** language sides, duplicates, seed/token/model mismatch, inconsistent reported success flags, invalid Boolean render receipts, stale uncommitted code, repair-budget mismatch and missing sample IDs.
- CI: `.github/workflows/zh-labware-review-validation.yml` now executes both original and raw-run pairing tests.

The utility uses the official Prompt-to-Bench runner's own record fields: `model`, `task`, `sample`, `lang`, `feedback`, `max_repairs`, `attempts`, `first_pass`, `passed` and `attempts_used`; each attempt must include real `render.ok` and `passed` Boolean values. It also reads the runner's `meta_*.json` and requires identical model selection, sampling count, temperature, seed schedule, context/token caps, feedback, system-prompt path, repair budget, thinking setting and clean pinned Git revision. To audit *all* 16 tasks rather than only a matched subset, provide an explicit task-ID inventory. Per-task full-pass and first-render paired tables are independently computed for each indexed sample.

### Reproduction

From the Prompt-to-Bench repository root:

```bash
python -m unittest -v bench.prompts.test_paired_inference bench.prompts.test_paired_from_runs

python -m bench.prompts.paired_from_runs \
  bench/results/en_run/results.jsonl \
  bench/results/zh_run/results.jsonl \
  bench/results/en_run/meta_YYYYMMDD_HHMMSS.json \
  bench/results/zh_run/meta_YYYYMMDD_HHMMSS.json \
  --task-ids bench/reports/paired_original16_task_ids.txt
```

The sample paths are placeholders for **actual future runs**, not files that this PR claims have been generated. The task inventory is a newline-separated text file with every expected task ID, to be frozen **before** interpreting outcomes; `--task-ids` is optional for exploratory matched-subset analysis but mandatory for a **full-16** claim. Do not treat mere clean git hashes as proof of model-weight identity or label integrity; archive independently verified model digests, code, system-prompt hashes, OpenSCAD version, and the actual complete JSONL logs.

## Statistical interpretation

The exact McNemar conditional test uses *paired task discordances*. If the two conditions have zero successful tasks, discordant pairs are zero, and the conditional p-value is **not informative**; this is not an equivalence claim. If each language has one success but the task pairings are unpublished, the contingency table is **not identifiable** from the marginal totals.

This addition hardens the experimental method and makes future bilingual trials independently auditable. It is not a new model performance result; no new real CAD samples, physical prints or user-study outcomes are asserted. The project's corresponding author decides any coauthorship and CRediT role after reviewing substantive contributions.
