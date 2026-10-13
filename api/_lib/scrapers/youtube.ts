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
  const validName = (value: string) => /^[\p{L}\p{N}_.-]+$/u.test(value);
  if (cleaned.startsWith('@')) return validName(cleaned.slice(1)) ? { type: 'handle', value: cleaned } : null;
  if (!cleaned.includes('/') && !/youtube\.com/i.test(cleaned) && validName(cleaned))
    return { type: 'handle', value: `@${cleaned}` };
  try {
    const parsed = new URL(/^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`);
    if (parsed.hostname !== 'youtube.com' && !parsed.hostname.endsWith('.youtube.com')) return null;
    const parts = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const first = parts[0] || '';
    if (first.startsWith('@')) return validName(first.slice(1)) ? { type: 'handle', value: first } : null;
    const value = parts[1];
    if (first === 'channel') return /^UC[a-zA-Z0-9_-]+$/.test(value || '') ? { type: 'channelId', value } : null;
    if (first === 'c' || first === 'user') return value && validName(value) ? { type: first === 'c' ? 'custom' : 'user', value } : null;
    const reserved = ['watch', 'playlist', 'shorts', 'feed', 'results', 'live', 'gaming'];
    if (parts.length === 1 && validName(first) && !reserved.includes(first.toLowerCase())) return { type: 'handle', value: `@${first}` };
  } catch { return null; }

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

    if (typeof subscribers !== 'number' || !Number.isFinite(subscribers) || subscribers < 0)
      return { success: false, error: 'Subscriber count not available in YouTube channel data' };

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
