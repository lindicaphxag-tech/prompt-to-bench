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
if __name__=='__main__':unittest.main()
