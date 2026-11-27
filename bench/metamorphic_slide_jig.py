#!/usr/bin/env python3
"""Independent OpenSCAD mesh audit of all six slide-jig physical mutants.

Uses rendered CGAL meshes and Shapely sections, never Prompt-to-Bench checker
functions. Deterministic geometry controls, not fabrication or fit evidence.
"""
from pathlib import Path
import math
import subprocess
import tempfile

import trimesh
from shapely.geometry import Polygon

ROOT = Path(__file__).resolve().parent.parent
CASES = (
    ('reference', 'reference/slide_registration_jig.scad', True),
    ('blind_bottom_skin', 'mutants/slide_registration_jig__blind_bottom_skin.scad', False),
    ('rail_too_thin', 'mutants/slide_registration_jig__rail_too_thin.scad', False),
    ('rail_too_wide', 'mutants/slide_registration_jig__rail_too_wide.scad', False),
    ('rail_too_short', 'mutants/slide_registration_jig__rail_too_short.scad', False),
    ('shifted_clamp_holes', 'mutants/slide_registration_jig__shifted_clamp_holes.scad', False),
    ('wrong_hole_diameter', 'mutants/slide_registration_jig__wrong_hole_diameter.scad', False),
)
EXPECTED_CENTRES = ((41.0, -8.0), (41.0, 8.0))


def measure(input_file, out_stl):
    r = subprocess.run(['openscad', '-o', str(out_stl), str(input_file)],
                       capture_output=True, text=True, timeout=90, check=False)
    if r.returncode:
        raise RuntimeError(f'{input_file.name}: {r.stderr[-900:]}')
    mesh = trimesh.load(out_stl, force='mesh')
    if not mesh.is_watertight or mesh.is_empty:
        raise AssertionError(f'{input_file.name}: invalid watertight mesh')

    def polygons_at(z):
        s = mesh.section(plane_origin=[0., 0., z],
                         plane_normal=[0., 0., 1.])
        if s is None:
            raise AssertionError(f'missing z={z} cross-section')
        return sorted((Polygon(loop[:, :2]) for loop in s.discrete),
                      key=lambda p: p.area, reverse=True)

    low = polygons_at(0.15)
    mid = polygons_at(2.0)
    rail = polygons_at(5.5)
    holes = mid[1:]
    centres = sorted((float(p.centroid.x), float(p.centroid.y)) for p in holes)
    diameters = sorted(2.0 * math.sqrt(float(p.area) / math.pi) for p in holes)
    return dict(volume=float(mesh.volume), height=float(mesh.extents[2]),
                low_holes=len(low) - 1, mid_holes=len(holes),
                hole_centres=centres, hole_diameters=diameters,
                rail_area=float(rail[0].area))


def close_points(got, expected, tol=0.25):
    if len(got) != len(expected):
        return False
    remaining = list(expected)
    for point in got:
        candidates = [(math.dist(point, want), i) for i, want in enumerate(remaining)]
        if not candidates:
            return False
        distance, index = min(candidates)
        if distance > tol:
            return False
        remaining.pop(index)
    return not remaining


def main():
    with tempfile.TemporaryDirectory(prefix='slide-jig-metamorphic-') as temp:
        measured = {label: measure(ROOT / 'bench' / rel, Path(temp) / f'{label}.stl')
                    for label, rel, _ in CASES}
    base = measured['reference']
    for label, _, correct in CASES:
        m = measured[label]
        # These three controls were designed to pass the previous coarse
        # volume/height/mid-slice checks; keep that historical claim explicit.
        old_coarse = (abs(m['volume'] / base['volume'] - 1) <= 0.03
                      and m['mid_holes'] == 2 and abs(m['height'] - 10) <= 0.4)
        if label in {'blind_bottom_skin', 'rail_too_thin', 'rail_too_wide'}:
            assert old_coarse, f'{label}: old coarse-criteria premise violated'
        geometry_ok = (
            m['low_holes'] == 2 and m['mid_holes'] == 2
            and close_points(m['hole_centres'], EXPECTED_CENTRES)
            and len(m['hole_diameters']) == 2
            and all(abs(d - 4.5) <= 0.2 for d in m['hole_diameters'])
            and abs(m['rail_area'] - 411.0) <= 8.0
            and abs(m['height'] - 10.0) <= 0.4
        )
        assert geometry_ok is correct, f'{label}: independent red/green failure: {m}'
        print(f"{label}: volume={m['volume']:.3f} mm3, low={m['low_holes']}, "
              f"mid={m['mid_holes']}, centres={m['hole_centres']}, "
              f"diameters={m['hole_diameters']}, rail_area={m['rail_area']:.2f} mm2")
    print('PASS: reference accepted; all six targeted physical mutants rejected')


if __name__ == '__main__':
    main()
