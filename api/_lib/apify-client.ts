/**
 * Apify API Client
 * Wrapper for running Apify actors and retrieving results
 */

const APIFY_API_BASE = 'https://api.apify.com/v2';

export interface ApifyRunOptions {
  actorId: string;
  input: Record<string, unknown>;
  timeoutSecs?: number;
}

export interface ApifyDatasetItem {
  [key: string]: unknown;
}

/**
 * Run an Apify actor synchronously and return the dataset items
 * Uses the run-sync-get-dataset-items endpoint for efficiency
 */
export async function runApifyActor(options: ApifyRunOptions): Promise<ApifyDatasetItem[]> {
  const { actorId, input, timeoutSecs = 120 } = options;
  const apiKey = process.env.APIFY_KEY;

  if (!apiKey) {
    throw new Error('APIFY_KEY environment variable is not set');
  }

  // Actor IDs use ~ separator in API URLs (e.g., "apify~instagram-post-scraper")
  const normalizedActorId = actorId.replace('/', '~');
  const url = `${APIFY_API_BASE}/acts/${normalizedActorId}/run-sync-get-dataset-items?token=${apiKey}&timeout=${timeoutSecs}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apify API error (${response.status}): ${errorText}`);
  }

  const items = await response.json();
  return Array.isArray(items) ? items : [];
}

/**
 * Run an Apify actor asynchronously (for longer-running tasks)
 * Returns the run ID which can be polled for completion
 */
export async function startApifyActor(options: ApifyRunOptions): Promise<string> {
  const { actorId, input } = options;
  const apiKey = process.env.APIFY_KEY;

  if (!apiKey) {
    throw new Error('APIFY_KEY environment variable is not set');
  }

  const url = `${APIFY_API_BASE}/acts/${actorId}/runs?token=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apify API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as { data?: { id?: string } };
  return data.data?.id ?? '';
}

/**
 * Get the status of an Apify run
 */
export async function getApifyRunStatus(runId: string): Promise<{
  status: string;
  datasetId?: string;
}> {
  const apiKey = process.env.APIFY_KEY;

  if (!apiKey) {
    throw new Error('APIFY_KEY environment variable is not set');
  }

  const url = `${APIFY_API_BASE}/actor-runs/${runId}?token=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apify API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as { data?: { status?: string; defaultDatasetId?: string } };
  return {
    status: data.data?.status ?? '',
    datasetId: data.data?.defaultDatasetId,
  };
}

/**
 * Get items from an Apify dataset
 */
export async function getApifyDatasetItems(datasetId: string): Promise<ApifyDatasetItem[]> {
  const apiKey = process.env.APIFY_KEY;

  if (!apiKey) {
    throw new Error('APIFY_KEY environment variable is not set');
  }

  const url = `${APIFY_API_BASE}/datasets/${datasetId}/items?token=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apify API error (${response.status}): ${errorText}`);
  }

  const items = await response.json();
  return Array.isArray(items) ? items : [];
}
