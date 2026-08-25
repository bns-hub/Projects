# Runtime notes for Step 3b rung 4 (headless render)

Verified in the Default environment on 25 Aug 2026.

## Chromium is present; Playwright is NOT

    /opt/pw-browsers/chromium -> chromium-1194/chrome-linux/chrome   ✅ present
    python3 -c "import playwright"                                    ❌ ModuleNotFoundError
    node -e "require('playwright')"                                   ❌ not installed

So "Playwright is already configured" is only half true: the **browser** ships with the image,
the **driver library does not**. A run that assumes `import playwright` works will fail.

## The install works even under a total egress block

`pypi.org` and `files.pythonhosted.org` are in the proxy's `noProxy` list, so they bypass the
egress policy entirely. `pip install playwright` succeeded (rc=0) in a session where *every*
external host — including example.com — was refused by the proxy.

    pip install playwright        # works, ~seconds
    playwright install chromium   # NEVER run this — needs the browser CDN, which IS blocked,
                                  # and the browser is already on disk anyway

Always launch with an explicit `executable_path=/opt/pw-browsers/chromium` and `--no-sandbox`.

## Proven end-to-end

`tb_render.py` was tested against a local fixture whose rows are injected by JavaScript — the exact
shape that defeats a plain fetch. Static parse: no usable rows. Headless render: both rows extracted
with all five fields.

    python3 ops/tender-tracker/tb_render.py "<url>" "tr.tender"

Prints compact JSON to stdout and nothing else, so it can be piped without putting page HTML into
the run's context. The row selector and field classes will need adjusting to the real site's markup
once the listing is actually reachable.

## Caveat

This proves the *rendering pipeline*, not TenderBoard access. Egress to tenderboard.biz is a
separate question — see PROBE-FINDINGS.md.
