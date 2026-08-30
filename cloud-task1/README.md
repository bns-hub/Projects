# Cloud Task 1 — one-time Google setup

This Google Apps Script runs Task 1 entirely in Google's cloud. After authorization, Benson's PC does not need to be on.

## One-time setup

1. Open <https://script.google.com/home> and create a **New project** named `GeBIZ Tender Tracker`.
2. Replace the default editor contents with the complete contents of [`dist/Code.gs`](dist/Code.gs).
3. Save. Select `setupCloudTask` in the function menu and click **Run**. Approve access to Google Drive, Google Sheets, external web requests, triggers and email.
4. Select `runTestNow` and click **Run** once. Confirm a new dated tracker appears in Drive folder `1euxFqdf9FmGEWZmxMDGOwMSrVzisS15g` and a dated TenderBoard raw CSV appears in folder `1TPg44swiYi14FD3rciZx-WNCsFE8Qyve`.

`setupCloudTask` installs a daily trigger at approximately 11:00 AM Asia/Singapore. GitHub Task 2 publishes TenderBoard at 10:00 AM SGT.

## Cloud sequence

1. GitHub Actions crawls TenderBoard at 10:00 AM SGT and replaces the fixed CSV/status files.
2. Google Apps Script runs at approximately 11:00 AM SGT, fetches GeBIZ and TenderBoard, archives the raw CSV, copies the latest tracker, merges/deduplicates rows, checks captured closed GeBIZ opportunities for award status, and emails the result.
3. Every relevant open row is marked `Advise to look at` in `TECQ Recommendation`. Award history is permanent and uncapped.
