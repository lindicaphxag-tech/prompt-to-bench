# Three independent submissions: exact-head combined integration proof

**Date:** 2026-11-20. **Status:** Fork-level integration run fully **Success**. **No upstream merge or paper authorship is claimed.**

## Contributions

- [Upstream #2](https://github.com/ATinyGreenCell/prompt-to-bench/pull/2) slide registration jig and numeric CAD correctness task.
- [Upstream #3](https://github.com/ATinyGreenCell/prompt-to-bench/pull/3) microfluidic chip imaging holder and adversarial geometry cases.
- [Upstream #4](https://github.com/ATinyGreenCell/prompt-to-bench/pull/4) opt-in Simplified Chinese translations of the **original 16** benchmark tasks plus testable lexical/numeric preservation.

### Reproducible exact-head run

- Code commit: [651fad95a2987b9b3e0b8b4d52fb56e1b87130b7](https://github.com/lindicaphxag-tech/prompt-to-bench/commit/651fad95a2987b9b3e0b8b4d52fb56e1b87130b7)
- [GitHub Actions run #44741030314](https://github.com/lindicaphxag-tech/prompt-to-bench/actions/runs/44741030314): **Completed / Success**.
- Artifact: `tri-18task-zh-integration-logs`, with manifest, validation and geometry/test/design outputs plus exact commit.
- All steps passed: install, 18-task manifest + 18 frozen reference-stat checks, explicit 16-task Chinese-subset distinction, 7 Chinese validator/unit and opt-in Bash dispatch checks (unit count depends on the referenced test version), the full 18-task `bench/test_harness.py`, geometric `bench/build_refs.py` reference + cross-task/mutant/symmetry/scale checks and `tools/check_designs.py` parametric validations.

### Non-conflation is mandatory

The two newer labware tasks **do not** yet have Chinese translations in this proof; the 16-task Chinese lexical audit must not be described as 18/18 Chinese benchmark coverage, a real-model language result, or independent semantic equivalence. An opt-in Chinese model run selecting either newer task is unsupported until an independently reviewed translation exists.

The independent fork proof does not replace maintainer human review or scientific contributions that qualify the human author for the *next tagged living paper*. No paid services or physical site visit were required for this computational integration.

## Upstream merge recipe

When PR #2 or #3 merges, ensure both task entries persist in `bench/tasks.yaml`, both frozen records persist in `bench/reference_stats.json`, and both hole probes and parametric cases persist in `tools/check_designs.py`. Pull #4's localization data/validator without altering the prior `es hi sw` default language dispatch. Keep default benchmark figures unchanged, and require bilingual domain review before claiming semantic equivalence or comparable language-model performance. After rebasing, rerun this entire CI on the newly computed branch head.

**Author-credit policy:** https://github.com/ATinyGreenCell/prompt-to-bench/blob/main/CONTRIBUTING.md ; final CRediT and author byline decision rests with the corresponding author.
