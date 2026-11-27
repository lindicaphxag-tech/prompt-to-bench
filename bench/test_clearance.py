import unittest
import numpy as np
import trimesh
from shapely.geometry import box, Point, Polygon
from shapely.affinity import rotate, translate
from clearance import clearance, clip

class ClearanceTests(unittest.TestCase):
    def setUp(self): self.m=trimesh.creation.box(extents=[2,2,2])
    def test_entire_prism_inside_solid(self):
        self.assertFalse(clearance(self.m,box(-.2,-.2,.2,.2),-.2,.2)[0])
    def test_empty_prism_outside(self):
        self.assertTrue(clearance(self.m,box(2,2,3,3),-.2,.2)[0])
    def test_surface_crossing(self):
        self.assertFalse(clearance(self.m,box(.9,-.2,1.1,.2),-.2,.2)[0])
    def test_no_intersection_when_z_disjoint(self):
        self.assertTrue(clearance(self.m,box(-.2,-.2,.2,.2),2,3)[0])
    def test_rotated_translated_geometry(self):
        for angle in (17,90,133):
            m=self.m.copy();m.apply_transform(trimesh.transformations.rotation_matrix(np.deg2rad(angle),[0,0,1]));m.apply_translation([3,5,7]);
            for p,expected in [(box(.9,-.2,1.1,.2),False),(box(2,2,3,3),True)]:
                self.assertEqual(clearance(m,translate(rotate(p,angle,origin=(0,0)),3,5),6.8,7.2)[0],expected)
    def test_open_mesh_rejected(self):
        m=self.m.copy();m.update_faces(np.arange(len(m.faces)-1));self.assertFalse(clearance(m,box(2,2,3,3),0,1)[0])
    def test_bad_prism(self):
        for p,z0,z1 in [(Point(0,0),0,1),(box(0,0,1,1),1,0),(Polygon([(0,0),(2,0),(1,1),(2,2),(0,2)]),0,1)]:
            with self.assertRaises(ValueError):clearance(self.m,p,z0,z1)
    def test_clip_crossing_triangle(self):
        a=np.array([[0,0,-1],[2,0,1],[0,2,1]],float);p=clip(a,0,True);self.assertEqual(len(p),4);self.assertTrue(np.all(p[:,2]>=0));self.assertEqual(np.count_nonzero(p[:,2]==0),2)
    def test_contact_is_conservatively_rejected(self):
        self.assertFalse(clearance(self.m,box(1,-.2,1.2,.2),-.2,.2)[0])

    def test_overlapping_opposite_shells_cannot_cancel_winding(self):
        outer = trimesh.creation.box(extents=[4, 4, 4])
        overlap = trimesh.creation.box(extents=[3, 3, 3])
        overlap.apply_translation([0.5, 0, 0])
        overlap.invert()
        mesh = trimesh.util.concatenate([outer, overlap])
        self.assertTrue(mesh.is_watertight and mesh.is_winding_consistent)
        ok, reason = clearance(mesh, box(0.1, 0.1, 0.2, 0.2), -0.2, 0.2)
        self.assertFalse(ok)
        self.assertIn('intersecting disconnected', reason)

    def test_nested_reverse_shell_preserves_cavity(self):
        outer = trimesh.creation.box(extents=[4, 4, 4])
        cavity = trimesh.creation.box(extents=[1, 1, 1])
        cavity.invert()
        mesh = trimesh.util.concatenate([outer, cavity])
        self.assertTrue(mesh.is_watertight and mesh.is_winding_consistent)
        self.assertTrue(clearance(mesh, box(-0.2, -0.2, 0.2, 0.2), -0.2, 0.2)[0])

    def test_disjoint_reverse_shells_do_not_create_false_collision(self):
        left = trimesh.creation.box(extents=[2, 2, 2])
        right = trimesh.creation.box(extents=[1, 1, 1])
        right.apply_translation([10, 0, 0])
        right.invert()
        mesh = trimesh.util.concatenate([left, right])
        self.assertTrue(clearance(mesh, box(4, 4, 5, 5), -0.2, 0.2)[0])

    def test_tangent_disconnected_components_fail_closed(self):
        left = trimesh.creation.box(extents=[2, 2, 2])
        right = trimesh.creation.box(extents=[2, 2, 2])
        right.apply_translation([2, 0, 0])
        mesh = trimesh.util.concatenate([left, right])
        ok, reason = clearance(mesh, box(4, 4, 5, 5), -0.2, 0.2)
        self.assertFalse(ok)
        self.assertIn('intersecting disconnected', reason)



class AdaptiveAxisTests(unittest.TestCase):
    @staticmethod
    def brute(alo, ahi, blo, bhi):
        mask = ((ahi[:, None, :] >= blo[None, :, :]) &
                (bhi[None, :, :] >= alo[:, None, :])).all(axis=2)
        return set(map(tuple, np.argwhere(mask)))

    def test_random_exact_pairs(self):
        from clearance_axis import candidate_pairs
        rng = np.random.default_rng(20261128)
        for _ in range(600):
            a = rng.uniform(-10, 10, (rng.integers(1, 70), 3))
            b = rng.uniform(-10, 10, (rng.integers(1, 70), 3))
            c, d = a + rng.uniform(0, 5, a.shape), b + rng.uniform(0, 5, b.shape)
            got = list(candidate_pairs(a,c,b,d))
            self.assertEqual(set(got), self.brute(a,c,b,d))
            self.assertEqual(len(got), len(set(got)))

    def test_touching_and_zero_volume(self):
        from clearance_axis import candidate_pairs
        a=np.array([[0,0,0],[1,1,1]],float); b=a+1
        c=np.array([[1,1,1],[2,2,2]],float)
        self.assertEqual(set(candidate_pairs(a,b,c,c)), self.brute(a,b,c,c))

    def test_disjoint_only_in_y(self):
        from clearance_axis import candidate_pairs
        a=np.zeros((100,3)); b=a+1; c=a.copy(); c[:,1]+=10
        stats={}
        self.assertEqual(list(candidate_pairs(a,b,c,c+1,stats)),[])
        self.assertEqual(stats,{'prefix_candidates':0,'root_rejected':True})

    def test_empty(self):
        from clearance_axis import candidate_pairs
        a=np.empty((0,3)); b=np.zeros((1,3))
        self.assertEqual(list(candidate_pairs(a,a,b,b)),[])
        self.assertEqual(list(candidate_pairs(b,b,a,a)),[])

if __name__=='__main__':unittest.main()
