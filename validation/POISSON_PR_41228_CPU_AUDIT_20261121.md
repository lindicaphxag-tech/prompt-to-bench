# JAX #41228: cross-repo reproducible CPU correctness and latency audit

**Audit date:** 2026-11-21 (Asia/Singapore).
**Upstream target:** https://github.com/jax-ml/jax/pull/41228
**Scope:** numerical correctness and a single-host CPU hot-path timing comparison; *not* upstream Merge, independent peer review or hardware-independent performance ranking.

## Reproduced runtime defect and source-level repair

Original PR version `d4d3b491bff6533e036b6bd720e30d1cfee30b35` failed at runtime:

```
AttributeError: module 'jax._src.lax.lax' has no attribute 'cond'
```

The traceback was recorded in [run #44771308916](https://github.com/lindicaphxag-tech/prompt-to-bench/actions/runs/44771308916) in `jax/_src/random/core.py` inside `_poisson_log_pmf`. Its `lax.cond(...)` access was incorrect; the already imported `lax_control_flow.cond(...)` API is the appropriate JAX internal control-flow function. One-line source fix in the **actual upstream PR head fork**:

https://github.com/lindicaphxag-tech/jax/commit/735b5b1ab8cae36f6a269efa31a75f8107bea67c

## Pinned exact conditions

| Item | Fixed value |
|---|---|
| Upstream base | `d3f12669d7db55596d413eba9cfcd214ae5a3ea4` |
| Fixed PR head | `735b5b1ab8cae36f6a269efa31a75f8107bea67c` |
| jaxlib | `0.12.1`, same installed CPU wheel |
| Python | `3.12` |
| NumPy | `2.5.5` |
| Rate (float32) | 10,000 and 100,000,000 |
| Batch | 8192 |
| Repetitions, final run | **40** per rate per checkout; **327,680** total observed sample values per rate and source version |
| Seed | JAX keys seeded `20261120 + i`, `i=0,...,39` |
| Timing | `perf_counter_ns()`; JIT warm-up outside timer; each call synchronized with `block_until_ready()` |
| Hardware | One GitHub-hosted Ubuntu 24.04 CPU runner, fixed within a run |

[Final 40-repeat run #44772424096 — **Success**](https://github.com/lindicaphxag-tech/prompt-to-bench/actions/runs/44772424096). Artifact `poisson-41228-variance-and-CPU-timing` includes JSON and comparison logs. CI source:
- [benchmark harness](https://github.com/lindicaphxag-tech/prompt-to-bench/blob/validation/jax-poisson-41228-matched-cpu/validation/poisson_41228_repro_benchmark.py)
- [pinned workflow](https://github.com/lindicaphxag-tech/prompt-to-bench/blob/validation/jax-poisson-41228-matched-cpu/.github/workflows/jax-poisson-matched-cpu.yml)

## Measured results — final run

| float32 rate | upstream variance / rate | patched variance / rate | upstream median wall ms/call | patched median wall ms/call | patched / upstream latency |
|---|---:|---:|---:|---:|---:|
| `1e4` | 1.001365 | 1.000924 | 0.639 | 0.635 | 0.994× |
| `1e8` | **1.749059** | **1.001071** | **0.449** | **0.638** | **1.421×** |

**Interpretation.** For this configuration, the patched sampler restores high-rate empirical variance to near the Poisson theoretical value. Large-rate patch latency is about 42% higher on this CPU run. The measurement is specific to an 8192-element shape, Python/JAX versions, GPU-free hardware and exactly 40 calls; no claim of a general performance gain, equivalence over all shapes, or full upstream JAX CI follows from it.

Independent, shorter successful [4-repeat run #44771842053](https://github.com/lindicaphxag-tech/prompt-to-bench/actions/runs/44771842053) gave high-rate variance ratios 1.752171 (base) vs 0.996902 (patch), patched/base time 1.517×. Together these establish repeatable correctness gains but not a statistically characterized latency distribution across machines.

## Reviewer-facing action

The reviewer previously requested benchmarking inside the rejection sampler loop. This audit supplies that evidence while preserving the negative performance finding. Further optimization should target per-sample log-PMF overhead without weakening far-tail accuracy or gradient/finiteness guards; include a matching CPU and, where available, GPU measurement before claiming regression recovery.

This report is hosted independently of the JAX pull request to keep the patch small. An attempt to post a single evidence-only PR comment through the available GitHub integration returned **HTTP 403 Resource not accessible by integration**; no comment was created and the reviewer has **not** been notified through this tool. The exact PR head is still open pending the maintainer's requested changes.

Contributor: Zhibo Zhang, Hangzhou Dianzi University. AI assistance supported audit prose and CI implementation; source SHA, executed numerical results, and failures are preserved without alteration.
