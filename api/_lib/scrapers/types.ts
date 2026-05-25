/**
 * Shared types for social media scrapers
 */

export interface SocialMetrics {
  avgLikes: number;
  avgComments: number;
  avgShares?: number;
  avgViews?: number;
  avgSaves?: number;        // TikTok collectCount
  followers?: number;       // Current follower count from profile
  subscribers?: number;     // YouTube only - subscriber count
  totalLikes?: number;      // TikTok total hearts
  totalVideos?: number;     // TikTok/YouTube total video count
  totalViews?: number;      // YouTube channel total views
}

export interface ScraperResult {
  success: boolean;
  metrics?: SocialMetrics;
  error?: string;
}

export interface CreatorSocialLinks {
  recordId: string;
  name: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  tiktokLastUpdated?: string;
  youtubeLastUpdated?: string;
  instagramLastUpdated?: string;
  instagramFollowersLastUpdated?: string;
  // Failure tracking fields
  tiktokLastFailure?: string;
  youtubeLastFailure?: string;
  instagramLastFailure?: string;
  instagramFollowersLastFailure?: string;
}

export interface PlatformScrapeTask {
  recordId: string;
  creatorName: string;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'instagram-followers';
  url: string;
  lastUpdated?: string;
}

export interface MetricsUpdate {
  // TikTok metrics
  'TikTok Avg Likes'?: number;
  'TikTok Avg Comments'?: number;
  'TikTok Avg Shares'?: number;
  'TikTok Avg Views'?: number;
  'TikTok Avg Saves'?: number;
  'TikTok Followers (Scraped)'?: number;
  'TikTok Total Likes'?: number;
  'TikTok Total Videos'?: number;
  'TikTok Last Updated'?: string;
  // YouTube metrics
  'YouTube Avg Likes'?: number;
  'YouTube Avg Comments'?: number;
  'YouTube Avg Views'?: number;
  'YouTube Subscribers'?: number;
  'YouTube Total Views'?: number;
  'YouTube Total Videos'?: number;
  'YouTube Last Updated'?: string;
  // Instagram metrics
  'Instagram Avg Likes'?: number;
  'Instagram Avg Comments'?: number;
  'Instagram Avg Views'?: number;
  'Instagram Followers (Scraped)'?: number;
  'Instagram Last Updated'?: string;
  'Instagram Followers Last Updated'?: string;
  // Failure tracking fields
  'TikTok Last Failure'?: string;
  'YouTube Last Failure'?: string;
  'Instagram Last Failure'?: string;
  'Instagram Followers Last Failure'?: string;
}

/**
 * Calculate the average of an array of numbers
 */
export function calculateAverage(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round(sum / nums.length);
}

/**
 * Check if a timestamp is older than specified days
 */
export function isOlderThanDays(timestamp: string | undefined, days: number): boolean {
  if (!timestamp) return true; // Never scraped = needs scraping

  const lastUpdate = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - lastUpdate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= days;
}

/**
 * Check if a task is in cooldown due to recent failure
 * Returns true if the task should be skipped (still in cooldown)
 */
export function isInCooldown(lastFailure: string | undefined, cooldownDays: number = 7): boolean {
  if (!lastFailure) return false; // No failure recorded = not in cooldown

  const failureTime = new Date(lastFailure);
  const now = new Date();
  const diffMs = now.getTime() - failureTime.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays < cooldownDays; // In cooldown if failure is within cooldown period
}
