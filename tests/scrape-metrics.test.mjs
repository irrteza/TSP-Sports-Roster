import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const fromBuild = path => import(pathToFileURL(join(process.env.SCRAPER_TEST_BUILD_DIR, path)));
const { runApifyActor, startApifyActor, getApifyRunStatus, getApifyDatasetItems } = await fromBuild('_lib/apify-client.js');
const { scrapeInstagramFollowers } = await fromBuild('_lib/scrapers/instagram-followers.js');
const { default: handler } = await fromBuild('cron/scrape-metrics.js');
const initialEnv = { ...process.env };
const initialFetch = globalThis.fetch;
const initialNow = Date.now;
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
let calls;

beforeEach(() => {
  calls = [];
  for (const key of ['APIFY_KEY', 'APIFY_API_KEY', 'APIFY_TOKEN']) delete process.env[key];
  Object.assign(process.env, {
    APIFY_KEY: 'test-key', CRON_SECRET: 'test-secret', VERCEL_ENV: 'production',
    AIRTABLE_API_KEY: 'test-airtable', AIRTABLE_BASE_ID: 'test-base', AIRTABLE_TABLE_ID: 'test-table',
  });
});
afterEach(() => {
  globalThis.fetch = initialFetch;
  Date.now = initialNow;
  for (const key of Object.keys(process.env)) if (!(key in initialEnv)) delete process.env[key];
  Object.assign(process.env, initialEnv);
});

function apiMock(records, { item = { followersCount: 123 }, patchStatus = 200, advance = 0 } = {}) {
  let elapsed = 0;
  if (advance) Date.now = () => initialNow() + elapsed;
  globalThis.fetch = async (url, init = {}) => {
    const address = String(url);
    calls.push({ url: address, ...init });
    if (address.includes('api.apify.com')) {
      elapsed += advance;
      return json([item]);
    }
    if (init.method === 'PATCH') return json(patchStatus === 200 ? {} : { error: 'unknown field' }, patchStatus);
    return json({ records });
  };
}
function creator(id = 'rec1') {
  return { id, fields: { 'Full Name': id, Instagram: 'https://www.instagram.com/example/' } };
}
async function invoke({ headers = { authorization: 'Bearer test-secret' }, query = {}, method = 'GET' } = {}) {
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method, headers, query }, res);
  return res;
}

test('supports APIFY_API_KEY without putting the key in the URL', async () => {
  delete process.env.APIFY_KEY;
  process.env.APIFY_API_KEY = 'alias-key';
  globalThis.fetch = async (url, init) => {
    assert.ok(String(url).includes('/acts/apify~instagram-scraper/'));
    assert.ok(!String(url).includes('alias-key'));
    assert.equal(init.headers.Authorization, 'Bearer alias-key');
    assert.ok(init.signal instanceof AbortSignal);
    return json([{ followersCount: 1 }]);
  };
  assert.equal((await runApifyActor({ actorId: 'apify/instagram-scraper', input: {}, timeoutSecs: 60 }))[0].followersCount, 1);
});

test('supports the official APIFY_TOKEN alias', async () => {
  delete process.env.APIFY_KEY;
  process.env.APIFY_TOKEN = 'token-key';
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer token-key');
    return json([]);
  };
  await runApifyActor({ actorId: 'owner/actor', input: {} });
});

test('rejects missing credentials before making a paid request', async () => {
  delete process.env.APIFY_KEY;
  globalThis.fetch = () => assert.fail('must not call Apify');
  await assert.rejects(runApifyActor({ actorId: 'owner/actor', input: {} }), /configuration missing/);
});

test('normalizes actor IDs for asynchronous runs too', async () => {
  globalThis.fetch = async url => {
    assert.ok(String(url).includes('/acts/owner~actor/runs?timeout=300'));
    return json({ data: { id: 'run1' } });
  };
  assert.equal(await startApifyActor({ actorId: 'owner/actor', input: {} }), 'run1');
});

test('rejects missing run identifiers and missing run statuses', async () => {
  globalThis.fetch = async () => json({ data: {} });
  await assert.rejects(startApifyActor({ actorId: 'owner/actor', input: {} }), /run ID/);
  await assert.rejects(getApifyRunStatus('run1'), /run status/);
});

test('rejects HTTP 200 error records and malformed dataset responses', async () => {
  globalThis.fetch = async () => json([{ error: 'profile_not_found', errorDescription: 'Profile unavailable' }]);
  await assert.rejects(runApifyActor({ actorId: 'owner/actor', input: {} }), /Profile unavailable/);
  globalThis.fetch = async () => json({ unexpected: true });
  await assert.rejects(getApifyDatasetItems('dataset1'), /expected an array/);
});

test('redacts credentials from provider error messages', async () => {
  globalThis.fetch = async () => json({ error: 'bad test-key credential' }, 401);
  await assert.rejects(runApifyActor({ actorId: 'owner/actor', input: {} }), error =>
    error.message.includes('(401)') && !error.message.includes('test-key'));
});

test('keeps a real zero follower count and rejects negative counts', async () => {
  globalThis.fetch = async () => json([{ followersCount: 0 }]);
  assert.equal((await scrapeInstagramFollowers('@example')).metrics.followers, 0);
  globalThis.fetch = async () => json([{ followersCount: -1 }]);
  assert.equal((await scrapeInstagramFollowers('@example')).success, false);
});

test('rejects a forged cron header and unauthenticated preview requests', async () => {
  apiMock([]);
  assert.equal((await invoke({ headers: { 'x-vercel-cron': '1' } })).code, 401);
  process.env.VERCEL_ENV = 'preview';
  assert.equal((await invoke({ headers: {} })).code, 401);
  assert.equal(calls.length, 0);
});

test('dry run reports the queue without running Apify or writing Airtable', async () => {
  apiMock([creator()]);
  const res = await invoke({ query: { dryRun: '1' } });
  assert.equal(res.code, 200);
  assert.equal(res.body.tasksInQueue, 2);
  assert.equal(res.body.tasksByPlatform['instagram-followers'], 1);
  assert.equal(res.body.processed, 0);
  assert.equal(calls.length, 1);
});

test('processes multiple platforms and saves freshness and cooldown in one write', async () => {
  apiMock([creator('rec1'), creator('rec2')], { item: { followersCount: 0, likesCount: 4, commentsCount: 2 } });
  const res = await invoke();
  assert.equal(res.code, 200);
  assert.equal(res.body.successful, 4);
  const writes = calls.filter(call => call.method === 'PATCH').map(call => JSON.parse(call.body).fields);
  assert.equal(writes.length, 4);
  const followers = writes.filter(fields => 'Instagram Followers (Scraped)' in fields);
  assert.equal(followers.length, 2);
  assert.equal(followers[0]['Instagram Followers (Scraped)'], 0);
  assert.equal(followers[0]['Instagram Followers Last Failure'], null);
  assert.ok(followers[0]['Instagram Followers Last Updated']);
  assert.equal(res.body.results.find(r => r.platform === 'instagram-followers').metrics.followers, 0);
});

test('Airtable rejection is a failure and never counted as a successful scrape', async () => {
  apiMock([creator()], { patchStatus: 422 });
  const res = await invoke();
  assert.equal(res.code, 502);
  assert.equal(res.body.successful, 0);
  assert.equal(res.body.failed, 2);
  assert.match(res.body.results[0].error, /Airtable update error \(422\)/);
  assert.match(res.body.results[0].error, /failure tracking also failed/);
});

test('actor error records preserve metrics, record cooldown, and continue the queue', async () => {
  apiMock([creator()], { item: { error: 'blocked' } });
  const res = await invoke();
  assert.equal(res.code, 502);
  assert.equal(res.body.processed, 2);
  for (const call of calls.filter(c => c.method === 'PATCH')) {
    const fields = JSON.parse(call.body).fields;
    assert.equal(Object.keys(fields).length, 1);
    assert.ok(Object.keys(fields)[0].endsWith('Last Failure'));
  }
});

test('stops starting tasks before the runtime budget is exhausted', async () => {
  apiMock(Array.from({ length: 10 }, (_, i) => creator(`rec${i}`)), { advance: 65000 });
  const res = await invoke();
  assert.equal(res.body.processed, 4);
  assert.equal(res.body.remainingInQueue, 16);
});

test('missing configuration is an HTTP failure before any requests', async () => {
  delete process.env.APIFY_KEY;
  let requests = 0;
  globalThis.fetch = () => { requests++; throw new Error('unexpected request'); };
  const res = await invoke();
  assert.equal(res.code, 500);
  assert.match(res.body.details, /Apify configuration missing/);
  assert.equal(requests, 0);
});
