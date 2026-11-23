"""Adversarial unit tests for model-run JSONL pairing; no GPU or OpenSCAD."""
import json
from pathlib import Path
import tempfile
import unittest
from .paired_from_runs import analyze_raw


class RawPairedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        base = Path(self.temp.name)
        self.files = [base / n for n in ('en.jsonl','zh.jsonl','meta_en.json','meta_zh.json')]
        self.params = dict(models=['qwen2.5-coder:7b'], samples=1,feedback='report',
                           max_repairs=2, temperature=.2,seed_base=1000,
                           num_ctx=8192,num_predict=2048,think=False,
                           system='bench/prompts/system.md')
        self.record()

    def item(self, task, lang, *, good=False, render=False):
        return dict(model=self.params['models'][0],task=task,sample=0,lang=lang,
                    feedback='report', max_repairs=2,passed=good,first_pass=good,
                    attempts_used=1,attempts=[{'passed':good,'render':{'ok':render}}])

    def record(self, en=None, zh=None, en_override=None, zh_override=None):
        en = en if en is not None else [self.item(f't{i}','en') for i in range(16)]
        zh = zh if zh is not None else [self.item(f't{i}','zh') for i in range(16)]
        for p, rows in zip(self.files[:2],(en,zh)):
            p.write_text(''.join(json.dumps(row)+'\n' for row in rows))
        for p, lang, extra in zip(self.files[2:],('en','zh'),
                                  (en_override or {}, zh_override or {})):
            p.write_text(json.dumps({'git_commit':'pinned-clean-sha',
                'args':dict(self.params,**extra,lang=lang)}))

    def infer(self, ids=None):
        return analyze_raw(*self.files, expected_task_ids=ids)

    def test_all_zero_has_no_conditional_test(self):
        obj=self.infer([f't{i}' for i in range(16)])
        self.assertEqual(obj['paired_results']['0']['full_pass']['en_pass'],0)
        self.assertIsNone(obj['paired_results']['0']['full_pass']['exact_mcnemar_two_sided_p'])
        self.assertTrue(obj['declared_task_set_verified'])

    def test_one_discordant_render(self):
        zh=[self.item(f't{i}','zh',render=(i==3)) for i in range(16)]
        self.record(zh=zh)
        r=self.infer()['paired_results']['0']['first_render']
        self.assertEqual((r['en_only'],r['zh_only']),(0,1))
        self.assertEqual(r['exact_mcnemar_two_sided_p'],1.)

    def test_different_task_sets_refuse(self):
        self.record(zh=[self.item(f't{i}','zh') for i in range(15)])
        with self.assertRaisesRegex(ValueError,'missing EN/ZH'):
            self.infer()

    def test_same_missing_task_requires_expected_set(self):
        self.record(en=[self.item(f't{i}','en') for i in range(15)],
                    zh=[self.item(f't{i}','zh') for i in range(15)])
        with self.assertRaisesRegex(ValueError,'declared benchmark'):
            self.infer([f't{i}' for i in range(16)])

    def test_duplicate_results_refuse(self):
        en=[self.item(f't{i}','en') for i in range(16)]
        self.record(en=en+[en[0]])
        with self.assertRaisesRegex(ValueError,'duplicate'):
            self.infer()

    def test_different_model_refuse(self):
        self.record(zh_override={'models':['wrong-model']})
        with self.assertRaisesRegex(ValueError,'unmatched'):
            self.infer()

    def test_different_seed_refuse(self):
        self.record(zh_override={'seed_base':1234})
        with self.assertRaisesRegex(ValueError,'unmatched'):
            self.infer()

    def test_different_token_budget_refuse(self):
        self.record(zh_override={'num_predict':500})
        with self.assertRaisesRegex(ValueError,'unmatched'):
            self.infer()

    def test_bad_outcome_flag_refuse(self):
        en=[self.item(f't{i}','en') for i in range(16)]
        en[0]['passed']=True
        self.record(en=en)
        with self.assertRaisesRegex(ValueError,'contradict'):
            self.infer()

    def test_invalid_render_value_refuse(self):
        en=[self.item(f't{i}','en') for i in range(16)]
        en[0]['attempts'][0]['render']['ok']=1
        self.record(en=en)
        with self.assertRaisesRegex(ValueError,'booleans'):
            self.infer()

    def test_unsafe_uncommitted_revision_refuse(self):
        m=json.loads(self.files[2].read_text())
        m['git_commit']='abc+uncommitted-changes'
        self.files[2].write_text(json.dumps(m))
        with self.assertRaisesRegex(ValueError,'clean pinned'):
            self.infer()

    def test_repair_budget_mismatch_refuse(self):
        en=[self.item(f't{i}','en') for i in range(16)]
        en[0]['max_repairs']=5
        self.record(en=en)
        with self.assertRaisesRegex(ValueError,'row repair budget'):
            self.infer()

    def test_all_samples_must_appear(self):
        self.record(en_override={'samples':2},zh_override={'samples':2})
        with self.assertRaisesRegex(ValueError,'incomplete sample'):
            self.infer()

    def test_sample_zero_must_exist(self):
        en=[self.item(f't{i}','en') for i in range(16)]
        zh=[self.item(f't{i}','zh') for i in range(16)]
        for row in en+zh: row['sample']=1
        self.record(en,zh)
        with self.assertRaisesRegex(ValueError,'indexed samples'):
            self.infer()


if __name__=='__main__':
    unittest.main()
