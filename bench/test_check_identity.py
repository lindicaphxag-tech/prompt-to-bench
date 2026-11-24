"""Regression tests for check-instance identity, independent of geometry.
Run from upstream root: python -m unittest discover -s bench -p test_check_identity.py
"""
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import numpy as np
import checks


class CheckIdentityTests(unittest.TestCase):
    def evaluate(self, items, transforms=((0, False), (90, False))):
        mesh=SimpleNamespace(faces=[0], bounds=np.array([[0,0,0],[1,1,1]]), is_watertight=True, volume=1.)
        with (patch.object(checks, 'normalise', side_effect=lambda x:x),
              patch.object(checks, 'split_bodies', return_value=[mesh]),
              patch.object(checks, 'Slices', return_value=None),
              patch.object(checks, 'build_items', return_value=items),
              patch.object(checks, 'TRANSFORMS', transforms)):
            return checks.evaluate(mesh, {}, {})

    def test_earlier_dependent_failure_not_overwritten(self):
        a=self.evaluate([('line z=3',lambda *a:(False,'bad window'),True),('line z=3',lambda *a:(True,'good bore'),True)])
        self.assertFalse(a['passed']);self.assertEqual(a['n_ok'],1)
        self.assertEqual([x['msg'] for x in a['items']],['bad window','good bore'])

    def test_fixed_duplicate_names(self):
        a=self.evaluate([('slice z=3 holes',lambda *a:(False,'first'),False),('slice z=3 holes',lambda *a:(True,'second'),False)])
        self.assertFalse(a['passed']);self.assertEqual(a['n_ok'],1)

    def test_fixed_dependent_name_collision(self):
        a=self.evaluate([('shared',lambda *a:(False,'fixed'),False),('shared',lambda *a:(True,'dependent'),True)])
        self.assertFalse(a['passed']);self.assertEqual(a['n_ok'],1)

    def test_transform_selected_by_all_instances(self):
        a=self.evaluate([('line z=3',lambda c,k,m:(k==90,'window'),True),('line z=3',lambda c,k,m:(True,'bore'),True)])
        self.assertTrue(a['passed']);self.assertEqual(a['transform']['rot_deg'],90)

    def test_exception_not_hidden(self):
        def fail(*a):raise RuntimeError('broken check')
        a=self.evaluate([('same',fail,True),('same',lambda *a:(True,'ok'),True)])
        self.assertFalse(a['passed']);self.assertIn('broken check',a['items'][0]['msg'])

    def test_all_valid_duplicates_counted(self):
        a=self.evaluate([('same',lambda *a:(True,'one'),True),('same',lambda *a:(True,'two'),True)])
        self.assertTrue(a['passed']);self.assertEqual(a['n'],2);self.assertEqual(a['n_ok'],2)

if __name__=='__main__':unittest.main()
