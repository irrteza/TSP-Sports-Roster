# Roster metrics scraping

The daily Vercel cron at `03:00 UTC` refreshes platform metrics older than 30 days.
Each invocation processes up to 10 tasks, oldest first, sequentially. It stops
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
An empty dataset or missing/negative/non-finite Instagram follower count is also
a failure. A genuine zero follower count is valid.

## Capacity

The prior limit was one platform task per day: about 30 tasks/month. A creator
can have four tasks (TikTok, YouTube, Instagram engagement and Instagram followers).
The new ceiling is 10/day (about 300/month), but slow runs reduce actual throughput.
Use queue counts and scheduled-run results to check whether the roster fits.
If backlog grows beyond capacity, move collection to a durable asynchronous queue
or increase schedule frequency on a plan that supports it; increasing timeout alone
will not guarantee freshness for an arbitrarily large roster.

References:
- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://vercel.com/docs/functions/configuring-functions/duration
- https://docs.apify.com/api/v2/actor-run-sync-get-dataset-items-post
