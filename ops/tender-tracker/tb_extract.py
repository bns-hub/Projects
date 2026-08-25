#!/usr/bin/env python3
"""Extract tender rows using a recipe produced by tb_discover.py.

    python3 tb_extract.py recipe.json [max_pages]

Recipe, API mode (preferred -- cheapest and most stable):
    {"method":"api","url":"<listing page>","endpoint":"https://.../api/tenders",
     "json_path":"$.data.records",
     "field_map":{"ref":"tenderRefNo","title":"tenderTitle","agency":"buyerName",
                  "publish":"publishedDate","close":"closingDateTime","link":"detailUrl"},
     "page_param":"page"}

Recipe, DOM mode (fallback when there is no JSON feed):
    {"method":"dom","url":"https://...","row_selector":".tender-card",
     "field_selectors":{"ref":".tb-ref","title":".tb-title","agency":".tb-buyer",
                        "close":".tb-close"},
     "link_from":"title"}

Prints a JSON array of normalised rows to stdout and NOTHING else, so it can be
piped without putting page HTML into the run's context.
"""
import json, sys
from urllib.parse import urljoin

CHROME = "/opt/pw-browsers/chromium"
FIELDS = ("ref", "title", "agency", "publish", "close", "link")


def walk(obj, path):
    """Resolve a '$.a.b[0].c' style path produced by tb_discover."""
    cur = obj
    for part in path.replace("$", "").split("."):
        if not part:
            continue
        while part.endswith("]"):
            part, _, idx = part[:-1].rpartition("[")
            if part:
                cur = cur[part]
                part = ""
            cur = cur[int(idx)]
        if part:
            cur = cur[part]
    return cur


def norm(rec, field_map, base_url):
    out = {}
    for canon in FIELDS:
        key = field_map.get(canon)
        val = rec.get(key) if key else None
        if val is None:
            out[canon] = ""
        else:
            out[canon] = str(val).strip()
    if out["link"]:
        out["link"] = urljoin(base_url, out["link"])
    return out


def main():
    if len(sys.argv) < 2:
        print("usage: tb_extract.py <recipe.json> [max_pages]", file=sys.stderr)
        return 2
    recipe = json.load(open(sys.argv[1]))
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    from playwright.sync_api import sync_playwright

    rows, seen = [], set()
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        pg = b.new_page()
        # Load the listing first so any cookies/headers the API needs are set.
        pg.goto(recipe["url"], wait_until="networkidle", timeout=60000)

        if recipe["method"] == "api":
            for page_no in range(1, max_pages + 1):
                ep = recipe["endpoint"]
                if recipe.get("page_param") and page_no > 1:
                    sep = "&" if "?" in ep else "?"
                    ep = f"{ep}{sep}{recipe['page_param']}={page_no}"
                try:
                    body = pg.request.get(ep, timeout=45000).json()
                    recs = walk(body, recipe.get("json_path", "$"))
                except Exception as e:
                    print(f"page {page_no} failed: {type(e).__name__}", file=sys.stderr)
                    break
                if not recs:
                    break
                for r in recs:
                    row = norm(r, recipe["field_map"], recipe["url"])
                    key = (row["ref"] or row["title"]).lower()
                    if key and key not in seen:
                        seen.add(key)
                        rows.append(row)
                if not recipe.get("page_param"):
                    break
        else:  # dom
            fs = recipe["field_selectors"]
            for el in pg.query_selector_all(recipe["row_selector"]):
                row = {}
                for canon in FIELDS:
                    sel = fs.get(canon)
                    node = el.query_selector(sel) if sel else None
                    row[canon] = node.inner_text().strip() if node else ""
                lf = recipe.get("link_from")
                if lf and fs.get(lf):
                    a = el.query_selector(fs[lf])
                    href = a.get_attribute("href") if a else None
                    if href:
                        row["link"] = urljoin(recipe["url"], href)
                key = (row["ref"] or row["title"]).lower()
                if key and key not in seen:
                    seen.add(key)
                    rows.append(row)
        b.close()

    print(json.dumps(rows, indent=1))
    return 0 if rows else 2


if __name__ == "__main__":
    sys.exit(main())
