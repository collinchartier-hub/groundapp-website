# groundapp-asc-sync

Daily sync of GroundApp's App Store Connect analytics (Apple ID `6760352779`, bundle `live.groundapp.ground`) into Supabase, for the admin dashboard on groundapp.live.

- `src/asc.js`: all the logic (JWT, API client, report requests, download, gunzip, TSV parse, aggregation, Supabase writes). Shared by the Worker and the CLI.
- `src/index.js`: the Worker. Cron runs the sync. `GET /health` says it's alive (no data). `POST /run` runs it on demand and needs the `x-sync-token` header.
- `../../scripts/asc.mjs`: local CLI (`check`, `request`, `reports`, `sync`).
- `../../scripts/asc.test.mjs`: tests, `node --test scripts/asc.test.mjs`.

It uses Apple's [Analytics Reports API](https://developer.apple.com/documentation/appstoreconnectapi/downloading-analytics-reports): one ONGOING report request (plus an optional ONE_TIME_SNAPSHOT for history), then for each report: DAILY instances, then segments, then a `.gz` tab-separated file per segment.

## Setup (once the keys exist)

You need two App Store Connect API keys (Users and Access > Integrations > App Store Connect API, Team Keys):

1. **Admin key**: used once, locally, to create the report requests. Only Admin can request a report type the first time.
2. **Sales key** (Sales and Reports role): used by the daily Worker to list and download reports. It can't create requests, which is why the request ids get stored in `groundapp_asc_state`.

Keep the `.p8` files outside this repo (`*.p8` is gitignored as a backstop).

```sh
cd ~/dev/groundapp-website

# 1. Admin key: test auth, then create the requests (ONGOING + one-time history snapshot)
export ASC_ISSUER_ID=<issuer id>
export ASC_KEY_ID=<ADMIN key id>
export ASC_PRIVATE_KEY_PATH=~/keys/AuthKey_<ADMIN key id>.p8
node scripts/asc.mjs check
node scripts/asc.mjs request --snapshot     # idempotent, reuses existing requests, saves ids to groundapp_asc_state

# 2. Switch to the Sales key and confirm it works
export ASC_KEY_ID=<SALES key id>
export ASC_PRIVATE_KEY_PATH=~/keys/AuthKey_<SALES key id>.p8
node scripts/asc.mjs check

# 3. Wait 1 to 2 days for Apple to generate the first reports, then:
node scripts/asc.mjs reports                # tracked reports + DAILY instance counts, flags renamed reports
node scripts/asc.mjs sync --dry-run         # downloads + aggregates, prints rows, writes nothing
node scripts/asc.mjs sync --write           # backfill (includes the snapshot), writes to Supabase

# 4. Deploy the Worker (daily, Sales key)
cd workers/asc-sync
npx wrangler deploy
npx wrangler secret put ASC_ISSUER_ID
npx wrangler secret put ASC_KEY_ID                      # the SALES key id
npx wrangler secret put ASC_PRIVATE_KEY < ~/keys/AuthKey_<SALES key id>.p8
grep '^SUPABASE_SERVICE_ROLE_KEY=' ../../.dev.vars | cut -d= -f2- | npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
openssl rand -hex 32 > /tmp/asc-sync-token && npx wrangler secret put SYNC_TOKEN < /tmp/asc-sync-token
curl https://groundapp-asc-sync.<your-subdomain>.workers.dev/health
curl -X POST -H "x-sync-token: $(cat /tmp/asc-sync-token)" https://groundapp-asc-sync.<your-subdomain>.workers.dev/run
```

`ASC_PRIVATE_KEY` accepts the PEM with real newlines or with literal `\n` sequences, so pasting it as one line also works.

### Worker settings (`wrangler.toml` `[vars]`)

| Var | Default | Meaning |
| --- | --- | --- |
| `ASC_APP_ID` | `6760352779` | App Store Connect app id |
| `SUPABASE_URL` | project url | Supabase project |
| `ASC_MAX_SUBREQUESTS` | `45` | Workers Free allows 50 subrequests per run. The sync stops before the limit and picks up the rest next run. On Workers Paid set it to `900`. |
| `ASC_INCLUDE_SNAPSHOT` | `0` | `1` makes the Worker also read the ONE_TIME_SNAPSHOT request. Normally the history backfill is done once with the CLI instead. |

A normal day costs about 40 subrequests (1 state read, 1 report list, about 9 instance lists, 1 imports check, about 18 segment calls and downloads, up to 7 dim cleanups, 1 upsert, 1 imports write, 1 state write).

## How the sync works

1. Read `requests` and `watermarks` from `groundapp_asc_state`.
2. List the reports of the ONGOING request (and snapshots in the CLI), pick the tracked ones, list their DAILY instances.
3. Skip instances already in `groundapp_asc_imports`.
4. Oldest `processingDate` first: list segments, download every segment (presigned S3 urls, no auth header, they expire in about 5 minutes so they're fetched right away), gunzip with `DecompressionStream`, parse, aggregate. All segments of one instance are summed.
5. **Latest processingDate wins per date.** Apple restates recent dates in newer instances and says not to merge records across instances ([Data completeness and corrections](https://developer.apple.com/documentation/analytics-reports/data-completeness-corrections)). Each (report family, Standard/Detailed, date) remembers which processingDate wrote it (`watermarks` in state), so an older instance processed later (for example the snapshot) never overwrites newer data.
6. Write: delete the old `source:`/`campaign:` dims for the dates being replaced, upsert rows (`Prefer: resolution=merge-duplicates`, `on_conflict=date,metric,dim`, batches of 1000), record the instances in `groundapp_asc_imports`, save `watermarks` and `last_run` to `groundapp_asc_state`.

If a run fails halfway, nothing is recorded as imported, so the next run redoes it. Writes are idempotent.

**Standard vs Detailed.** Totals and `source:` dims come only from the Standard reports. Detailed reports are read only for `campaign:` dims. Detailed reports drop rows under 5 users and add noise, so using them for totals would undercount ([privacy](https://developer.apple.com/documentation/analytics-reports/privacy)); campaign data only exists in Detailed.

**Tolerance.** Headers are matched case-insensitively with NBSP/BOM folded and a few aliases per column. Values are matched case and punctuation-insensitively (Apple says values are not case sensitive). Unknown event types are counted under `unmapped` in the run summary and skipped. A missing required column makes that instance an error (logged, not imported, retried) instead of writing zeros. Rows for another app id are dropped.

## Report and column mapping

Report names: Apple's API names don't always match the doc page titles, so the matcher accepts each base name with or without "App Store", with or without a trailing "Report", plus a "Standard"/"Detailed" suffix. Run `node scripts/asc.mjs reports` once data exists: it lists anything subscription/download/session-looking that didn't match.

Category enum values are `APP_STORE_ENGAGEMENT`, `COMMERCE`, `APP_USAGE`, `FRAMEWORK_USAGE`, `PERFORMANCE` (not `APP_STORE_COMMERCE`).

### App Store Discovery and Engagement (Standard + Detailed)
Doc: https://developer.apple.com/documentation/analytics-reports/app-store-discovery-and-engagement. Columns used: `Date`, `App Apple Identifier`, `Event`, `Page Type`, `Source Type`, `Campaign` (Detailed only), `Counts`.

| metric | rule |
| --- | --- |
| `page_views` | `Event` = Page view and `Page Type` in (Product page, Store sheet), sum of `Counts`. Matches ASC "Product Page Views" (includes StoreKit sheets). |
| `impressions` | `Event` = Impression plus the `page_views` rows. ASC defines Impressions as "includes product page views", while the report's Impression event excludes them. |

Tap events and page views of other page types (in-app event, version history, developer page) are ignored. Dims: `source:` and `campaign:` for both metrics.

### App Downloads (Standard + Detailed)
Doc: https://developer.apple.com/documentation/analytics-reports/app-download. Columns: `Date`, `App Apple Identifier`, `Download Type`, `Source Type`, `Campaign`, `Counts`.

| metric | rule |
| --- | --- |
| `downloads_first_time` | `Download Type` = First-time download |
| `redownloads` | `Download Type` = Redownload |
| `downloads_total` | first-time + redownloads (ASC "Total Downloads") |

Manual update, Auto-update and Restore are ignored. Dims: `source:` and `campaign:` for all three.

### App Store Installation and Deletion (Standard)
Doc: https://developer.apple.com/documentation/analytics-reports/app-installs. Columns: `Date`, `App Apple Identifier`, `Event`, `Source Type`, `Counts`.

| metric | rule |
| --- | --- |
| `installs` | `Event` = Install, sum of `Counts` (dims: `source:`) |
| `deletions` | `Event` = Delete, sum of `Counts` |

### App Sessions (Standard)
Doc: https://developer.apple.com/documentation/analytics-reports/app-sessions. Columns: `Date`, `App Apple Identifier`, `Sessions`, `Total Session Duration`, `Unique Devices`.

| metric | rule |
| --- | --- |
| `sessions` | sum of `Sessions` |
| `active_devices` | sum of `Unique Devices` across rows. Close to ASC "Active Devices" but can overcount a device that shows up in two rows the same day (for example two app versions). Don't sum it across days. |
| `session_seconds` | sum of `Total Session Duration` (seconds). Average session = `session_seconds / sessions`. |

### App Store Subscription Event (Standard + Detailed)
Doc: https://developer.apple.com/documentation/analytics-reports/subscription-event. Columns: `Event Date` (this report uses Event Date, not Date), `App Apple Identifier`, `Event Sub Type`, `Event Grouping`, `App Download Source Type`, `Campaign`, `Counts`. History starts 2025-01-01.

| metric | rule |
| --- | --- |
| `trial_starts` | `Event Sub Type` = Free Trial Starts |
| `trial_conversions` | `Event Sub Type` = Full Price from Free Trial or Contingent Price from Free Trial |
| `subscription_starts` | `Event Grouping` = Paid Subscription Starts (Full/Contingent Price Subscription Starts) |
| `renewals` | `Event Grouping` = Renewals |
| `churn_voluntary` | `Event Grouping` = Voluntary Churn |
| `churn_involuntary` | `Event Grouping` = Involuntary Churn |
| `refunds` | `Event Sub Type` starts with "Refunds from" |

Dims: `source:` and `campaign:` for trial_starts, trial_conversions, subscription_starts.

### App Store Subscription State (Standard)
Doc: https://developer.apple.com/documentation/analytics-reports/subscription-state. Columns: `Date`, `App Apple Identifier`, `State Metric`, `State Metric Grouping`, `Counts`.

| metric | rule |
| --- | --- |
| `active_trials` | `State Metric` = Free trials |
| `active_subscriptions` | `State Metric Grouping` = Paid plans (Full / Preserved / Contingent price) |

These are point-in-time counts per day. Don't sum them across days.

### Confidence

| item | confidence | basis |
| --- | --- | --- |
| Column names above | high | Apple's report field tables (linked per report) |
| Event / Download Type / State values | high | Apple glossaries; matching ignores case and punctuation anyway |
| Names `App Downloads Standard/Detailed`, `App Store Discovery and Engagement Standard/Detailed`, `App Store Installation and Deletion Standard`, `App Sessions Standard` | high | Apple's example response, Apple forum threads, several open-source importers |
| Subscription report names | medium-low | Not in Apple's docs. One importer uses `App Store Subscription Event Report Standard` / `App Store Subscription State Report Standard`; others use the doc titles. The matcher accepts both. Confirm with `reports`. |
| `impressions` and `page_views` matching the ASC dashboard | medium | Built from Apple's metric definitions; verify against the dashboard for a few complete days |
| Segment `checksum` algorithm | low | Looks like MD5 of the .gz file; a mismatch is only a warning |

## Table contract

- `groundapp_asc_daily(date, metric, dim, value, report, updated_at)`, PK `(date, metric, dim)`. `dim` is `total`, `source:<Apple source type>` (for example `source:App Store search`, `source:Web referrer`) or `campaign:<token>` (for example `campaign:site-hero`). Totals are always written (zero included); dims only when non-zero. No territory/device/version breakdowns.
- `groundapp_asc_imports(instance_id, report_name, granularity, processing_date, rows_imported, imported_at)`. `rows_imported` = rows this instance contributed to `groundapp_asc_daily`.
- `groundapp_asc_state(key, value)`: `requests` (`{appId, ongoing, snapshots[], stopped[]}`), `watermarks` (`{"family:level": {date: processingDate}}`, last 70 days), `last_run` (counts and first errors).

## Known limits

- **Lag.** A day is complete 2 days later for downloads, 3 for engagement and subscriptions, up to 5 for installs and sessions. Recent days fill in and get restated as newer instances arrive; the sync handles that.
- **Thresholds.** Detailed reports drop rows from fewer than 5 users or devices, and usage reports (sessions, installs) aren't generated at all for a day with fewer than 5 opted-in users. Small campaigns may show nothing or undercount.
- **Noise.** Detailed values carry random noise (about +/-2 typical, +/-6 worst case), so campaign numbers are approximate. Standard totals still won't exactly match the ASC dashboard; Apple's forums report small gaps.
- **Opt-in only.** Installs, deletions, sessions and active devices only count users who share analytics with developers.
- **Retention.** Instances are deleted after 35 days. If the Worker is off longer than that, request a new snapshot (`node scripts/asc.mjs request --snapshot`, Admin key, once per month max) and run `sync --write` locally.
- **Inactivity.** If nobody reads the reports for a long time Apple marks the request `stoppedDueToInactivity`. Re-run `node scripts/asc.mjs request` with the Admin key; it creates a fresh ONGOING request and updates the stored id.
- **Untested against Apple.** Built from the docs and verified with fixtures only. First real run: `reports`, then `sync --dry-run`, and check `unmapped` and `columnsSeen` in the output.
