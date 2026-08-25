import sys, json
from playwright.sync_api import sync_playwright
url = sys.argv[1]
sel = sys.argv[2] if len(sys.argv) > 2 else "tr.tender"
CHROME = "/opt/pw-browsers/chromium"
out = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    pg = b.new_page()
    pg.goto(url, wait_until="networkidle", timeout=60000)
    for r in pg.query_selector_all(sel):
        rec = {}
        for f in ("ref", "title", "agency", "pub", "close"):
            el = r.query_selector("." + f)
            if el: rec[f] = el.inner_text().strip()
        if rec: out.append(rec)
    b.close()
print(json.dumps(out, indent=1))
