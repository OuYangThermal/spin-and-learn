#!/usr/bin/env python3
"""Build the true single-file standalone edition of Spin & Learn.

Reads index.html + css/style.css + js/*.js + packs/*.json + assets/*.svg
and produces dist/spin-and-learn-standalone.html — one file that runs from
a file:// double-click with zero network requests, zero modules, zero MP3s.

Usage:
    python3 build.py                 # dist/spin-and-learn-standalone.html
    python3 build.py --with-selftest # also dist/selftest.html (+js/selftest.js)
"""
import base64
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
JS_ORDER = ["config.js", "audio.js", "spinner.js", "content.js", "game.js", "editor.js"]


def data_uri(path: Path, mime: str) -> str:
    return "data:%s;base64,%s" % (mime, base64.b64encode(path.read_bytes()).decode("ascii"))


def build(with_selftest: bool = False) -> Path:
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    # 1. Inline the stylesheet.
    css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
    link_tag = '<link rel="stylesheet" href="css/style.css">'
    assert link_tag in html, "stylesheet link tag not found"
    html = html.replace(link_tag, "<style>\n" + css + "\n</style>", 1)

    # 2. Inline each classic script, in load order.
    #    The content-pack embed goes right after content.js (which sets a
    #    small fallback for window.SpinLearnEmbeddedPacks).
    packs = {}
    for p in sorted((ROOT / "packs").glob("*.json")):
        packs[p.stem] = json.loads(p.read_text(encoding="utf-8"))
    embed = (
        "<script>\nwindow.SpinLearnEmbeddedPacks = %s;\n</script>"
        % json.dumps(packs, ensure_ascii=False)
    )
    js_files = list(JS_ORDER)
    if with_selftest:
        js_files.append("selftest.js")
    for name in js_files:
        tag = '<script src="js/%s"></script>' % name
        code = (ROOT / "js" / name).read_text(encoding="utf-8")
        if name == "config.js":
            # The paid single-file download ships with demoMode OFF
            # (file import/export enabled); the public demo keeps it ON.
            assert "demoMode: true" in code, "demoMode flag missing in config.js"
            code = code.replace("demoMode: true", "demoMode: false")
        script = '<script>\n' + code + "\n</script>"
        if name == "content.js":
            script += "\n" + embed
        if with_selftest and name == "selftest.js":
            # selftest.js has no <script src> tag in index.html; append before </body>.
            assert "</body>" in html
            html = html.replace("</body>", script + "\n</body>", 1)
        else:
            assert tag in html, "script tag not found: " + tag
            html = html.replace(tag, script, 1)

    # 3. Inline the logo + favicon as data URIs (no external files).
    logo_uri = data_uri(ROOT / "assets" / "logo.svg", "image/svg+xml")
    html = html.replace('src="assets/logo.svg"', 'src="' + logo_uri + '"')
    icon_uri = data_uri(ROOT / "assets" / "icon.svg", "image/svg+xml")
    html = html.replace('href="assets/icon.svg"', 'href="' + icon_uri + '"')

    # 4. Safety checks: no external URLs, no leftover relative asset refs.
    assert "http://" not in html and "https://" not in html, "external URL leaked into build"
    for leftover in ['href="css/', 'src="js/', 'src="assets/', 'href="assets/',
                     'href="packs/', 'src="packs/', 'url(packs/']:
        assert leftover not in html, "un-inlined reference remains: " + leftover

    DIST.mkdir(exist_ok=True)
    out = DIST / ("selftest.html" if with_selftest else "spin-and-learn-standalone.html")
    out.write_text(html, encoding="utf-8")
    print("wrote %s (%d bytes)" % (out, out.stat().st_size))
    return out


if __name__ == "__main__":
    build("--with-selftest" in sys.argv)
