"""Deterministic paired inference tests, no model or OpenSCAD needed."""
import unittest
from bench.prompts.paired_inference import analyze_paired, exact_mcnemar_p


class PairedInferenceTests(unittest.TestCase):
    def test_all_zero_is_not_a_p_value_of_one(self):
        rows = [{'task_id':f't{i}', 'en_pass':False, 'zh_pass':False} for i in range(16)]
        r = analyze_paired(rows)
        self.assertEqual((r.en_pass, r.zh_pass, r.neither), (0, 0, 16))
        self.assertIsNone(r.exact_mcnemar_two_sided_p)

    def test_single_discordant_pair_has_p_one(self):
        rows = [{'task_id':f't{i}', 'en_pass':False, 'zh_pass':i==0} for i in range(16)]
        r = analyze_paired(rows)
        self.assertEqual((r.en_only, r.zh_only), (0, 1))
        self.assertEqual(r.exact_mcnemar_two_sided_p, 1.)
        self.assertAlmostEqual(r.zh_minus_en, 1/16)

    def test_unbalanced_discordance(self):
        self.assertAlmostEqual(exact_mcnemar_p(0, 5), .0625)
        self.assertAlmostEqual(exact_mcnemar_p(1, 5), .21875)

    def test_marginal_counts_do_not_identify_pairing(self):
        same = analyze_paired([{'task_id':f't{i}', 'en_pass':i==0, 'zh_pass':i==0} for i in range(16)])
        distinct = analyze_paired([{'task_id':f't{i}', 'en_pass':i==0, 'zh_pass':i==1} for i in range(16)])
        self.assertEqual((same.en_pass, same.zh_pass), (distinct.en_pass, distinct.zh_pass))
        self.assertEqual((same.en_only, same.zh_only), (0, 0))
        self.assertEqual((distinct.en_only, distinct.zh_only), (1, 1))
        self.assertIsNone(same.exact_mcnemar_two_sided_p)
        self.assertEqual(1., distinct.exact_mcnemar_two_sided_p)

    def test_duplicate_ids_rejected(self):
        with self.assertRaisesRegex(ValueError, 'duplicated'):
            analyze_paired([{'task_id':'t','en_pass':True,'zh_pass':True}]*2)

    def test_missing_boolean_or_bad_types_rejected(self):
        for bad in (1, 0, 'True', None):
            with self.assertRaisesRegex(ValueError, 'booleans'):
                analyze_paired([{'task_id':'x','en_pass':bad,'zh_pass':False}])

    def test_empty_rejected(self):
        with self.assertRaisesRegex(ValueError, 'empty'):
            analyze_paired([])

    def test_bad_discordance_inputs_rejected(self):
        for a,b in ((-1,3), (0.2,2), (True,1)):
            with self.assertRaisesRegex(ValueError, 'counts'):
                exact_mcnemar_p(a,b)

    def test_switch_keys_for_render_flags(self):
        rows=[{'task_id':'a','en_render':False,'zh_render':True},
              {'task_id':'b','en_render':False,'zh_render':False}]
        r=analyze_paired(rows,en_key='en_render',zh_key='zh_render')
        self.assertEqual(r.zh_only,1)
        self.assertAlmostEqual(r.zh_minus_en,.5)


if __name__ == '__main__': unittest.main()
