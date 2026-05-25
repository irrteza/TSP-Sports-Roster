/**
 * YouTube Channel Scraper
 * Uses Apify actor: streamers/youtube-scraper
 */

import { runApifyActor } from '../apify-client.js';
import { ScraperResult, SocialMetrics, calculateAverage } from './types.js';

const YOUTUBE_ACTOR_ID = 'streamers/youtube-scraper';

/**
 * Extract YouTube channel identifier from various URL formats
 * Handles:
 * - https://www.youtube.com/@channelname
 * - https://www.youtube.com/channel/UC...
 * - https://www.youtube.com/c/channelname
 * - https://www.youtube.com/user/username
 * - https://www.youtube.com/channelname (bare vanity URL)
 * - @channelname
 */
export function extractYouTubeChannel(url: string): { type: 'handle' | 'channelId' | 'custom' | 'user'; value: string } | null {
  if (!url) return null;

  const cleaned = url.trim();

  // Handle @channelname format (without URL)
  if (cleaned.startsWith('@')) {
    return { type: 'handle', value: cleaned };
  }

  // Handle full URLs
  try {
    // Try to parse as URL
    const urlObj = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
    const pathname = urlObj.pathname;

    // @handle format in URL
    const handleMatch = pathname.match(/^\/@([a-zA-Z0-9_-]+)/);
    if (handleMatch) {
      return { type: 'handle', value: `@${handleMatch[1]}` };
    }

    // /channel/UC... format
    const channelMatch = pathname.match(/^\/channel\/(UC[a-zA-Z0-9_-]+)/);
    if (channelMatch) {
      return { type: 'channelId', value: channelMatch[1] };
    }

    // /c/customname format
    const customMatch = pathname.match(/^\/c\/([a-zA-Z0-9_-]+)/);
    if (customMatch) {
      return { type: 'custom', value: customMatch[1] };
    }

    // /user/username format
    const userMatch = pathname.match(/^\/user\/([a-zA-Z0-9_-]+)/);
    if (userMatch) {
      return { type: 'user', value: userMatch[1] };
    }

    // Fallback: bare /username format (vanity URL without prefix)
    // YouTube redirects these to the appropriate channel
    const bareMatch = pathname.match(/^\/([a-zA-Z0-9_-]+)\/?$/);
    if (bareMatch) {
      return { type: 'handle', value: `@${bareMatch[1]}` };
    }
  } catch {
    // Not a valid URL, try as plain handle
    if (/^[a-zA-Z0-9_-]+$/.test(cleaned)) {
      return { type: 'handle', value: `@${cleaned}` };
    }
  }

  return null;
}

/**
 * YouTube video data structure from the scraper
 * Field names from streamers/youtube-scraper actor
 */
interface YouTubeVideo {
  id?: string;
  title?: string;
  viewCount?: number;
  likes?: number;              // Note: field is 'likes', not 'likeCount'
  commentsCount?: number;      // Note: field is 'commentsCount', not 'commentCount'
  date?: string;
  channelName?: string;
  channelId?: string;
  numberOfSubscribers?: number;
  channelTotalVideos?: number; // Total videos on channel
  channelTotalViews?: number;  // Total views on channel
}

/**
 * Scrape YouTube channel metrics
 * Returns average metrics from last 10 videos + subscriber count
 */
export async function scrapeYouTubeMetrics(channelUrl: string): Promise<ScraperResult> {
  const channelInfo = extractYouTubeChannel(channelUrl);

  if (!channelInfo) {
    return {
      success: false,
      error: `Invalid YouTube URL or channel: ${channelUrl}`,
    };
  }

  try {
    // Build the search/scrape input based on channel type
    let input: Record<string, unknown>;

    if (channelInfo.type === 'handle') {
      // For handles, we can use the channel URL directly
      input = {
        startUrls: [{ url: `https://www.youtube.com/${channelInfo.value}/videos` }],
        maxResults: 10,
        maxResultsShorts: 0,
        maxResultStreams: 0,
      };
    } else if (channelInfo.type === 'channelId') {
      input = {
        startUrls: [{ url: `https://www.youtube.com/channel/${channelInfo.value}/videos` }],
        maxResults: 10,
        maxResultsShorts: 0,
        maxResultStreams: 0,
      };
    } else {
      // For custom URLs and user URLs
      const prefix = channelInfo.type === 'custom' ? 'c' : 'user';
      input = {
        startUrls: [{ url: `https://www.youtube.com/${prefix}/${channelInfo.value}/videos` }],
        maxResults: 10,
        maxResultsShorts: 0,
        maxResultStreams: 0,
      };
    }

    const items = await runApifyActor({
      actorId: YOUTUBE_ACTOR_ID,
      input,
      timeoutSecs: 60,
    });

    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'No videos found for this YouTube channel',
      };
    }

    const videos = items as YouTubeVideo[];
    const recentVideos = videos.slice(0, 10);

    if (recentVideos.length === 0) {
      return {
        success: false,
        error: 'No videos found for this YouTube channel',
      };
    }

    // Calculate average metrics (using correct field names from scraper)
    const views = recentVideos.map(v => v.viewCount || 0);
    const likes = recentVideos.map(v => v.likes || 0);
    const comments = recentVideos.map(v => v.commentsCount || 0);

    // Get channel-level stats from first video (they all should have the same)
    const firstVideo = recentVideos[0];
    const subscribers = firstVideo?.numberOfSubscribers;
    const totalVideos = firstVideo?.channelTotalVideos;
    const totalViews = firstVideo?.channelTotalViews;

    const metrics: SocialMetrics = {
      avgLikes: calculateAverage(likes),
      avgComments: calculateAverage(comments),
      avgViews: calculateAverage(views),
      subscribers,
      totalVideos,
      totalViews,
    };

    return {
      success: true,
      metrics,
    };
  } catch (error) {
    return {
      success: false,
      error: `YouTube scraper error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
