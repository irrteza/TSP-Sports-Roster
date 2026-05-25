/**
 * Social Media Metrics Scraper - Cron Job
 *
 * This endpoint runs on a schedule (every 30 days) to scrape social media metrics
 * for creators and update their records in Airtable.
 *
 * Features:
 * - Smart scheduling: Only scrapes platforms that haven't been updated in 30+ days
 * - Priority queue: Oldest/never-scraped platforms are processed first
 * - Batch processing: Handles multiple creators per run within timeout limits
 * - Error resilience: Continues processing on individual failures
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchCreatorsWithSocialLinks, buildScrapeQueue, updateCreatorMetrics, updateFailureTracking, clearFailureTracking } from '../_lib/airtable-server.js';
import { scrapeTikTokMetrics } from '../_lib/scrapers/tiktok.js';
import { scrapeYouTubeMetrics } from '../_lib/scrapers/youtube.js';
import { scrapeInstagramMetrics } from '../_lib/scrapers/instagram.js';
import { scrapeInstagramFollowers } from '../_lib/scrapers/instagram-followers.js';
import { MetricsUpdate, PlatformScrapeTask, SocialMetrics } from '../_lib/scrapers/types.js';

// Maximum number of platform scrapes per cron run
// Keep low to stay within Vercel's 60-second timeout (~15-20s per scrape)
const MAX_SCRAPES_PER_RUN = 1;

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
 * Vercel cron jobs send the x-vercel-cron header automatically
 */
function verifyAuth(req: VercelRequest): boolean {
  // Vercel cron jobs send this header automatically
  if (req.headers['x-vercel-cron'] === '1') {
    return true;
  }

  // Manual trigger with Authorization header (for testing)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }

  // In local development, allow all requests
  if (process.env.VERCEL_ENV !== 'production') {
    return true;
  }

  return false;
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
    // 1. Fetch all creators with social links
    console.log('Fetching creators from Airtable...');
    const creators = await fetchCreatorsWithSocialLinks();
    console.log(`Found ${creators.length} creators with social links`);

    // 2. Build priority queue of scrape tasks
    const queue = buildScrapeQueue(creators, SCRAPE_AGE_DAYS);
    console.log(`${queue.length} platform scrapes needed (older than ${SCRAPE_AGE_DAYS} days)`);

    if (queue.length === 0) {
      return res.status(200).json({
        message: 'All platforms are up to date',
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
    const updates: Array<{ recordId: string; metrics: MetricsUpdate }> = [];

    for (const task of tasksToProcess) {
      console.log(`Scraping ${task.platform} for ${task.creatorName}...`);
      const result = await scrapeTask(task);
      results.push(result);

      if (result.success && result.metrics) {
        const metricsUpdate = buildMetricsUpdate(task, result.metrics);
        updates.push({ recordId: task.recordId, metrics: metricsUpdate });

        // Update Airtable immediately for each successful scrape
        // This ensures progress is saved even if the function times out
        console.log(`Updating Airtable for ${task.creatorName} (${task.platform})...`);
        await updateCreatorMetrics(task.recordId, metricsUpdate);

        // Clear any previous failure tracking on success
        await clearFailureTracking(task.recordId, task.platform);
      } else {
        console.log(`Failed: ${result.error}`);

        // Record the failure so this task enters cooldown and won't be retried immediately
        console.log(`Recording failure for ${task.creatorName} (${task.platform})...`);
        await updateFailureTracking(task.recordId, task.platform);
      }
    }

    // 5. Build summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const summary = {
      message: 'Scraping complete',
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
          followers: r.metrics?.followers || r.metrics?.subscribers,
        } : undefined,
      })),
      durationMs: Date.now() - startTime,
    };

    console.log('Scraping summary:', JSON.stringify(summary, null, 2));

    return res.status(200).json(summary);
  } catch (error) {
    console.error('Cron job error:', error);

    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
  }
}
