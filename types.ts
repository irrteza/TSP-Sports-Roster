export interface PlatformMetrics {
  avgLikes?: number;
  avgComments?: number;
  avgViews?: number;
  avgShares?: number;      // TikTok only
  avgSaves?: number;       // TikTok only
  totalLikes?: number;     // TikTok only
  totalVideos?: number;    // TikTok/YouTube
  subscribers?: number;    // YouTube only
  totalViews?: number;     // YouTube only
  scrapedFollowers?: number;
  manualFollowers?: number;
}

export interface SocialStat {
  platform: 'Instagram' | 'TikTok' | 'YouTube' | 'Facebook' | 'Snapchat';
  followerCount: string; // Formatted for display (e.g., "2.1M" or "57.4K")
  rawFollowerCount?: number; // Raw number for edit form (e.g., 57400)
  link: string;
  metrics?: PlatformMetrics; // Platform-specific engagement metrics
}

export interface Talent {
  id: string;
  name: string;
  image: string;
  tags: string[];
  location: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  age?: number;
  exclusives?: string;
  gender: string;
  audienceAge: string; // e.g., "18-24", "25-34"
  stats: SocialStat[];
  position?: number; // For custom sorting - lower values appear first
  createdOn?: string; // ISO date string from Airtable createdTime
  rate?: string; // Creator rate for admin view only
  tier?: string; // Creator tier for admin filtering
  status?: string; // Creator status for admin filtering
  allStar?: boolean; // Admin-only: marks creator as an All Star
  // New Detailed Fields
  bio: string;
  engagementRate: string;
  avgViews: string;
  totalReach: string;
  brands: string[]; // Array of brand names
  demographics: {
    male: number; // percentage
    female: number; // percentage
    topCountries: string[];
  };
  analytics?: string[]; // Array of analytics screenshot URLs from Airtable
  notes?: string; // Internal admin notes
}

export interface FilterState {
  categories: string[];
  platforms: string[];
  minReach: number;
  minInstagram: number;
  minTiktok: number;
  minYoutube: number;
  minFacebook: number;
  locations: string[];
  genders: string[];
  audienceAges: string[];
  rates: string[]; // Admin-only filter for creator rates (Low/Medium/High)
  tiers: string[]; // Admin-only filter for creator tiers (Micro/Macro)
  statuses: string[]; // Admin-only filter for creator status (Active/Inactive)

  // Cross-platform engagement filters (any platform)
  minAvgViews: number;
  minAvgLikes: number;
  minAvgComments: number;

  // TikTok-specific engagement filters
  minTiktokAvgViews: number;
  minTiktokAvgLikes: number;
  minTiktokAvgComments: number;
  minTiktokAvgShares: number;
  minTiktokAvgSaves: number;
  minTiktokTotalVideos: number;

  // YouTube-specific engagement filters
  minYoutubeAvgViews: number;
  minYoutubeAvgLikes: number;
  minYoutubeAvgComments: number;
  minYoutubeTotalViews: number;
  minYoutubeTotalVideos: number;

  // Instagram-specific engagement filters
  minInstagramAvgViews: number;
  minInstagramAvgLikes: number;
  minInstagramAvgComments: number;

  // Engagement rate filters (percentage: 0-100)
  minEngagementRate: number;  // Cross-platform (any platform matches)
  minTiktokEngagementRate: number;
  minYoutubeEngagementRate: number;
  minInstagramEngagementRate: number;
}

export interface AiSearchResponse {
  filters: Partial<FilterState>;
  message: string;
  matchedIds?: string[];
}

export interface CreatorEditFormState {
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  age: number | undefined;
  gender: string;
  location: string;
  bio: string;
  audienceAge: string;
  exclusives: string;
  tags: string[];
  brands: string[];
  rate: string; // Admin-only rate field
  // Flattened demographics
  demographicsMale: number;
  demographicsFemale: number;
  // Flattened social stats (raw numbers, not formatted)
  instagramFollowers: number;
  instagramLink: string;
  tiktokFollowers: number;
  tiktokLink: string;
  youtubeFollowers: number;
  youtubeLink: string;
  facebookFollowers: number;
  facebookLink: string;
  notes: string;
}
