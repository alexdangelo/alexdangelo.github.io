#!/usr/bin/env python3
"""Builds tab-practice-player.html: the whole app in ONE file that works by
double-clicking it, with no web server and no internet connection.

Run from the project folder:   python3 tools/make-single-file.py
"""
import base64, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
read = lambda p: (root / p).read_text(encoding="utf-8")
data_uri = lambda p, mime: "data:%s;base64,%s" % (mime, base64.b64encode((root / p).read_bytes()).decode())

css = re.sub(r"url\((fonts/[^)]+\.woff2)\)", lambda m: "url(%s)" % data_uri(m.group(1), "font/woff2"), read("style.css"))
app = read("app.js")
app = app.replace("'fonts/Bravura.woff2'", "'%s'" % data_uri("fonts/Bravura.woff2", "font/woff2"))
app = app.replace("'sounds/samples.json'", "'%s'" % data_uri("sounds/samples.json", "application/json"))

html = read("index.html")
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "</style>")
html = html.replace('<script src="vendor/alphaTab.min.js"></script>', "<script>\n" + read("vendor/alphaTab.min.js") + "\n</script>")
html = html.replace('<script src="app.js"></script>', "<script>\n" + app + "</script>")

out = root / "tab-practice-player.html"
out.write_text(html, encoding="utf-8")
print("Wrote %s (%.1f MB)" % (out.name, out.stat().st_size / 1e6))
