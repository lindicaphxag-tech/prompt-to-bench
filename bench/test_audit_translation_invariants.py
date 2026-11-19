"""Regression tests for translation specification checks."""
import tempfile
import unittest
from pathlib import Path

from audit_translation_invariants import audit, direction_counts, number_counts


class InvariantAuditTest(unittest.TestCase):
    def test_decimal_representation(self):
        self.assertEqual(number_counts("pitch 9.0, 0.20 and -25"),
                         number_counts("孔距 9，0.2 与 -25"))

    def test_signed_axes(self):
        self.assertEqual(direction_counts("on +X and -Y"),
                         direction_counts("沿 +X 和 -Y"))
        self.assertNotEqual(direction_counts("on +X"),
                            direction_counts("在 -X"))

    def make_fixture(self, tmp, translation="一个 9.0 mm 的孔沿 -X 方向"):
        tasks = Path(tmp) / "tasks.yaml"
        zh = Path(tmp) / "translations.yaml"
        tasks.write_text("- id: part\n  prompt: A 9 mm hole along -X\n", encoding="utf-8")
        zh.write_text("zh:\n  part: " + translation + "\n", encoding="utf-8")
        return tasks, zh

    def test_valid_translation(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual([], audit(*self.make_fixture(tmp)))

    def test_changed_number_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIn("numeric changes", repr(audit(*self.make_fixture(
                tmp, "一个 10 mm 的孔沿 -X 方向"))))

    def test_reversed_axis_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIn("axis directions changed", repr(audit(*self.make_fixture(
                tmp, "一个 9 mm 的孔沿 +X 方向"))))

    def test_missing_task_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            tasks, lang = self.make_fixture(tmp)
            lang.write_text("zh: {}\n", encoding="utf-8")
            self.assertIn("missing zh translation", repr(audit(tasks, lang)))

    def test_extra_task_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            tasks, lang = self.make_fixture(tmp)
            lang.write_text(lang.read_text() + "  invented_task: fake\n", encoding="utf-8")
            self.assertIn("unknown translated task ID", repr(audit(tasks, lang)))

    def test_missing_unit_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIn("millimetre unit missing", repr(audit(*self.make_fixture(
                tmp, "一个 9 的孔沿 -X 方向"))))


if __name__ == "__main__":
    unittest.main()
