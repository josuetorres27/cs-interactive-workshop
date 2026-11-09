#!/usr/bin/env python3
"""
CS Interactive Lab - Web Assets & Configuration Test Suite
20 Automated Integrity Tests (HTML, CSS, JS, JSON, Configs)
"""

import os
import sys
import json
import re

TEST_COUNT = 0
PASSED_COUNT = 0
FAILED_COUNT = 0

def test(name, condition, error_msg=""):
    global TEST_COUNT, PASSED_COUNT, FAILED_COUNT
    TEST_COUNT += 1
    if condition:
        PASSED_COUNT += 1
        print(f"  [PASS] {name}")
    else:
        FAILED_COUNT += 1
        print(f"  [FAIL] {name}: {error_msg}")

def main():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    print("\n======================================================================")
    print("   TEST SUITE: Web Assets & Configuration Suite (20 Tests)")
    print("======================================================================")

    # 1. index.html checks
    index_path = os.path.join(repo_root, "web", "index.html")
    test("Index HTML File Exists", os.path.isfile(index_path))
    
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    test("Index HTML Has Valid DOCTYPE", "<!DOCTYPE html>" in html)
    test("Index HTML Contains Title", "<title>CS Interactive Lab" in html)
    test("Index HTML Has Algorithms Tab", 'data-tab="algorithms"' in html)
    test("Index HTML Has Concurrency Tab", 'data-tab="concurrency"' in html)
    test("Index HTML Has Networking Tab", 'data-tab="networking"' in html)
    test("Index HTML Has Cheatsheets Tab", 'data-tab="cheatsheets"' in html)
    test("Index HTML Has Algo Canvas Element", '<canvas id="algoCanvas">' in html)
    test("Index HTML Has Concurrency Canvas Element", '<canvas id="concurrencyCanvas">' in html)
    test("Index HTML Has Sound Controller Script", '<script src="js/audio.js"></script>' in html)

    # 2. CSS checks
    css_path = os.path.join(repo_root, "web", "css", "styles.css")
    test("CSS Styles File Exists", os.path.isfile(css_path))
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
    test("CSS Has Root Variables Defined", ":root {" in css and "--bg-primary:" in css)
    test("CSS Has Custom Dark Theme Colors", "--cyan:" in css and "--emerald:" in css)

    # 3. figuresData.js checks
    figures_js = os.path.join(repo_root, "web", "js", "modules", "figuresData.js")
    test("figuresData.js File Exists", os.path.isfile(figures_js))
    with open(figures_js, "r", encoding="utf-8") as f:
        js_data = f.read()
    test("figuresData.js Assigns window.EMBEDDED_ASSETS", "window.EMBEDDED_ASSETS = {" in js_data)
    test("figuresData.js Does NOT Contain 'eres arte'", "eres arte" not in js_data)

    required_figs = ["batman", "charizard", "mario", "spiderman_1", "mcqueen"]
    for fig in required_figs:
        test(f"figuresData.js Contains Figure '{fig}'", f'"{fig}":' in js_data)

    # 4. firebase.json checks
    fb_path = os.path.join(repo_root, "firebase.json")
    test("firebase.json File Exists", os.path.isfile(fb_path))
    with open(fb_path, "r", encoding="utf-8") as f:
        fb_data = json.load(f)
    test("firebase.json Public Directory is 'web'", fb_data.get("hosting", {}).get("public") == "web")

    print("----------------------------------------------------------------------")
    print(f"Summary: {PASSED_COUNT}/{TEST_COUNT} passed ({FAILED_COUNT} failed)")
    print("======================================================================\n")
    return 0 if FAILED_COUNT == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
