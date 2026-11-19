# Author-side candidate (not yet included in bench/tasks.yaml)

This proposed task has been independently rendered with OpenSCAD and passed 5/5
author-side geometry regression tests (one valid reference, one valid 90-degree
rotation, three invalid mutants). It has not yet passed the complete official
bench/build_refs.py cross-task and mutation suite. Do not submit upstream as
final until that validation succeeds.

Proposed YAML entry:

```yaml
- id: slide_registration_jig
  category: benchware
  title: Microscope slide registration jig with clamp holes
  short: slide jig
  reference: bench/reference/slide_registration_jig.scad
  library: designs/benchware/slide_registration_jig.scad
  skills: [perpendicular indexing rails, asymmetric mounting holes, through holes]
  prompt: >-
    Create a reusable 3-D printable microscope slide registration jig. In print
    orientation, a flat solid base is 100 mm along X, 40 mm along Y and 4 mm high,
    centred at the XY origin and resting on z=0. Add two perpendicular solid
    registration rails on TOP of the base, each reaching z=10: one rail is 3 mm
    thick in Y and extends the full 100 mm length along the NEGATIVE-Y edge;
    the other is 3 mm thick in X and extends the full 40 mm width along the
    NEGATIVE-X edge. The rails meet to form a single L-shaped registration edge
    for repeatably locating a standard 75 by 25 mm microscope slide.
    Drill two circular 4.5 mm-diameter mounting through-holes ONLY through the
    base: their centres are at (41,-8) mm and (41,+8) mm measured from the
    base's XY centre. Keep both bores fully open from z=0 through z=4.
    All dimensions are millimetres and the whole design is a single printable body.
  checks:
    - bbox: {size: [100, 40, 10], tol: 0.4}
    - bodies: 1
    - watertight: true
    - slice: {z: 2, islands: 1, holes: 2, hole_d: [4.5, 0.35],
              hole_centers: [[41, -8], [41, 8]], tol: 0.4}
    - slice: {z: 6, islands: 1, holes: 0}
    - probes: {solid: [[-48, 0, 6], [0, -18, 6], [0, 0, 2]],
               empty: [[0, 0, 6], [41, 8, 2], [41, -8, 2], [0, 18, 6], [48, 0, 6]]}
    - volume: {rel_tol: 0.03}
```

# Before upstream PR
- Integrate this entry into the existing task set rather than committing a separate root YAML.
- Add a library/design version only if useful.
- Run bench/build_refs.py --write and full build_refs, harness, reference/variant/mutant, 3% scaling, and cross-task checks on the actual upstream project checkout.
- Retain accurate AI disclosure, license and attribution.
- No 3-D print or real slide fit is claimed.
