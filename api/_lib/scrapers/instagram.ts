/**
 * Instagram Post Scraper
 * Uses Apify actor: apify/instagram-post-scraper
 */

import { runApifyActor } from '../apify-client.js';
import { ScraperResult, SocialMetrics, calculateAverage } from './types.js';

const INSTAGRAM_ACTOR_ID = 'apify/instagram-post-scraper';

/**
 * Extract Instagram username from various URL formats
 * Handles:
 * - https://www.instagram.com/username/
 * - https://instagram.com/username
 * - @username
 * - username
 */
export function extractInstagramUsername(url: string): string | null {
  if (!url) return null;

  const cleaned = url.trim();

  // Handle @username format
  if (cleaned.startsWith('@')) {
    return cleaned.substring(1).split('/')[0].split('?')[0];
  }

  // Handle full URL
  const urlMatch = cleaned.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
  if (urlMatch) {
    // Filter out known non-username paths
    const potentialUsername = urlMatch[1];
    const reservedPaths = ['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct'];
    if (!reservedPaths.includes(potentialUsername.toLowerCase())) {
      return potentialUsername;
    }
  }

  // Handle just username (no @ or URL)
  if (/^[a-zA-Z0-9_.]+$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Instagram post data structure from the scraper
 */
interface InstagramPost {
  id?: string;
  shortCode?: string;
  type?: string;
  likesCount?: number;
  commentsCount?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  timestamp?: string;
  ownerUsername?: string;
  ownerId?: string;
}

/**
 * Instagram profile data that may be included
 */
interface InstagramProfileData {
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

/**
 * Scrape Instagram profile metrics
 * Returns average metrics from last 10 posts + follower count
 */
export async function scrapeInstagramMetrics(profileUrl: string): Promise<ScraperResult> {
  const username = extractInstagramUsername(profileUrl);

  if (!username) {
    return {
      success: false,
      error: `Invalid Instagram URL or username: ${profileUrl}`,
    };
  }

  try {
    const items = await runApifyActor({
      actorId: INSTAGRAM_ACTOR_ID,
      input: {
        username: [username],
        resultsLimit: 10,
      },
      timeoutSecs: 60,
    });

    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'No posts found for this Instagram profile',
      };
    }

    const posts = items as (InstagramPost & InstagramProfileData)[];
    const recentPosts = posts.slice(0, 10);

    if (recentPosts.length === 0) {
      return {
        success: false,
        error: 'No posts found for this Instagram profile',
      };
    }

    // Calculate average metrics (filter out invalid values like -1)
    const likes = recentPosts.map(p => p.likesCount ?? 0).filter(n => n >= 0);
    const comments = recentPosts.map(p => p.commentsCount ?? 0).filter(n => n >= 0);
    // For video posts (Reels), get view counts
    const views = recentPosts
      .map(p => p.videoViewCount || p.videoPlayCount || 0)
      .filter(n => n > 0);

    // Try to get follower count from the response
    // Some scrapers include profile data in the first item
    let followers: number | undefined;
    const firstPost = recentPosts[0];
    if (firstPost.followersCount) {
      followers = firstPost.followersCount;
    }

    const metrics: SocialMetrics = {
      avgLikes: calculateAverage(likes),
      avgComments: calculateAverage(comments),
      avgViews: views.length > 0 ? calculateAverage(views) : undefined,
      followers,
    };

    return {
      success: true,
      metrics,
    };
  } catch (error) {
    return {
      success: false,
      error: `Instagram scraper error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
