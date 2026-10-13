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
    if (typeof profileData.followersCount !== 'number' || !Number.isFinite(profileData.followersCount) || profileData.followersCount < 0) {
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

/** Match by username rather than dataset order; isolate failed profiles. */
export async function scrapeInstagramFollowersBatch(urls: string[]): Promise<ScraperResult[]> {
  const names = urls.map(url => extractInstagramUsername(url)?.toLowerCase());
  const unique = [...new Set(names.filter((name): name is string => !!name))];
  if (!unique.length) return urls.map(() => ({ success: false, error: 'Invalid Instagram profile' }));
  try {
    const items = await runApifyActor({ actorId: 'apify/instagram-followers-count-scraper',
      input: { usernames: unique }, timeoutSecs: 120, allowItemErrors: true });
    const profiles = new Map(items.filter(item => typeof (item.userName ?? item.username) === 'string')
      .map(item => [String(item.userName ?? item.username).toLowerCase(), item]));
    return names.map(name => {
      const item = name ? profiles.get(name) : undefined;
      const count = item?.followersCount;
      if (!item || item.error || item.errorDescription || typeof count !== 'number' || !Number.isFinite(count) || count < 0)
        return { success: false, error: String(item?.errorDescription || item?.error || 'Follower count not available in profile data') };
      return { success: true, metrics: { avgLikes: 0, avgComments: 0, followers: count } };
    });
  } catch (error) {
    return urls.map(() => ({ success: false, error: `Instagram followers scraper error: ${error instanceof Error ? error.message : String(error)}` }));
  }
}
