/** Server-only Apify client. Never put credentials in URLs or logs. */
const APIFY_API_BASE = 'https://api.apify.com/v2';

export interface ApifyRunOptions {
  actorId: string;
  input: Record<string, unknown>;
  timeoutSecs?: number;
}

export interface ApifyDatasetItem {
  [key: string]: unknown;
}

export function getApifyKey(): string {
  const key = process.env.APIFY_KEY?.trim() || process.env.APIFY_API_KEY?.trim() || process.env.APIFY_TOKEN?.trim();
  if (!key) throw new Error('Apify configuration missing. Set APIFY_KEY, APIFY_API_KEY or APIFY_TOKEN on the server.');
  return key;
}

async function requestApify(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<unknown> {
  const key = getApifyKey();
  const response = await fetch(`${APIFY_API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...init.headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const body = (await response.text()).split(key).join('[redacted]').slice(0, 1500);
    throw new Error(`Apify API error (${response.status}): ${body}`);
  }
  return response.json();
}

function actorPath(actorId: string): string {
  return `/acts/${encodeURIComponent(actorId.replace('/', '~'))}`;
}

function datasetItems(value: unknown): ApifyDatasetItem[] {
  if (!Array.isArray(value)) throw new Error('Apify returned an invalid dataset response (expected an array)');
  for (const item of value) {
    if (!item || typeof item !== 'object') throw new Error('Apify returned an invalid dataset item');
    // Actors can return HTTP 200 with error records instead of profile/post data.
    if (item.error || item.errorDescription) {
      throw new Error(`Apify scrape failed: ${String(item.errorDescription || item.error).slice(0, 1000)}`);
    }
  }
  return value;
}

export async function runApifyActor(options: ApifyRunOptions): Promise<ApifyDatasetItem[]> {
  const { actorId, input, timeoutSecs = 120 } = options;
  const data = await requestApify(
    `${actorPath(actorId)}/run-sync-get-dataset-items?timeout=${timeoutSecs}`,
    { method: 'POST', body: JSON.stringify(input) },
    (timeoutSecs + 5) * 1000,
  );
  return datasetItems(data);
}

export async function startApifyActor(options: ApifyRunOptions): Promise<string> {
  const { actorId, input, timeoutSecs = 300 } = options;
  const result = await requestApify(`${actorPath(actorId)}/runs?timeout=${timeoutSecs}`, {
    method: 'POST', body: JSON.stringify(input),
  }) as { data?: { id?: string } };
  if (!result.data?.id) throw new Error('Apify did not return a run ID');
  return result.data.id;
}

export async function getApifyRunStatus(runId: string): Promise<{ status: string; datasetId?: string }> {
  const result = await requestApify(`/actor-runs/${encodeURIComponent(runId)}`) as {
    data?: { status?: string; defaultDatasetId?: string };
  };
  if (!result.data?.status) throw new Error('Apify did not return a run status');
  return { status: result.data.status, datasetId: result.data.defaultDatasetId };
}

export async function getApifyDatasetItems(datasetId: string): Promise<ApifyDatasetItem[]> {
  return datasetItems(await requestApify(`/datasets/${encodeURIComponent(datasetId)}/items`));
}
