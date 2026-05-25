/**
 * Instagram Followers Scraper
 * Uses a different Apify actor than the engagement metrics scraper to fetch follower counts separately.
 */

import { runApifyActor } from '../apify-client.js';
import { ScraperResult, SocialMetrics } from './types.js';
import { extractInstagramUsername } from './instagram.js';

const INSTAGRAM_FOLLOWERS_ACTOR_ID = 'apify/instagram-scraper';

interface InstagramProfileData {
  followersCount?: number;
}

export async function scrapeInstagramFollowers(profileUrl: string): Promise<ScraperResult> {
  const username = extractInstagramUsername(profileUrl);

  if (!username) {
    return {
      success: false,
      error: `Invalid Instagram URL or username: ${profileUrl}`,
    };
  }

  try {
    const items = await runApifyActor({
      actorId: INSTAGRAM_FOLLOWERS_ACTOR_ID,
      input: {
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: 'details',
      },
      timeoutSecs: 60,
    });

    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'No profile data found for this Instagram account',
      };
    }

    const profileData = items[0] as InstagramProfileData;

    // Check if we got follower count
    if (typeof profileData.followersCount !== 'number') {
      return {
        success: false,
        error: 'Follower count not available in profile data',
      };
    }

    const metrics: SocialMetrics = {
      avgLikes: 0,
      avgComments: 0,
      followers: profileData.followersCount,
    };

    return {
      success: true,
      metrics,
    };
  } catch (error) {
    return {
      success: false,
      error: `Instagram followers scraper error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
