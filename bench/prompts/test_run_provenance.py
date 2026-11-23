"""Tests use constructed runner receipts, not new CAD model executions."""
import copy
import unittest
from .run_provenance import audit_protocols, bind_metadata


class ProvenanceTests(unittest.TestCase):
    def make(self, lang, **overrides):
        m = dict(args=dict(lang=lang, render_timeout=120, seed_base=1000),
                 git_commit='a'*40, python='3.12', openscad='2021.01', ollama='0.1')
        m['args'].update(overrides)
        bind_metadata(m, task_source_sha256='b'*64, reference_sha256='c'*64,
                      system='system', prompts={'t1':lang, 't2':lang+'2'})
        rows = [dict(task=t, protocol_sha256=m['protocol_sha256']) for t in ('t1','t2')]
        return m, rows

    def setUp(self):
        self.en, self.er = self.make('en')
        self.zh, self.zr = self.make('zh')

    def check(self, strict=True):
        return audit_protocols(self.en, self.zh, self.er, self.zr, require_bound=strict)

    def test_valid_matched_receipts(self):
        self.assertEqual(self.check(), 'ROW_BOUND')

    def test_same_protocol_resumption(self):
        old = self.en['protocol_sha256']
        self.en['started'] = 'later'
        self.assertEqual(old, self.en['protocol_sha256'])
        self.assertEqual(self.check(), 'ROW_BOUND')

    def test_mixed_old_seed_receipt(self):
        _, old = self.make('en', seed_base=1)
        self.er[0] = old[0]
        with self.assertRaisesRegex(ValueError, 'row protocol'):
            self.check()

    def test_metadata_relabeling(self):
        self.en['args']['seed_base'] = 2
        with self.assertRaisesRegex(ValueError, 'metadata protocol'):
            self.check()

    def test_different_renderer_timeout(self):
        self.zh, self.zr = self.make('zh', render_timeout=60)
        with self.assertRaisesRegex(ValueError, 'renderer time'):
            self.check()

    def test_missing_one_row_digest(self):
        self.er[0].pop('protocol_sha256')
        with self.assertRaisesRegex(ValueError, 'row protocol'):
            self.check()

    def test_legacy_data_exploratory_only(self):
        for m, rows in ((self.en,self.er),(self.zh,self.zr)):
            m.pop('protocol_sha256')
            m.pop('protocol')
            for r in rows: r.pop('protocol_sha256')
        self.assertEqual(self.check(False), 'LEGACY_UNBOUND')
        with self.assertRaisesRegex(ValueError, 'legacy records'):
            self.check()

    def test_changed_system_input(self):
        bind_metadata(self.zh, task_source_sha256='b'*64, reference_sha256='c'*64,
                      system='different', prompts={'t1':'zh','t2':'zh2'})
        for r in self.zr: r['protocol_sha256']=self.zh['protocol_sha256']
        with self.assertRaisesRegex(ValueError, 'common task'):
            self.check()

    def test_both_languages_omit_same_task(self):
        self.er.pop(); self.zr.pop()
        with self.assertRaisesRegex(ValueError, 'task inventory'):
            self.check()

    def test_runtime_mismatch(self):
        self.zh['openscad']='different'
        bind_metadata(self.zh, task_source_sha256='b'*64, reference_sha256='c'*64,
                      system='system', prompts={'t1':'zh','t2':'zh2'})
        for r in self.zr: r['protocol_sha256']=self.zh['protocol_sha256']
        with self.assertRaisesRegex(ValueError, 'runtime version'):
            self.check()

    def test_translation_body_changes_digest(self):
        other=copy.deepcopy(self.zh)
        bind_metadata(other, task_source_sha256='b'*64, reference_sha256='c'*64,
                      system='system', prompts={'t1':'new','t2':'zh2'})
        self.assertNotEqual(other['protocol_sha256'],self.zh['protocol_sha256'])


if __name__=='__main__': unittest.main()
