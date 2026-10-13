# Roster metrics scraping

Daily Vercel jobs refresh each valid profile once per UTC calendar month.
Stable record IDs distribute refresh dates across days 1-21, leaving the final
week for retries. Never-scraped or 45-day-overdue records are eligible immediately.
A successful save in the current month prevents another monthly refresh. Instagram follower
batches run at `03:00 UTC`; the other jobs each own a platform and a stable shard
of record IDs. `vercel.json` lists the deployed schedules. The main roster has
eight TikTok queues, five YouTube queues and ten Instagram engagement queues;
the smaller rosters have one queue for each platform. Each queue runs once daily.
Each invocation batches up to 50 Instagram follower profiles in one actor run,
then processes up to 10 other platform tasks, oldest first, sequentially.
The dedicated `apify/instagram-followers-count-scraper` actor gets a 120-second
budget. Follower results are matched by username, with writes batched ten records at a time. It stops
starting tasks after 200 seconds, leaving up to 100 seconds for the final Apify
request and Airtable writes. Backlog remaining is reported in the response.
Individual failures retain existing metrics and enter the existing seven-day
cooldown. Queue emptiness can mean either current metrics or tasks in cooldown.

## Deployment requirements

Set these **server-only Production** environment variables on every roster
project, then redeploy after changes:

- `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_ID`
- `APIFY_KEY` (also accepts `APIFY_API_KEY` or `APIFY_TOKEN`)
- `CRON_SECRET`: Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.

The cron function is configured for 300 seconds. On Vercel Hobby, this requires
Fluid compute. An older project with Fluid disabled has a 60-second Hobby limit;
verify the project's compute setting before deploying. Pro supports 300 seconds
with either compute mode. Do not remove authentication to fix a 401.

Airtable must contain the metric, last-updated and last-failure fields referenced
in `api/_lib/airtable-server.ts` and `api/_lib/scrapers/types.ts`.
The API key must be permitted to read and write the configured base/table.
Successful metrics, freshness and clearing of the last-failure timestamp are
written in one PATCH, and count as success only after Airtable accepts it.

## Verification

1. Run `npm run test:scrapers`, `npm run typecheck:api`, and `npm run build`.
2. Call the deployed `/api/cron/scrape-metrics?dryRun=1` with the bearer secret.
   This checks server configuration and Airtable reads and reports eligible queue
   counts without running paid actors or changing records. It does not prove the
   Apify credential is valid, credit is available, or Airtable writes will work.
3. Run the deployed cron once with the same bearer header. Check `successful`,
   `failed`, `remainingInQueue` and each result. A failed scrape/write returns 502;
   missing configuration or an Airtable read failure returns 500.
4. Read back the changed Airtable counts and timestamps, then check the public
   roster uses those values. Confirm a later **scheduled** invocation runs too.

An HTTP 200 from an Apify actor can contain error records. The client rejects
these rather than allowing engagement averages to be replaced by zeros.
For follower batches, provider error items are isolated per username so one
unavailable profile does not discard valid counts for the others.
An empty dataset or missing/negative/non-finite Instagram follower count is also
a failure. A genuine zero follower count is valid.

## Capacity

The prior limit was one platform task per day: about 30 tasks/month. A creator
can have four tasks (TikTok, YouTube, Instagram engagement and Instagram followers).
The Instagram follower ceiling is 50/day (about 1,500/month). Each other daily
platform/shard job can process up to ten tasks within its 200-second work-start
budget. Main-roster queues are split to handle its 632 TikTok, 382 YouTube and
749 Instagram profiles. Failed or unavailable profiles enter cooldown and retain
prior counts; successful refreshes become eligible on their assigned day in the next month.
Slow providers and future roster growth can still reduce throughput.
Use queue counts and scheduled-run results to check whether the roster fits.
If backlog grows beyond capacity, move collection to a durable asynchronous queue
or increase schedule frequency on a plan that supports it; increasing timeout alone
will not guarantee freshness for an arbitrarily large roster.

References:
- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://vercel.com/docs/functions/configuring-functions/duration
- https://docs.apify.com/api/v2/actor-run-sync-get-dataset-items-post
