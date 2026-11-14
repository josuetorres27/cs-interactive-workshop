#!/usr/bin/env python3
"""
CS Interactive Workshop - Web Assets & Configuration Test Suite
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
    test("Index HTML Contains Title", "<title>CS Interactive Workshop" in html)
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

    # 5. Favicons, robots.txt and sitemap.xml
    ico_path = os.path.join(repo_root, "web", "favicon.ico")
    test("favicon.ico File Exists", os.path.isfile(ico_path))
    with open(ico_path, "rb") as f:
        ico = f.read()
    ico_count = int.from_bytes(ico[4:6], "little") if len(ico) >= 6 else 0
    ico_sizes = [(ico[6 + 16 * i] or 256) for i in range(ico_count)]
    test("favicon.ico Is a Valid ICO File", ico[:4] == b"\x00\x00\x01\x00" and ico_count > 0)
    test("favicon.ico Sizes Are Multiples of 48px", bool(ico_sizes) and all(s % 48 == 0 for s in ico_sizes), str(ico_sizes))
    test("favicon.svg File Exists", os.path.isfile(os.path.join(repo_root, "web", "favicon.svg")))
    apple_path = os.path.join(repo_root, "web", "apple-touch-icon.png")
    with open(apple_path, "rb") as f:
        test("apple-touch-icon.png Is a PNG File", f.read(8) == b"\x89PNG\r\n\x1a\n")
    test("Index HTML Links favicon.ico", 'href="/favicon.ico"' in html)
    test("Index HTML Links favicon.svg", 'href="/favicon.svg"' in html)
    test("Index HTML Links apple-touch-icon", 'href="/apple-touch-icon.png"' in html)
    test("Index HTML Has a Canonical Link", '<link rel="canonical" href="https://workshop.josuetorressibaja.com/">' in html)
    test("Index HTML Is Not Blocked From Indexing", "noindex" not in html.lower())
    with open(os.path.join(repo_root, "web", "robots.txt"), "r", encoding="utf-8") as f:
        robots = f.read()
    test("robots.txt Allows Crawling and Lists the Sitemap", "Allow: /" in robots and "Sitemap: https://workshop.josuetorressibaja.com/sitemap.xml" in robots)
    with open(os.path.join(repo_root, "web", "sitemap.xml"), "r", encoding="utf-8") as f:
        sitemap = f.read()
    test("sitemap.xml Lists the Home Page", "<loc>https://workshop.josuetorressibaja.com/</loc>" in sitemap)

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
