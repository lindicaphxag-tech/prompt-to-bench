"""Author-side geometry regression: NOT the official upstream build_refs suite.
Run: python -m unittest meta/authoring/test_slide_registration_jig_geometry.py -v
Requires openscad, numpy, trimesh and shapely.
"""
import subprocess
import tempfile
import unittest
from pathlib import Path
import numpy as np
import trimesh
from shapely.geometry import Polygon

ROOT = Path(__file__).resolve().parents[2]

def render(path):
    with tempfile.NamedTemporaryFile(suffix=".stl",delete=False) as t:
        tmp=Path(t.name)
    try:
        p=subprocess.run(["openscad","-o",str(tmp),str(path)],
                         capture_output=True,text=True,timeout=60)
        if p.returncode: raise RuntimeError(p.stderr)
        return trimesh.load_mesh(tmp)
    finally:
        tmp.unlink(missing_ok=True)

def section(mesh,z):
    sec=mesh.section(plane_origin=[0,0,z],plane_normal=[0,0,1])
    if sec is None: return []
    planar, transform=sec.to_2D()
    return [Polygon(trimesh.transformations.transform_points(
               np.c_[v[:,:2],np.zeros(len(v))],transform)[:,:2])
            for v in planar.discrete]

def evaluate(mesh):
    dims=sorted(mesh.extents[:2])
    checks={
      "bbox": bool(np.allclose(dims,[40,100],atol=.4) and abs(mesh.extents[2]-10)<.4),
      "watertight": bool(mesh.is_watertight and len(mesh.split())==1),
      "volume": bool(abs(mesh.volume-18338.8563)<400),
    }
    loops=section(mesh,2)
    big=[p for p in loops if p.area>1000]
    small=[p for p in loops if 10<p.area<22]
    checks["two_bores"]=len(big)==1 and len(small)==2
    actual=sorted((round(p.centroid.x,1),round(p.centroid.y,1)) for p in small)
    allowed=[sorted([(41,-8),(41,8)]),sorted([(8,41),(-8,41)]),
             sorted([(-41,8),(-41,-8)]),sorted([(-8,-41),(8,-41)])]
    checks["hole_centers"]=bool(len(actual)==2 and any(
        max(np.linalg.norm(np.asarray(actual)-np.asarray(w),axis=1))<.5
        for w in allowed))
    high=section(mesh,6)
    checks["indexing_rails"]=bool(len(high)==1 and abs(high[0].area-411)<1 and mesh.extents[2]>9)
    return checks

class SlideRegistrationJigGeometry(unittest.TestCase):
    def test_reference(self):
        c=evaluate(render(ROOT/"bench/reference/slide_registration_jig.scad"))
        self.assertTrue(all(c.values()),c)

    def test_valid_rotation(self):
        c=evaluate(render(ROOT/"bench/variants/slide_registration_jig__rotated_90.scad"))
        self.assertTrue(all(c.values()),c)

    def test_mutant_shifted_holes(self):
        c=evaluate(render(ROOT/"bench/mutants/slide_registration_jig__shifted_clamp_holes.scad"))
        self.assertFalse(c["hole_centers"],c)

    def test_mutant_rail_height(self):
        c=evaluate(render(ROOT/"bench/mutants/slide_registration_jig__rail_too_short.scad"))
        self.assertFalse(c["bbox"],c)

    def test_mutant_hole_diameter(self):
        c=evaluate(render(ROOT/"bench/mutants/slide_registration_jig__wrong_hole_diameter.scad"))
        self.assertFalse(c["two_bores"],c)

if __name__=="__main__":
    unittest.main()
