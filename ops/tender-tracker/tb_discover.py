#!/usr/bin/env python3
"""Discover how a JS-rendered tender listing gets its data.

Loads the page in headless Chromium, records every network response, and reports
which endpoint carries tender rows -- plus a guessed field mapping. Prints a
compact report to stdout ONLY; never dumps page HTML.

    python3 tb_discover.py https://www.tenderboard.biz/singaporetenders

Exit 0 = something usable found, 2 = nothing found.
"""
import json, re, sys

CHROME = "/opt/pw-browsers/chromium"
NAV_TIMEOUT = 60000

# Two passes: unambiguous patterns claim their key first, then looser ones fill
# gaps. Order matters -- "agency" runs before "title" so a key like "buyerName"
# is claimed as the buyer rather than swallowed by a loose name/title match.
STRONG_PATTERNS = [
    ("ref",     r"ref(erence)?|tender_?no|tender_?num|quotation_?no"),
    ("agency",  r"buyer|agency|organis|organiz|procuring|department|dept"),
    ("title",   r"title|subject"),
    ("close",   r"clos|deadline|expir"),
    ("publish", r"publish|posted"),
    ("link",    r"url|link|permalink|slug|href"),
]
WEAK_PATTERNS = [
    ("ref",     r"^code$|number|^id$"),
    ("agency",  r"company|entity|owner"),
    ("title",   r"^name$|description|summary"),
    ("close",   r"due|end_?date"),
    ("publish", r"created|start|open_?date"),
    ("link",    r"detail"),
]


def guess_fields(keys):
    """Map our canonical field names onto whatever keys the payload uses."""
    out = {}
    for patterns in (STRONG_PATTERNS, WEAK_PATTERNS):
        for canon, pat in patterns:
            if canon in out:
                continue
            for k in keys:
                if k in out.values():
                    continue
                if re.search(pat, k, re.I):
                    out[canon] = k
                    break
    return out


def find_record_arrays(obj, path="$", depth=0):
    """Yield (path, list_of_dicts) for every array of objects in the payload."""
    if depth > 6:
        return
    if isinstance(obj, list):
        dicts = [x for x in obj if isinstance(x, dict)]
        if len(dicts) >= 2:
            yield path, dicts
        for i, v in enumerate(obj[:3]):
            yield from find_record_arrays(v, f"{path}[{i}]", depth + 1)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from find_record_arrays(v, f"{path}.{k}", depth + 1)


def score(fields):
    """A payload is interesting when it looks like tenders, not like nav menus.

    A tender always has a date; a filter-options list (categories, agencies) never
    does. Requiring one kills the commonest false positive -- e.g. TenderBoard's
    own fetchOptions payload, which is a fat array of {id, name} pairs that would
    otherwise look plausible.
    """
    if not ("close" in fields or "publish" in fields):
        return 0
    if len(fields) < 3:
        return 0
    s = len(fields) * 10
    if "ref" in fields: s += 25
    if "close" in fields: s += 25
    if "title" in fields: s += 15
    return s


def main():
    if len(sys.argv) < 2:
        print("usage: tb_discover.py <url>", file=sys.stderr)
        return 2
    url = sys.argv[1]
    from playwright.sync_api import sync_playwright

    captured = []

    def on_response(resp):
        try:
            ctype = (resp.headers or {}).get("content-type", "")
            if "json" not in ctype.lower():
                return
            body = resp.json()
        except Exception:
            return
        for path, recs in find_record_arrays(body):
            keys = sorted({k for r in recs[:5] for k in r.keys()})
            fields = guess_fields(keys)
            if score(fields) >= 50:
                req = resp.request
                post_data = None
                try:
                    post_data = req.post_data
                except Exception:
                    pass
                hdrs = {}
                try:
                    for h, v in (req.headers or {}).items():
                        if h.lower() in ("content-type", "accept", "x-requested-with",
                                         "authorization", "x-api-key"):
                            hdrs[h] = v
                except Exception:
                    pass
                captured.append({
                    "endpoint": resp.url,
                    "http_method": req.method,
                    "post_data": post_data,
                    "headers": hdrs,
                    "status": resp.status,
                    "json_path": path,
                    "row_count": len(recs),
                    "field_map": fields,
                    "all_keys": keys[:30],
                    "sample": recs[:2],
                    "score": score(fields),
                })

    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        pg = b.new_page()
        pg.on("response", on_response)
        try:
            pg.goto(url, wait_until="networkidle", timeout=NAV_TIMEOUT)
        except Exception as e:
            print(json.dumps({"error": f"navigation failed: {type(e).__name__}: {e}"}))
            b.close()
            return 2

        # DOM fallback: find the most repeated leaf-ish container class.
        dom_guess = pg.evaluate("""() => {
            const counts = {};
            for (const el of document.querySelectorAll('[class]')) {
              for (const c of el.classList) {
                if (!/^(row|col|d-|m-|p-|text-|bg-|flex|grid)/.test(c))
                  counts[c] = (counts[c] || 0) + 1;
              }
            }
            return Object.entries(counts)
              .filter(([c, n]) => n >= 3 && n <= 200)
              .sort((a, b) => b[1] - a[1]).slice(0, 12)
              .map(([c, n]) => ({cls: c, count: n}));
        }""")
        title = pg.title()
        b.close()

    captured.sort(key=lambda c: -c["score"])
    report = {
        "url": url,
        "page_title": title,
        "api_candidates": captured[:3],
        "dom_repeated_classes": dom_guess,
        "verdict": "API" if captured else ("DOM" if dom_guess else "NOTHING"),
    }
    print(json.dumps(report, indent=1)[:9000])
    return 0 if (captured or dom_guess) else 2


if __name__ == "__main__":
    sys.exit(main())
