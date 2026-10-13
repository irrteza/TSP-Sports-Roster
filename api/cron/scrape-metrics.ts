/**
 * Social Media Metrics Scraper - Cron Job
 *
 * This endpoint runs daily to refresh social media metrics older than 30 days
 * for creators and update their records in Airtable.
 *
 * Features:
 * - Smart scheduling: Only scrapes platforms that haven't been updated in 30+ days
 * - Priority queue: Oldest/never-scraped platforms are processed first
 * - Batch processing: Handles multiple creators per run within timeout limits
 * - Error resilience: Continues processing on individual failures
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { fetchCreatorsWithSocialLinks, buildScrapeQueue, updateCreatorMetrics, updateFailureTracking, getAirtableConfig } from '../_lib/airtable-server.js';
import { getApifyKey } from '../_lib/apify-client.js';
import { scrapeTikTokMetrics } from '../_lib/scrapers/tiktok.js';
import { scrapeYouTubeMetrics } from '../_lib/scrapers/youtube.js';
import { scrapeInstagramMetrics } from '../_lib/scrapers/instagram.js';
import { scrapeInstagramFollowers } from '../_lib/scrapers/instagram-followers.js';
import { MetricsUpdate, PlatformScrapeTask, SocialMetrics } from '../_lib/scrapers/types.js';

// A daily single-task limit cannot refresh a roster with >30 platform tasks/month.
const MAX_SCRAPES_PER_RUN = 10;
// Stop starting work early enough for a 65s Apify request and two 10s Airtable
// requests to finish before the 300s function limit. Tasks run sequentially.
const START_WORK_DEADLINE_MS = 200000;

// Number of days before a platform needs re-scraping
const SCRAPE_AGE_DAYS = 30;

interface ScrapeResult {
  task: PlatformScrapeTask;
  success: boolean;
  metrics?: SocialMetrics;
  error?: string;
  durationMs: number;
}

/**
 * Verify the request is authorized
 * Vercel sends Authorization: Bearer <CRON_SECRET> for scheduled invocations.
 */
function verifyAuth(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const expected = Buffer.from(`Bearer ${secret}`);
    const actual = Buffer.from(typeof authHeader === 'string' ? authHeader : '');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  // An unset VERCEL_ENV is also possible on deployed platforms; fail closed.
  return process.env.NODE_ENV === 'development' && !process.env.VERCEL;
}

/**
 * Scrape metrics for a single platform task
 */
async function scrapeTask(task: PlatformScrapeTask): Promise<ScrapeResult> {
  const startTime = Date.now();

  try {
    let result;

    switch (task.platform) {
      case 'tiktok':
        result = await scrapeTikTokMetrics(task.url);
        break;
      case 'youtube':
        result = await scrapeYouTubeMetrics(task.url);
        break;
      case 'instagram':
        result = await scrapeInstagramMetrics(task.url);
        break;
      case 'instagram-followers':
        result = await scrapeInstagramFollowers(task.url);
        break;
      default:
        throw new Error(`Unknown platform: ${task.platform}`);
    }

    return {
      task,
      success: result.success,
      metrics: result.metrics,
      error: result.error,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      task,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Build Airtable update fields from scrape result
 */
function buildMetricsUpdate(task: PlatformScrapeTask, metrics: SocialMetrics): MetricsUpdate {
  const now = new Date().toISOString();

  switch (task.platform) {
    case 'tiktok':
      return {
        'TikTok Avg Likes': metrics.avgLikes,
        'TikTok Avg Comments': metrics.avgComments,
        'TikTok Avg Shares': metrics.avgShares,
        'TikTok Avg Views': metrics.avgViews,
        'TikTok Avg Saves': metrics.avgSaves,
        'TikTok Followers (Scraped)': metrics.followers,
        'TikTok Total Likes': metrics.totalLikes,
        'TikTok Total Videos': metrics.totalVideos,
        'TikTok Last Updated': now,
      };

    case 'youtube':
      return {
        'YouTube Avg Likes': metrics.avgLikes,
        'YouTube Avg Comments': metrics.avgComments,
        'YouTube Avg Views': metrics.avgViews,
        'YouTube Subscribers': metrics.subscribers,
        'YouTube Total Views': metrics.totalViews,
        'YouTube Total Videos': metrics.totalVideos,
        'YouTube Last Updated': now,
      };

    case 'instagram':
      return {
        'Instagram Avg Likes': metrics.avgLikes,
        'Instagram Avg Comments': metrics.avgComments,
        'Instagram Avg Views': metrics.avgViews,
        'Instagram Last Updated': now,
      };

    case 'instagram-followers':
      return {
        'Instagram Followers (Scraped)': metrics.followers,
        'Instagram Followers Last Updated': now,
      };

    default:
      return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  // Only allow GET requests (Vercel cron uses GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authorization
  if (!verifyAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fail before any network requests when server credentials are missing.
    getApifyKey();
    getAirtableConfig();
    // 1. Fetch all creators with social links
    console.log('Fetching creators from Airtable...');
    const creators = await fetchCreatorsWithSocialLinks();
    console.log(`Found ${creators.length} creators with social links`);

    // 2. Build priority queue of scrape tasks
    const queue = buildScrapeQueue(creators, SCRAPE_AGE_DAYS);
    console.log(`${queue.length} platform scrapes needed (older than ${SCRAPE_AGE_DAYS} days)`);

    // Read-only diagnostic: no Apify runs and no Airtable writes.
    if (req.query.dryRun === '1') {
      return res.status(200).json({
        message: 'Scrape queue diagnostic',
        totalCreators: creators.length,
        tasksInQueue: queue.length,
        maxTasksPerRun: MAX_SCRAPES_PER_RUN,
        tasksByPlatform: Object.fromEntries(
          ['tiktok', 'youtube', 'instagram', 'instagram-followers'].map(platform =>
            [platform, queue.filter(task => task.platform === platform).length]),
        ),
        processed: 0,
      });
    }

    if (queue.length === 0) {
      return res.status(200).json({
        message: 'No tasks eligible (fresh or in failure cooldown)',
        totalCreators: creators.length,
        tasksInQueue: 0,
        processed: 0,
        durationMs: Date.now() - startTime,
      });
    }

    // 3. Take the first N tasks from the queue
    const tasksToProcess = queue.slice(0, MAX_SCRAPES_PER_RUN);
    console.log(`Processing ${tasksToProcess.length} tasks this run`);

    // 4. Process each task sequentially (to avoid rate limits)
    const results: ScrapeResult[] = [];
    for (const task of tasksToProcess) {
      if (Date.now() - startTime >= START_WORK_DEADLINE_MS) break;
      console.log(`Scraping ${task.platform} for ${task.creatorName}...`);
      const result = await scrapeTask(task);

      if (result.success && result.metrics) {
        const metricsUpdate = buildMetricsUpdate(task, result.metrics);
        const failureFields = {
          tiktok: 'TikTok Last Failure', youtube: 'YouTube Last Failure',
          instagram: 'Instagram Last Failure', 'instagram-followers': 'Instagram Followers Last Failure',
        };
        // Save counts, freshness and cooldown clearing atomically. Never report
        // success unless Airtable accepted the update.
        console.log(`Updating Airtable for ${task.creatorName} (${task.platform})...`);
        const saved = await updateCreatorMetrics(task.recordId, {
          ...metricsUpdate, [failureFields[task.platform]]: null,
        });
        if (!saved.success) {
          result.success = false;
          result.error = saved.error || 'Airtable did not save the metrics';
        }
      }
      if (!result.success) {
        console.log(`Failed: ${result.error}`);

        // Record the failure so this task enters cooldown and won't be retried immediately
        console.log(`Recording failure for ${task.creatorName} (${task.platform})...`);
        const tracked = await updateFailureTracking(task.recordId, task.platform);
        if (!tracked.success) {
          result.error = `${result.error}; failure tracking also failed: ${tracked.error}`;
        }
      }
      results.push(result);
    }

    // 5. Build summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const summary = {
      message: failed ? 'Scraping finished with failures' : 'Scraping complete',
      totalCreators: creators.length,
      tasksInQueue: queue.length,
      processed: results.length,
      successful,
      failed,
      remainingInQueue: queue.length - results.length,
      results: results.map(r => ({
        creator: r.task.creatorName,
        platform: r.task.platform,
        success: r.success,
        error: r.error,
        durationMs: r.durationMs,
        metrics: r.success ? {
          avgLikes: r.metrics?.avgLikes,
          avgComments: r.metrics?.avgComments,
          avgViews: r.metrics?.avgViews,
          followers: r.metrics?.followers ?? r.metrics?.subscribers,
        } : undefined,
      })),
      durationMs: Date.now() - startTime,
    };

    console.log('Scraping summary:', JSON.stringify(summary, null, 2));

    // A failed scrape/write must be visible to cron monitoring.
    return res.status(failed ? 502 : 200).json(summary);
  } catch (error) {
    console.error('Cron job error:', error);

    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
  }
}
