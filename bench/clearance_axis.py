"""Exact candidate-set broad phase for inclusive, pre-inflated AABBs."""
import numpy as np


def candidate_pairs(alo, ahi, blo, bhi, stats=None):
    """Choose the cheapest of six oriented prefix scans; return (a,b) IDs.

    Global disjointness is checked before sorting. Cost is the exact number
    of prefix entries examined, not an estimate of triangle intersections.
    Inclusive contact semantics match the original broad phase.
    """
    if not len(alo) or not len(blo):
        return
    if np.any(ahi.max(axis=0) < blo.min(axis=0)) or np.any(bhi.max(axis=0) < alo.min(axis=0)):
        if stats is not None: stats.update(prefix_candidates=0, root_rejected=True)
        return
    best = None
    for flip, (lo, hi, other_lo, other_hi) in enumerate(((alo, ahi, blo, bhi), (blo, bhi, alo, ahi))):
        for axis in range(3):
            order = np.argsort(other_lo[:, axis], kind='stable')
            ends = np.searchsorted(other_lo[order, axis], hi[:, axis], side='right')
            # Include the number of outer iterations: for a highly asymmetric
            # pair, scanning many empty prefixes is not free.
            key = (int(ends.sum()) + len(ends), flip, axis)
            if best is None or key < best[0]:
                best = (key, flip, axis, order, ends, lo, hi, other_lo, other_hi)
    _, flip, axis, order, ends, lo, hi, other_lo, other_hi = best
    u, v = (axis+1)%3, (axis+2)%3
    if stats is not None: stats.update(prefix_candidates=int(ends.sum()), root_rejected=False)
    for k in np.flatnonzero(ends):
        candidates = order[:ends[k]]
        mask = ((other_hi[candidates, axis] >= lo[k, axis]) &
                (other_hi[candidates, u] >= lo[k, u]) &
                (other_lo[candidates, u] <= hi[k, u]) &
                (other_hi[candidates, v] >= lo[k, v]) &
                (other_lo[candidates, v] <= hi[k, v]))
        for q in candidates[mask]:
            yield (int(q), int(k)) if flip else (int(k), int(q))
