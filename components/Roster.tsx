
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { ROSTER_DATA } from '../constants';
import { fetchAirtableData } from '../lib/airtable';
import { sortByCreatedOn, SortDirection } from '../lib/sorting';
import TalentCard from './TalentCard';
import FilterPanel from './FilterPanel';
import CreatorProfile from './CreatorProfile';
import { FilterState, Talent, PlatformMetrics } from '../types';
import { X, Plus, Loader2, Search, ArrowUpDown, Users, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Calculate engagement rate: (likes + comments + shares) / views * 100
// Shares only available for TikTok
const calculateEngagementRate = (metrics: PlatformMetrics | undefined, platform: string): number | null => {
  if (!metrics || !metrics.avgViews || metrics.avgViews === 0) return null;

  const likes = metrics.avgLikes || 0;
  const comments = metrics.avgComments || 0;
  const shares = platform.toLowerCase() === 'tiktok' ? (metrics.avgShares || 0) : 0;

  return ((likes + comments + shares) / metrics.avgViews) * 100;
};

const Roster: React.FC = () => {
  // Master data source - will be loaded from Airtable
  const [masterData, setMasterData] = useState<Talent[]>([]);
  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [sharedCreatorIds, setSharedCreatorIds] = useState<string[] | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Open a creator's profile and sync URL
  const openCreator = useCallback((talent: Talent) => {
    setSelectedTalent(talent);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('creator', talent.id);
      return next;
    });
  }, [setSearchParams]);

  // Close the profile modal and remove URL param
  const closeCreator = useCallback(() => {
    setSelectedTalent(null);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('creator');
      return next;
    });
  }, [setSearchParams]);

  // Exit the shared multi-creator view
  const exitSharedView = useCallback(() => {
    setSharedCreatorIds(null);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('creators');
      return next;
    });
  }, [setSearchParams]);

  // Name search query state
  const [nameSearchQuery, setNameSearchQuery] = useState('');

  // Sort direction state
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch data from Airtable on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchAirtableData();
        setMasterData(data);
      } catch (error) {
        console.error('Failed to load Airtable data:', error);
        setMasterData([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Auto-open creator profile or shared view from URL params after data loads
  useEffect(() => {
    if (masterData.length === 0) return;

    // Multi-creator shared view: ?creators=id1,id2,id3
    const creatorsParam = searchParams.get('creators');
    if (creatorsParam) {
      const ids = creatorsParam.split(',').filter(id => masterData.some(t => t.id === id));
      if (ids.length > 0) {
        setSharedCreatorIds(ids);
      }
      return;
    }

    // Single creator deep-link: ?creator=id
    const creatorId = searchParams.get('creator');
    if (creatorId && !selectedTalent) {
      const talent = masterData.find(t => t.id === creatorId);
      if (talent) setSelectedTalent(talent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterData, searchParams]);

  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    platforms: [],
    minReach: 0,
    minInstagram: 0,
    minTiktok: 0,
    minYoutube: 0,
    minFacebook: 0,
    locations: [],
    genders: [],
    audienceAges: [],
    // Cross-platform engagement filters
    minAvgViews: 0,
    minAvgLikes: 0,
    minAvgComments: 0,
    // TikTok engagement filters
    minTiktokAvgViews: 0,
    minTiktokAvgLikes: 0,
    minTiktokAvgComments: 0,
    minTiktokAvgShares: 0,
    minTiktokAvgSaves: 0,
    minTiktokTotalVideos: 0,
    // YouTube engagement filters
    minYoutubeAvgViews: 0,
    minYoutubeAvgLikes: 0,
    minYoutubeAvgComments: 0,
    minYoutubeTotalViews: 0,
    minYoutubeTotalVideos: 0,
    // Instagram engagement filters
    minInstagramAvgViews: 0,
    minInstagramAvgLikes: 0,
    minInstagramAvgComments: 0,
    // Engagement rate filters
    minEngagementRate: 0,
    minTiktokEngagementRate: 0,
    minYoutubeEngagementRate: 0,
    minInstagramEngagementRate: 0,
  });

  // Compute available options from the data
  const availableTags = useMemo(() => {
     const tags = new Set<string>();
     // Only pull categories from actual data, not hardcoded list
     masterData.forEach(t => {
         if (Array.isArray(t.tags)) {
             t.tags.forEach(tag => {
               if (tag && tag.trim()) tags.add(tag.trim());
             });
         } else if (typeof t.tags === 'string' && t.tags.trim()) {
             tags.add(t.tags.trim());
         }
     });
     return Array.from(tags).sort();
  }, [masterData]);

  const availableLocations = useMemo(() => {
    const locs = new Set<string>();
    masterData.forEach(t => { if(t.location) locs.add(t.location) });
    return Array.from(locs).sort();
  }, [masterData]);

  // Calculate dynamic max values for engagement metric filters
  const metricRanges = useMemo(() => {
    let maxAvgViews = 0, maxAvgLikes = 0, maxAvgComments = 0;
    let maxTiktokAvgViews = 0, maxTiktokAvgLikes = 0, maxTiktokAvgComments = 0;
    let maxTiktokAvgShares = 0, maxTiktokAvgSaves = 0, maxTiktokTotalVideos = 0;
    let maxYoutubeAvgViews = 0, maxYoutubeAvgLikes = 0, maxYoutubeAvgComments = 0;
    let maxYoutubeTotalViews = 0, maxYoutubeTotalVideos = 0;
    let maxInstagramAvgViews = 0, maxInstagramAvgLikes = 0, maxInstagramAvgComments = 0;

    masterData.forEach(talent => {
      talent.stats.forEach(stat => {
        if (stat.metrics) {
          // Cross-platform maximums
          if (stat.metrics.avgViews) maxAvgViews = Math.max(maxAvgViews, stat.metrics.avgViews);
          if (stat.metrics.avgLikes) maxAvgLikes = Math.max(maxAvgLikes, stat.metrics.avgLikes);
          if (stat.metrics.avgComments) maxAvgComments = Math.max(maxAvgComments, stat.metrics.avgComments);

          // Platform-specific maximums
          if (stat.platform === 'TikTok') {
            if (stat.metrics.avgViews) maxTiktokAvgViews = Math.max(maxTiktokAvgViews, stat.metrics.avgViews);
            if (stat.metrics.avgLikes) maxTiktokAvgLikes = Math.max(maxTiktokAvgLikes, stat.metrics.avgLikes);
            if (stat.metrics.avgComments) maxTiktokAvgComments = Math.max(maxTiktokAvgComments, stat.metrics.avgComments);
            if (stat.metrics.avgShares) maxTiktokAvgShares = Math.max(maxTiktokAvgShares, stat.metrics.avgShares);
            if (stat.metrics.avgSaves) maxTiktokAvgSaves = Math.max(maxTiktokAvgSaves, stat.metrics.avgSaves);
            if (stat.metrics.totalVideos) maxTiktokTotalVideos = Math.max(maxTiktokTotalVideos, stat.metrics.totalVideos);
          }
          if (stat.platform === 'YouTube') {
            if (stat.metrics.avgViews) maxYoutubeAvgViews = Math.max(maxYoutubeAvgViews, stat.metrics.avgViews);
            if (stat.metrics.avgLikes) maxYoutubeAvgLikes = Math.max(maxYoutubeAvgLikes, stat.metrics.avgLikes);
            if (stat.metrics.avgComments) maxYoutubeAvgComments = Math.max(maxYoutubeAvgComments, stat.metrics.avgComments);
            if (stat.metrics.totalViews) maxYoutubeTotalViews = Math.max(maxYoutubeTotalViews, stat.metrics.totalViews);
            if (stat.metrics.totalVideos) maxYoutubeTotalVideos = Math.max(maxYoutubeTotalVideos, stat.metrics.totalVideos);
          }
          if (stat.platform === 'Instagram') {
            if (stat.metrics.avgViews) maxInstagramAvgViews = Math.max(maxInstagramAvgViews, stat.metrics.avgViews);
            if (stat.metrics.avgLikes) maxInstagramAvgLikes = Math.max(maxInstagramAvgLikes, stat.metrics.avgLikes);
            if (stat.metrics.avgComments) maxInstagramAvgComments = Math.max(maxInstagramAvgComments, stat.metrics.avgComments);
          }
        }
      });
    });

    // Ensure minimum values for ranges (fallback if no data)
    return {
      maxAvgViews: maxAvgViews || 10000000,
      maxAvgLikes: maxAvgLikes || 1000000,
      maxAvgComments: maxAvgComments || 100000,
      maxTiktokAvgViews: maxTiktokAvgViews || 10000000,
      maxTiktokAvgLikes: maxTiktokAvgLikes || 1000000,
      maxTiktokAvgComments: maxTiktokAvgComments || 100000,
      maxTiktokAvgShares: maxTiktokAvgShares || 500000,
      maxTiktokAvgSaves: maxTiktokAvgSaves || 500000,
      maxTiktokTotalVideos: maxTiktokTotalVideos || 1000,
      maxYoutubeAvgViews: maxYoutubeAvgViews || 10000000,
      maxYoutubeAvgLikes: maxYoutubeAvgLikes || 1000000,
      maxYoutubeAvgComments: maxYoutubeAvgComments || 100000,
      maxYoutubeTotalViews: maxYoutubeTotalViews || 1000000000,
      maxYoutubeTotalVideos: maxYoutubeTotalVideos || 1000,
      maxInstagramAvgViews: maxInstagramAvgViews || 10000000,
      maxInstagramAvgLikes: maxInstagramAvgLikes || 1000000,
      maxInstagramAvgComments: maxInstagramAvgComments || 100000,
    };
  }, [masterData]);

  // Fuse.js instance for fuzzy name search
  const fuse = useMemo(() => {
    return new Fuse(masterData, {
      keys: ['name'],
      threshold: 0.4, // 0.0 = exact match, 1.0 = matches everything
      includeScore: true,
    });
  }, [masterData]);

  const parseCount = (str: string): number => {
    if (!str) return 0;
    const s = str.toLowerCase().replace(/,/g, '');
    if (s.endsWith('m')) return parseFloat(s) * 1000000;
    if (s.endsWith('k')) return parseFloat(s) * 1000;
    return parseFloat(s);
  };

  const finalDisplayData = useMemo(() => {
    // First, apply fuzzy name search if there's a query
    let baseData = masterData;
    if (nameSearchQuery.trim()) {
      const results = fuse.search(nameSearchQuery);
      baseData = results.map(r => r.item);
    }

    const filtered = baseData.filter(talent => {
      if (filters.categories.length > 0) {
        const hasCategory = talent.tags.some(t => filters.categories.includes(t));
        if (!hasCategory) return false;
      }
      if (filters.platforms.length > 0) {
        const hasPlatform = talent.stats.some(s =>
          filters.platforms.some(p => p.toLowerCase() === s.platform.toLowerCase())
        );
        if (!hasPlatform) return false;
      }
      if (filters.minReach > 0) {
        const maxReach = Math.max(...talent.stats.map(s => parseCount(s.followerCount)));
        if (maxReach < filters.minReach) return false;
      }
      // Instagram filter - creators without Instagram are filtered out
      if (filters.minInstagram > 0) {
        const stat = talent.stats.find(s => s.platform.toLowerCase() === 'instagram');
        if (!stat || parseCount(stat.followerCount) < filters.minInstagram) return false;
      }
      // TikTok filter
      if (filters.minTiktok > 0) {
        const stat = talent.stats.find(s => s.platform.toLowerCase() === 'tiktok');
        if (!stat || parseCount(stat.followerCount) < filters.minTiktok) return false;
      }
      // YouTube filter
      if (filters.minYoutube > 0) {
        const stat = talent.stats.find(s => s.platform.toLowerCase() === 'youtube');
        if (!stat || parseCount(stat.followerCount) < filters.minYoutube) return false;
      }
      // Facebook filter
      if (filters.minFacebook > 0) {
        const stat = talent.stats.find(s => s.platform.toLowerCase() === 'facebook');
        if (!stat || parseCount(stat.followerCount) < filters.minFacebook) return false;
      }
      if (filters.locations.length > 0) {
        if (!filters.locations.includes(talent.location)) return false;
      }
      if (filters.genders.length > 0) {
        if (!filters.genders.includes(talent.gender)) return false;
      }
      if (filters.audienceAges.length > 0) {
        if (!filters.audienceAges.includes(talent.audienceAge)) return false;
      }

      // Cross-platform engagement filters (match if ANY platform meets threshold)
      if (filters.minAvgViews > 0) {
        const hasQualifying = talent.stats.some(s => s.metrics?.avgViews && s.metrics.avgViews >= filters.minAvgViews);
        if (!hasQualifying) return false;
      }
      if (filters.minAvgLikes > 0) {
        const hasQualifying = talent.stats.some(s => s.metrics?.avgLikes && s.metrics.avgLikes >= filters.minAvgLikes);
        if (!hasQualifying) return false;
      }
      if (filters.minAvgComments > 0) {
        const hasQualifying = talent.stats.some(s => s.metrics?.avgComments && s.metrics.avgComments >= filters.minAvgComments);
        if (!hasQualifying) return false;
      }

      // TikTok-specific engagement filters
      if (filters.minTiktokAvgViews > 0) {
        const stat = talent.stats.find(s => s.platform === 'TikTok');
        if (!stat?.metrics?.avgViews || stat.metrics.avgViews < filters.minTiktokAvgViews) return false;
      }
      if (filters.minTiktokAvgLikes > 0) {
        const stat = talent.stats.find(s => s.platform === 'TikTok');
        if (!stat?.metrics?.avgLikes || stat.metrics.avgLikes < filters.minTiktokAvgLikes) return false;
      }
      if (filters.minTiktokAvgComments > 0) {
        const stat = talent.stats.find(s => s.platform === 'TikTok');
        if (!stat?.metrics?.avgComments || stat.metrics.avgComments < filters.minTiktokAvgComments) return false;
      }
      if (filters.minTiktokAvgShares > 0) {
        const stat = talent.stats.find(s => s.platform === 'TikTok');
        if (!stat?.metrics?.avgShares || stat.metrics.avgShares < filters.minTiktokAvgShares) return false;
      }
      if (filters.minTiktokAvgSaves > 0) {
        const stat = talent.stats.find(s => s.platform === 'TikTok');
        if (!stat?.metrics?.avgSaves || stat.metrics.avgSaves < filters.minTiktokAvgSaves) return false;
      }
      if (filters.minTiktokTotalVideos > 0) {
        const stat = talent.stats.find(s => s.platform === 'TikTok');
        if (!stat?.metrics?.totalVideos || stat.metrics.totalVideos < filters.minTiktokTotalVideos) return false;
      }

      // YouTube-specific engagement filters
      if (filters.minYoutubeAvgViews > 0) {
        const stat = talent.stats.find(s => s.platform === 'YouTube');
        if (!stat?.metrics?.avgViews || stat.metrics.avgViews < filters.minYoutubeAvgViews) return false;
      }
      if (filters.minYoutubeAvgLikes > 0) {
        const stat = talent.stats.find(s => s.platform === 'YouTube');
        if (!stat?.metrics?.avgLikes || stat.metrics.avgLikes < filters.minYoutubeAvgLikes) return false;
      }
      if (filters.minYoutubeAvgComments > 0) {
        const stat = talent.stats.find(s => s.platform === 'YouTube');
        if (!stat?.metrics?.avgComments || stat.metrics.avgComments < filters.minYoutubeAvgComments) return false;
      }
      if (filters.minYoutubeTotalViews > 0) {
        const stat = talent.stats.find(s => s.platform === 'YouTube');
        if (!stat?.metrics?.totalViews || stat.metrics.totalViews < filters.minYoutubeTotalViews) return false;
      }
      if (filters.minYoutubeTotalVideos > 0) {
        const stat = talent.stats.find(s => s.platform === 'YouTube');
        if (!stat?.metrics?.totalVideos || stat.metrics.totalVideos < filters.minYoutubeTotalVideos) return false;
      }

      // Instagram-specific engagement filters
      if (filters.minInstagramAvgViews > 0) {
        const stat = talent.stats.find(s => s.platform === 'Instagram');
        if (!stat?.metrics?.avgViews || stat.metrics.avgViews < filters.minInstagramAvgViews) return false;
      }
      if (filters.minInstagramAvgLikes > 0) {
        const stat = talent.stats.find(s => s.platform === 'Instagram');
        if (!stat?.metrics?.avgLikes || stat.metrics.avgLikes < filters.minInstagramAvgLikes) return false;
      }
      if (filters.minInstagramAvgComments > 0) {
        const stat = talent.stats.find(s => s.platform === 'Instagram');
        if (!stat?.metrics?.avgComments || stat.metrics.avgComments < filters.minInstagramAvgComments) return false;
      }

      // Cross-platform engagement rate filter (match if ANY platform meets threshold)
      if (filters.minEngagementRate > 0) {
        const hasMatchingEngagement = talent.stats.some(stat => {
          const rate = calculateEngagementRate(stat.metrics, stat.platform);
          return rate !== null && rate >= filters.minEngagementRate;
        });
        if (!hasMatchingEngagement) return false;
      }

      // TikTok engagement rate filter
      if (filters.minTiktokEngagementRate > 0) {
        const tiktokStat = talent.stats.find(s => s.platform === 'TikTok');
        const rate = calculateEngagementRate(tiktokStat?.metrics, 'TikTok');
        if (rate === null || rate < filters.minTiktokEngagementRate) return false;
      }

      // YouTube engagement rate filter
      if (filters.minYoutubeEngagementRate > 0) {
        const ytStat = talent.stats.find(s => s.platform === 'YouTube');
        const rate = calculateEngagementRate(ytStat?.metrics, 'YouTube');
        if (rate === null || rate < filters.minYoutubeEngagementRate) return false;
      }

      // Instagram engagement rate filter
      if (filters.minInstagramEngagementRate > 0) {
        const igStat = talent.stats.find(s => s.platform === 'Instagram');
        const rate = calculateEngagementRate(igStat?.metrics, 'Instagram');
        if (rate === null || rate < filters.minInstagramEngagementRate) return false;
      }

      return true;
    });

    // Sort by position: positioned creators first (ascending), then unpositioned by createdOn (ascending)
    const withPosition = filtered.filter(t => t.position != null);
    const withoutPosition = filtered.filter(t => t.position == null);
    withPosition.sort((a, b) => a.position! - b.position!);
    sortByCreatedOn(withoutPosition, sortDirection);

    return [...withPosition, ...withoutPosition];
  }, [masterData, nameSearchQuery, fuse, filters, sortDirection]);

  const activeFilterCount =
    filters.categories.length +
    filters.platforms.length +
    filters.locations.length +
    filters.genders.length +
    filters.audienceAges.length +
    (filters.minReach > 0 ? 1 : 0) +
    (filters.minInstagram > 0 ? 1 : 0) +
    (filters.minTiktok > 0 ? 1 : 0) +
    (filters.minYoutube > 0 ? 1 : 0) +
    (filters.minFacebook > 0 ? 1 : 0) +
    // Cross-platform engagement
    (filters.minAvgViews > 0 ? 1 : 0) +
    (filters.minAvgLikes > 0 ? 1 : 0) +
    (filters.minAvgComments > 0 ? 1 : 0) +
    // TikTok engagement
    (filters.minTiktokAvgViews > 0 ? 1 : 0) +
    (filters.minTiktokAvgLikes > 0 ? 1 : 0) +
    (filters.minTiktokAvgComments > 0 ? 1 : 0) +
    (filters.minTiktokAvgShares > 0 ? 1 : 0) +
    (filters.minTiktokAvgSaves > 0 ? 1 : 0) +
    (filters.minTiktokTotalVideos > 0 ? 1 : 0) +
    // YouTube engagement
    (filters.minYoutubeAvgViews > 0 ? 1 : 0) +
    (filters.minYoutubeAvgLikes > 0 ? 1 : 0) +
    (filters.minYoutubeAvgComments > 0 ? 1 : 0) +
    (filters.minYoutubeTotalViews > 0 ? 1 : 0) +
    (filters.minYoutubeTotalVideos > 0 ? 1 : 0) +
    // Instagram engagement
    (filters.minInstagramAvgViews > 0 ? 1 : 0) +
    (filters.minInstagramAvgLikes > 0 ? 1 : 0) +
    (filters.minInstagramAvgComments > 0 ? 1 : 0) +
    // Engagement rate
    (filters.minEngagementRate > 0 ? 1 : 0) +
    (filters.minTiktokEngagementRate > 0 ? 1 : 0) +
    (filters.minYoutubeEngagementRate > 0 ? 1 : 0) +
    (filters.minInstagramEngagementRate > 0 ? 1 : 0);

  const resetAll = () => {
    setNameSearchQuery('');
    setFilters({
      categories: [],
      platforms: [],
      minReach: 0,
      minInstagram: 0,
      minTiktok: 0,
      minYoutube: 0,
      minFacebook: 0,
      locations: [],
      genders: [],
      audienceAges: [],
      // Cross-platform engagement filters
      minAvgViews: 0,
      minAvgLikes: 0,
      minAvgComments: 0,
      // TikTok engagement filters
      minTiktokAvgViews: 0,
      minTiktokAvgLikes: 0,
      minTiktokAvgComments: 0,
      minTiktokAvgShares: 0,
      minTiktokAvgSaves: 0,
      minTiktokTotalVideos: 0,
      // YouTube engagement filters
      minYoutubeAvgViews: 0,
      minYoutubeAvgLikes: 0,
      minYoutubeAvgComments: 0,
      minYoutubeTotalViews: 0,
      minYoutubeTotalVideos: 0,
      // Instagram engagement filters
      minInstagramAvgViews: 0,
      minInstagramAvgLikes: 0,
      minInstagramAvgComments: 0,
      // Engagement rate filters
      minEngagementRate: 0,
      minTiktokEngagementRate: 0,
      minYoutubeEngagementRate: 0,
      minInstagramEngagementRate: 0,
    });
  };

  // Shared creators filtered from master data
  const sharedCreators = useMemo(() => {
    if (!sharedCreatorIds) return [];
    return sharedCreatorIds
      .map(id => masterData.find(t => t.id === id))
      .filter((t): t is Talent => t != null);
  }, [sharedCreatorIds, masterData]);

  return (
    <>
      {sharedCreatorIds ? (
        /* Shared Creator Showcase View */
        <section className="pb-20 px-6 max-w-[1600px] mx-auto relative z-10 min-h-screen">
          <div className="flex flex-col items-center justify-center pt-24 pb-12">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-2 mb-6"
            >
              <Users className="w-5 h-5 text-slate-500" />
              <span className="text-lg text-slate-500 font-medium">Creator Showcase</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-6xl font-semibold tracking-tighter text-slate-900 leading-[0.9] text-center mb-6"
            >
              {sharedCreators.length} Selected Creator{sharedCreators.length !== 1 ? 's' : ''}
            </motion.h1>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              onClick={exitSharedView}
              className="flex items-center gap-2 text-[#5072a7] hover:text-[#3d5a87] font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              View Full Roster
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            <AnimatePresence mode="popLayout">
              {sharedCreators.map((talent, index) => (
                <motion.div
                  key={talent.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: (index % 4) * 0.05,
                    ease: [0.21, 0.47, 0.32, 0.98]
                  }}
                >
                  <TalentCard talent={talent} onClick={() => openCreator(talent)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      ) : (
        /* Normal Roster View */
        <section id="roster" className="pb-20 px-6 max-w-[1600px] mx-auto relative z-10 min-h-screen">

          {/* Branding Header */}
          <div className="flex flex-col items-center justify-center pt-24 pb-16">
             <motion.div
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6 }}
               className="flex items-center gap-2 mb-6"
             >
                <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center">
                   <Plus className="w-3 h-3 text-slate-500" />
                </div>
                <span className="text-lg text-slate-500 font-medium">The Talent</span>
             </motion.div>

             <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-7xl font-semibold tracking-tighter text-slate-900 leading-[0.9] text-center mb-8"
             >
               Sports Creators.
             </motion.h1>

             <motion.p
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.4, duration: 0.8 }}
               className="text-lg md:text-xl text-slate-500 max-w-xl text-center leading-relaxed"
             >
               Curated creators delivering authentic voices and measurable results for your brand.
             </motion.p>
          </div>

          {/* Search Bar */}
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.3 }}
             className="mb-8 w-full max-w-xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={nameSearchQuery}
                onChange={(e) => setNameSearchQuery(e.target.value)}
                placeholder="Search creators..."
                className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5072a7]/20 focus:border-[#5072a7] shadow-sm transition-all"
              />
              {nameSearchQuery && (
                <button
                  onClick={() => setNameSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.4 }}
             className="mb-10"
          >
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              availableTags={availableTags}
              availableLocations={availableLocations}
              metricRanges={metricRanges}
            />
          </motion.div>

          {/* Results Info */}
          <div className="flex items-center justify-between mb-8 px-2 border-b border-slate-200 pb-4">
              <div className="text-slate-900 font-semibold flex items-center gap-2">
                  <span className="tracking-tight text-xl">All Creators</span>
              </div>

              <div className="flex items-center gap-4">
                 {/* Sort Toggle */}
                 <button
                   onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                   className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                   title={sortDirection === 'asc' ? 'Oldest first' : 'Newest first'}
                 >
                   <ArrowUpDown className="w-4 h-4" />
                   <span>{sortDirection === 'asc' ? 'Oldest' : 'Newest'}</span>
                 </button>

                 <div className="text-sm text-slate-500">
                    <span className="text-slate-900 font-bold">{finalDisplayData.length}</span> Results
                 </div>
                 {(nameSearchQuery || activeFilterCount > 0) && (
                   <button
                     onClick={resetAll}
                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200"
                   >
                     <X className="w-3 h-3" />
                     Clear Filters
                   </button>
                 )}
              </div>
          </div>

          {/* Grid */}
          <div id="roster-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-10">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-20 text-center"
                >
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
                  <p className="text-slate-500">Loading creators...</p>
                </motion.div>
              ) : finalDisplayData.length > 0 ? (
                finalDisplayData.map((talent, index) => (
                  <motion.div
                    key={talent.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.5,
                      delay: (index % 5) * 0.05,
                      ease: [0.21, 0.47, 0.32, 0.98]
                    }}
                  >
                    <TalentCard talent={talent} onClick={() => openCreator(talent)} />
                  </motion.div>
                ))
              ) : (
                  <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full py-20 text-center"
                  >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                        <X className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-xl text-slate-900 font-medium mb-2">No creators found</p>
                      <p className="text-slate-500 max-w-md mx-auto mb-6">
                        Try adjusting your filters or search query to find who you're looking for.
                      </p>
                      <button
                        onClick={resetAll}
                        className="text-[#5072a7] font-semibold hover:underline"
                      >
                        Reset filters and view all
                      </button>
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      )}
      
      {/* Creator Profile Overlay */}
      <AnimatePresence>
        {selectedTalent && (
          <CreatorProfile talent={selectedTalent} onClose={closeCreator} />
        )}
      </AnimatePresence>
    </>
  );
};

export default Roster;
