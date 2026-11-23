# Chinese–English CAD benchmark pilots: matched evidence and identification limits

**Methods appendix for Prompt-to-Bench PR #4 · 2026-11-24.** This audit reconstructs only quantities justified by the two existing aggregate pilot reports. It does **not** recover absent per-task model outputs, perform any new model executions, or assert a language effect.

## Research question

What can be concluded about English-vs-Chinese model outcomes when paired task budgets are matched, both conditions have zero full task passes, and the published records contain only language-level totals?

The unit of pairing is a **task under a frozen model and seed/budget setup**. The standard exact McNemar test conditions on the number of discordant binary task outcomes, not the 32 individual language-task results treated as independent observations. It is an ordinary pre-existing method, not a new statistical discovery.

## Reanalysis of existing experimental evidence

| Protocol | English full passes | Chinese full passes | First-pass valid render EN | First-pass valid render ZH | Mean best-score difference ZH − EN |
| --- | ---: | ---: | ---: | ---: | ---: |
| Qwen2.5-Coder 7B, 2 repair rounds, 2048 token cap | 0/16 | 0/16 | 0/16 | 1/16 | +0.0170 |
| Qwen2.5 1.5B, first response only, 1024 token cap | 0/16 | 0/16 | 1/16 | 1/16 | −0.0038 |

Sources, frozen configurations and hardware caveats: [7B report](../../bench/reports/zh-standard-qwen25-coder-7b-20261121.md) and [1.5B report](../../bench/reports/zh-firstpass-qwen25-15b-20261121.md). The reports document separate model families and run budgets; results must **not** be pooled.

- **Full-pass comparison:** all 16 task pairs are tied at failure for both models. There are **zero discordant outcomes**, so the conditional exact McNemar/sign-test p-value is **undefined/not informative**, not evidence of equivalence and not p=1.
- **7B render comparison:** EN produced zero valid first-pass renders and ZH produced one, uniquely fixing the contingency table at 0 EN-only and 1 ZH-only. The exact two-sided McNemar p-value is **1.0** (a single discordant trial cannot establish a direction).
- **1.5B render comparison:** each language produced one valid first-pass render, but the published aggregate tables do **not** identify their task IDs. There are two possibilities: they are the same task (zero discordances) or two distinct tasks (one EN-only and one ZH-only). They imply different paired contingency tables. **No actual table can be reconstructed** from marginal totals.
- **Partial scores:** the 7B ZH score is from exactly one rendered candidate passing 3/11 checks, so its 16-task mean is (3/11)/16 = 0.017045. There are no paired per-task score vectors for a variance estimate. The 1.5B −0.0038 is a difference of rounded published means only.
- **Sampling generalization:** the 16 benchmark tasks are fixed, **not an IID sample** of Chinese and English scientific requests. A hypothetical IID two-sided Clopper–Pearson 95% upper bound for 0/16 successes would be 0.205907, but **it is not an inferential confidence bound for these fixed tasks or a guarantee for future labware tasks**.

## Added executable acceptance checks

The new `bench/prompts/paired_inference.py` and `bench/prompts/test_paired_inference.py` form a CPU-only 9-test proof-of-interface for future **actual paired run logs**:

```bash
python -m unittest -v bench.prompts.test_paired_inference
```

The helper demands unique task identifiers, one independently observed Boolean per language and task, and exact paired contingency counts. It rejects malformed or missing evidence; with zero discordances it explicitly returns `None` for the conditional p-value. A test demonstrates that identical marginal render totals can hide different pairings.

To support scientific language-effects analysis in a later experiment, preserve for every task: both language conditions' complete run IDs, individual sample seeds, exact model/hash, system instruction, task/reference hashes, all candidate OpenSCAD files and check receipts, render validity, per-attempt scores, repair budget, timeout and failure reason. Fresh tasks and independently reviewed translations are required for external generalization. Do not claim a translation is human-certified from purely lexical or AI-assisted crosswalk checks.

## Paper positioning

The existing pilot results establish a **runnable multilingual benchmark pipeline**, not a positive/negative language effect. The new work contributes methodological error prevention and a reusable exact paired-analysis interface for subsequent full model studies. Scientific-paper authorship remains subject to the project maintainer's published CRediT process and explicit acceptance.
