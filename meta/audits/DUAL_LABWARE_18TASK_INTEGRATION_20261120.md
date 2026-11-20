# Two independent Prompt-to-Bench contributions: 18-task combined regression

**Date:** 2026-11-20 UTC+8  
**Status:** Combined technical tests passed on an isolated contributor-fork integration branch. Neither upstream PR has been merged by virtue of this evidence.

## Upstream contributions

- [#2 slide registration jig](https://github.com/ATinyGreenCell/prompt-to-bench/pull/2): slide-registration reference, three incorrect mutants, one valid geometric variant, parametric lab design and task specification.
- [#3 microfluidic optical imaging holder](https://github.com/ATinyGreenCell/prompt-to-bench/pull/3): optical window, rail/fiducial design, four incorrect mutants, reference and 17-task harness fixture.

Both PRs add to common files `bench/tasks.yaml`, `bench/reference_stats.json`, `tools/check_designs.py`. They cannot be safely integrated by simply taking the later version of each whole file; this would silently remove the other task.

## Exact verified test run

- Test commit: [605123fc46b857d6ab2d0c1cdd86c67699b31c41](https://github.com/lindicaphxag-tech/prompt-to-bench/commit/605123fc46b857d6ab2d0c1cdd86c67699b31c41)
- [GitHub Actions run #44739255969](https://github.com/lindicaphxag-tech/prompt-to-bench/actions/runs/44739255969): **Completed / Success**
- Job: `136298409504`, **Success**.
- Artifact: `dual-labware-18task-evidence` (GitHub Actions run artifact; contains exact head and test logs).
- Validated 18 distinct task IDs and 18 frozen reference-stat records; specifically both `slide_registration_jig` and `microfluidic_chip_imaging_holder` exactly once.
- Passed the repository-native `bench/test_harness.py` test harness.
- Passed `bench/build_refs.py` including reference symmetry, 3% scaling rejection, cross-task false positives, intentionally broken mutants and valid variants.
- Passed `tools/check_designs.py` with both geometries, hole-slice probes and all parameterized valid/invalid configurations.

## Safe integration recipe for upstream maintainers

1. After merging either upstream PR, cherry-pick or rebase the other PR onto updated upstream `main`.
2. **Preserve both task entries** in `bench/tasks.yaml`; do not replace it with the file from the second branch.
3. **Preserve both frozen volume/reference records** in `bench/reference_stats.json`.
4. **Preserve both** `HOLES` entries and both groups of valid/invalid design-parameter checks in `tools/check_designs.py`.
5. Preserve the task-count-independent regression fixture `len(all_tasks)` in `bench/test_harness.py`.
6. Re-run the complete native three-script suite after each actual upstream merge; if upstream `main` meanwhile changes its original 16 tasks, use a fresh total and compare by IDs, not hardcoded task count.

## Explicit scope

This is a **real 18-task combined build-and-validation proof**, not a peer-review decision, live LLM model performance evaluation, physical 3D print, clinical/biological validation, paper authorship approval or upstream Merge. The upstream paper's corresponding author makes the final authorship decision under its [CONTRIBUTING.md](https://github.com/ATinyGreenCell/prompt-to-bench/blob/main/CONTRIBUTING.md).

AI assistance was used to prepare test integration and this summary. Source PR contributions and their original provenance notes remain separately attributable.
