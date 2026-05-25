/**
 * TikTok Profile Scraper
 * Uses Apify actor: clockworks/tiktok-profile-scraper
 */

import { runApifyActor } from '../apify-client.js';
import { ScraperResult, SocialMetrics, calculateAverage } from './types.js';

const TIKTOK_ACTOR_ID = 'clockworks/tiktok-profile-scraper';

/**
 * Extract TikTok username from various URL formats
 * Handles:
 * - https://www.tiktok.com/@username
 * - https://tiktok.com/@username
 * - @username
 * - username
 */
export function extractTikTokUsername(url: string): string | null {
  if (!url) return null;

  const cleaned = url.trim();

  // Handle @username format
  if (cleaned.startsWith('@')) {
    return cleaned.substring(1).split('/')[0].split('?')[0];
  }

  // Handle full URL
  const urlMatch = cleaned.match(/tiktok\.com\/@([a-zA-Z0-9_.]+)/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Handle just username (no @ or URL)
  if (/^[a-zA-Z0-9_.]+$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * TikTok post data structure from the scraper
 */
interface TikTokPost {
  id?: string;
  diggCount?: number;      // Likes
  commentCount?: number;   // Comments
  shareCount?: number;     // Shares
  playCount?: number;      // Views
  collectCount?: number;   // Saves/Bookmarks
  authorMeta?: TikTokAuthorMeta;
}

interface TikTokAuthorMeta {
  fans?: number;           // Followers
  heart?: number;          // Total likes on profile
  video?: number;          // Total video count
  verified?: boolean;
}

/**
 * TikTok profile data structure from the scraper
 */
interface TikTokProfile {
  authorMeta?: {
    fans?: number;        // Followers
    heart?: number;       // Total likes
    video?: number;       // Video count
  };
  items?: TikTokPost[];
}

/**
 * Scrape TikTok profile metrics
 * Returns average metrics from last 10 posts + current follower count
 */
export async function scrapeTikTokMetrics(profileUrl: string): Promise<ScraperResult> {
  const username = extractTikTokUsername(profileUrl);

  if (!username) {
    return {
      success: false,
      error: `Invalid TikTok URL or username: ${profileUrl}`,
    };
  }

  try {
    const items = await runApifyActor({
      actorId: TIKTOK_ACTOR_ID,
      input: {
        profiles: [username],
        resultsPerPage: 10,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      },
      timeoutSecs: 45,
    });

    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'No data returned from TikTok scraper',
      };
    }

    // The scraper returns posts directly, each with authorMeta containing profile info
    // Check if first item has diggCount (indicating it's a post, not a profile wrapper)
    const firstItem = items[0] as Record<string, unknown>;
    let posts: TikTokPost[] = [];
    let followers: number | undefined;

    if ('diggCount' in firstItem || 'playCount' in firstItem) {
      // Items are posts directly (each post has authorMeta)
      posts = items as TikTokPost[];
      // Get follower count from first post's authorMeta
      if (firstItem.authorMeta && typeof firstItem.authorMeta === 'object') {
        const authorMeta = firstItem.authorMeta as { fans?: number };
        followers = authorMeta.fans;
      }
    } else if ('items' in firstItem && Array.isArray(firstItem.items)) {
      // Profile wrapper format with items array
      const profile = firstItem as TikTokProfile;
      followers = profile.authorMeta?.fans;
      posts = profile.items || [];
    } else {
      // Fallback: treat as posts
      posts = items as TikTokPost[];
    }

    // Take up to 10 most recent posts
    const recentPosts = posts.slice(0, 10);

    if (recentPosts.length === 0) {
      return {
        success: false,
        error: 'No posts found for this TikTok profile',
      };
    }

    // Calculate average metrics
    const likes = recentPosts.map(p => p.diggCount || 0);
    const comments = recentPosts.map(p => p.commentCount || 0);
    const shares = recentPosts.map(p => p.shareCount || 0);
    const views = recentPosts.map(p => p.playCount || 0);
    const saves = recentPosts.map(p => p.collectCount || 0);

    // Get profile-level stats from first post's authorMeta
    let totalLikes: number | undefined;
    let totalVideos: number | undefined;
    const firstPost = recentPosts[0] as TikTokPost;
    if (firstPost?.authorMeta) {
      totalLikes = firstPost.authorMeta.heart;
      totalVideos = firstPost.authorMeta.video;
      if (!followers) {
        followers = firstPost.authorMeta.fans;
      }
    }

    const metrics: SocialMetrics = {
      avgLikes: calculateAverage(likes),
      avgComments: calculateAverage(comments),
      avgShares: calculateAverage(shares),
      avgViews: calculateAverage(views),
      avgSaves: calculateAverage(saves),
      followers,
      totalLikes,
      totalVideos,
    };

    return {
      success: true,
      metrics,
    };
  } catch (error) {
    return {
      success: false,
      error: `TikTok scraper error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
