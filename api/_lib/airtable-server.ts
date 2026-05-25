/**
 * Server-side Airtable Client
 * For use in Vercel serverless functions
 */

import { CreatorSocialLinks, MetricsUpdate, PlatformScrapeTask, isOlderThanDays, isInCooldown } from './scrapers/types.js';

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

export function getAirtableConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableId = process.env.AIRTABLE_TABLE_ID;

  if (!apiKey || !baseId || !tableId) {
    throw new Error('Airtable configuration missing. Required: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID');
  }

  return { apiKey, baseId, tableId };
}

/**
 * Airtable record structure
 */
interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

/**
 * Fetch all creators with social media links from Airtable
 * Includes last updated timestamps for smart scheduling
 */
export async function fetchCreatorsWithSocialLinks(): Promise<CreatorSocialLinks[]> {
  const { apiKey, baseId, tableId } = getAirtableConfig();

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  // Filter to only get records with at least one social link
  const filterFormula = "OR({Tiktok} != '', {Youtube} != '', {Instagram} != '')";

  do {
    const url = new URL(`${AIRTABLE_API_BASE}/${baseId}/${tableId}`);
    url.searchParams.set('filterByFormula', filterFormula);
    // Only fetch the fields we need
    url.searchParams.set('fields[]', 'Full Name');
    url.searchParams.append('fields[]', 'Tiktok');
    url.searchParams.append('fields[]', 'Youtube');
    url.searchParams.append('fields[]', 'Instagram');
    url.searchParams.append('fields[]', 'TikTok Last Updated');
    url.searchParams.append('fields[]', 'YouTube Last Updated');
    url.searchParams.append('fields[]', 'Instagram Last Updated');
    url.searchParams.append('fields[]', 'Instagram Followers Last Updated');
    // Failure tracking fields
    url.searchParams.append('fields[]', 'TikTok Last Failure');
    url.searchParams.append('fields[]', 'YouTube Last Failure');
    url.searchParams.append('fields[]', 'Instagram Last Failure');
    url.searchParams.append('fields[]', 'Instagram Followers Last Failure');

    if (offset) {
      url.searchParams.set('offset', offset);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as AirtableResponse;
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  // Map to CreatorSocialLinks
  return allRecords.map(record => ({
    recordId: record.id,
    name: String(record.fields['Full Name'] || 'Unknown'),
    tiktokUrl: record.fields['Tiktok'] ? String(record.fields['Tiktok']) : undefined,
    youtubeUrl: record.fields['Youtube'] ? String(record.fields['Youtube']) : undefined,
    instagramUrl: record.fields['Instagram'] ? String(record.fields['Instagram']) : undefined,
    tiktokLastUpdated: record.fields['TikTok Last Updated'] ? String(record.fields['TikTok Last Updated']) : undefined,
    youtubeLastUpdated: record.fields['YouTube Last Updated'] ? String(record.fields['YouTube Last Updated']) : undefined,
    instagramLastUpdated: record.fields['Instagram Last Updated'] ? String(record.fields['Instagram Last Updated']) : undefined,
    instagramFollowersLastUpdated: record.fields['Instagram Followers Last Updated'] ? String(record.fields['Instagram Followers Last Updated']) : undefined,
    // Failure tracking fields
    tiktokLastFailure: record.fields['TikTok Last Failure'] ? String(record.fields['TikTok Last Failure']) : undefined,
    youtubeLastFailure: record.fields['YouTube Last Failure'] ? String(record.fields['YouTube Last Failure']) : undefined,
    instagramLastFailure: record.fields['Instagram Last Failure'] ? String(record.fields['Instagram Last Failure']) : undefined,
    instagramFollowersLastFailure: record.fields['Instagram Followers Last Failure'] ? String(record.fields['Instagram Followers Last Failure']) : undefined,
  }));
}

/**
 * Build a priority queue of platform scrape tasks
 * Prioritizes platforms that haven't been scraped or are older than specified days
 */
export function buildScrapeQueue(
  creators: CreatorSocialLinks[],
  maxAgeDays: number = 10
): PlatformScrapeTask[] {
  const tasks: PlatformScrapeTask[] = [];

  for (const creator of creators) {
    // Check TikTok (skip if in cooldown from recent failure)
    if (creator.tiktokUrl &&
        isOlderThanDays(creator.tiktokLastUpdated, maxAgeDays) &&
        !isInCooldown(creator.tiktokLastFailure)) {
      tasks.push({
        recordId: creator.recordId,
        creatorName: creator.name,
        platform: 'tiktok',
        url: creator.tiktokUrl,
        lastUpdated: creator.tiktokLastUpdated,
      });
    }

    // Check YouTube (skip if in cooldown from recent failure)
    if (creator.youtubeUrl &&
        isOlderThanDays(creator.youtubeLastUpdated, maxAgeDays) &&
        !isInCooldown(creator.youtubeLastFailure)) {
      tasks.push({
        recordId: creator.recordId,
        creatorName: creator.name,
        platform: 'youtube',
        url: creator.youtubeUrl,
        lastUpdated: creator.youtubeLastUpdated,
      });
    }

    // Check Instagram engagement (skip if in cooldown from recent failure)
    if (creator.instagramUrl &&
        isOlderThanDays(creator.instagramLastUpdated, maxAgeDays) &&
        !isInCooldown(creator.instagramLastFailure)) {
      tasks.push({
        recordId: creator.recordId,
        creatorName: creator.name,
        platform: 'instagram',
        url: creator.instagramUrl,
        lastUpdated: creator.instagramLastUpdated,
      });
    }

    // Check Instagram Followers (skip if in cooldown from recent failure)
    if (creator.instagramUrl &&
        isOlderThanDays(creator.instagramFollowersLastUpdated, maxAgeDays) &&
        !isInCooldown(creator.instagramFollowersLastFailure)) {
      tasks.push({
        recordId: creator.recordId,
        creatorName: creator.name,
        platform: 'instagram-followers',
        url: creator.instagramUrl,
        lastUpdated: creator.instagramFollowersLastUpdated,
      });
    }
  }

  // Sort by oldest first (null = highest priority, then by date)
  tasks.sort((a, b) => {
    if (!a.lastUpdated && !b.lastUpdated) return 0;
    if (!a.lastUpdated) return -1;
    if (!b.lastUpdated) return 1;
    return new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
  });

  return tasks;
}

/**
 * Update a creator's metrics in Airtable
 */
export async function updateCreatorMetrics(
  recordId: string,
  metrics: MetricsUpdate
): Promise<{ success: boolean; error?: string }> {
  const { apiKey, baseId, tableId } = getAirtableConfig();

  if (Object.keys(metrics).length === 0) {
    return { success: true }; // Nothing to update
  }

  try {
    const url = `${AIRTABLE_API_BASE}/${baseId}/${tableId}/${recordId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: metrics }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Airtable update error (${response.status}): ${errorText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Batch update multiple records (more efficient for many updates)
 * Airtable supports up to 10 records per batch request
 */
export async function batchUpdateCreatorMetrics(
  updates: Array<{ recordId: string; metrics: MetricsUpdate }>
): Promise<{ success: boolean; errors?: string[] }> {
  const { apiKey, baseId, tableId } = getAirtableConfig();

  if (updates.length === 0) {
    return { success: true };
  }

  const errors: string[] = [];
  const batchSize = 10;

  // Process in batches of 10
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    const records = batch.map(({ recordId, metrics }) => ({
      id: recordId,
      fields: metrics,
    }));

    try {
      const url = `${AIRTABLE_API_BASE}/${baseId}/${tableId}`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        errors.push(`Batch ${i / batchSize + 1} failed: ${errorText}`);
      }
    } catch (error) {
      errors.push(`Batch ${i / batchSize + 1} network error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Record a scrape failure for a specific platform
 * Sets the last failure timestamp to now
 */
export async function updateFailureTracking(
  recordId: string,
  platform: 'tiktok' | 'youtube' | 'instagram' | 'instagram-followers'
): Promise<{ success: boolean; error?: string }> {
  const fieldMap: Record<string, string> = {
    'tiktok': 'TikTok Last Failure',
    'youtube': 'YouTube Last Failure',
    'instagram': 'Instagram Last Failure',
    'instagram-followers': 'Instagram Followers Last Failure',
  };

  const field = fieldMap[platform];
  return updateCreatorMetrics(recordId, { [field]: new Date().toISOString() } as MetricsUpdate);
}

/**
 * Clear failure tracking after a successful scrape
 * Resets the last failure timestamp
 */
export async function clearFailureTracking(
  recordId: string,
  platform: 'tiktok' | 'youtube' | 'instagram' | 'instagram-followers'
): Promise<{ success: boolean; error?: string }> {
  const fieldMap: Record<string, string> = {
    'tiktok': 'TikTok Last Failure',
    'youtube': 'YouTube Last Failure',
    'instagram': 'Instagram Last Failure',
    'instagram-followers': 'Instagram Followers Last Failure',
  };

  const field = fieldMap[platform];
  // Set to empty string to clear the field in Airtable
  return updateCreatorMetrics(recordId, { [field]: '' } as MetricsUpdate);
}
