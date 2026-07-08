#!/usr/bin/env python3
"""Unit checks for the packages catalog (stdlib unittest)."""
from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "check_packages_catalog.py"
CATALOG = ROOT / "data" / "packages.yaml"


def _load_checker():
    spec = importlib.util.spec_from_file_location("check_packages_catalog", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


class TestPackagesCatalog(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = _load_checker()
        cls.data = cls.mod.load_catalog(CATALOG)

    def test_catalog_file_exists(self):
        self.assertTrue(CATALOG.is_file(), f"missing {CATALOG}")

    def test_required_ecosystems_present(self):
        ids = {e["id"] for e in self.data["ecosystems"]}
        for req in self.mod.REQUIRED_ECOSYSTEMS:
            self.assertIn(req, ids)

    def test_each_ecosystem_has_package_with_name_and_url(self):
        for eco in self.data["ecosystems"]:
            pkgs = eco["packages"]
            self.assertGreaterEqual(len(pkgs), 1, eco["id"])
            for pkg in pkgs:
                self.assertTrue(pkg.get("name"), eco["id"])
                self.assertTrue(pkg.get("registry_url"), pkg.get("name"))

    def test_validate_clean(self):
        errors = self.mod.validate(self.data)
        self.assertEqual(errors, [], msg="\n".join(errors))

    def test_main_exit_zero(self):
        self.assertEqual(self.mod.main([str(CATALOG)]), 0)

    def test_registry_hosts_match_ecosystem(self):
        for eco in self.data["ecosystems"]:
            for pkg in eco["packages"]:
                self.assertTrue(
                    self.mod.host_ok(eco["id"], pkg["registry_url"]),
                    f"{eco['id']}/{pkg['name']}: {pkg['registry_url']}",
                )


if __name__ == "__main__":
    # Prefer repo-local import path
    sys.path.insert(0, str(ROOT / "scripts"))
    unittest.main(verbosity=2)
