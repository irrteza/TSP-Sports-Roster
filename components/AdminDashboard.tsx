import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';
import { ROSTER_DATA } from '../constants';
import { fetchAirtableData, deleteAirtableRecord, reassignCreatorPosition, updateAirtableRecord } from '../lib/airtable';
import { sortByCreatedOn, SortDirection } from '../lib/sorting';
import TalentCard from './TalentCard';
import FilterPanel from './FilterPanel';
import CreatorProfile from './CreatorProfile';
import { FilterState, Talent } from '../types';
import { X, LogOut, Loader2, Plus, Search, LayoutGrid, List, Download, Check, Upload, FileDown, ArrowUpDown, Calendar, Share2, Star } from 'lucide-react';
import CreatorListRow from './CreatorListRow';
import { exportCreatorsToCSV } from '../lib/csvExport';
import { downloadCSVTemplate } from '../lib/csvImport';
import { motion, AnimatePresence } from 'framer-motion';
import CSVImportModal from './CSVImportModal';
import PositionAssignModal from './PositionAssignModal';

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [masterData, setMasterData] = useState<Talent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);

  // New state for list view, selection, and search
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [positionAssignTarget, setPositionAssignTarget] = useState<Talent | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'last2weeks' | 'lastMonth'>('all');
  const [bulkLinkCopied, setBulkLinkCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'allStars'>('all');

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
    rates: [], // Admin-only rate filter
    tiers: [], // Admin-only tier filter (Micro/Macro)
    statuses: [], // Admin-only status filter (Active/Inactive)
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
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAirtableData();
      setMasterData(data);
    } catch (error) {
      console.error('Failed to load data:', error);
      setMasterData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    masterData.forEach(t => { if (t.location) locs.add(t.location) });
    return Array.from(locs).sort();
  }, [masterData]);

  // Calculate dynamic max values for engagement metric sliders
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

    // Return with fallback defaults if no data
    return {
      maxAvgViews: maxAvgViews || 10000000,
      maxAvgLikes: maxAvgLikes || 1000000,
      maxAvgComments: maxAvgComments || 100000,
      maxTiktokAvgViews: maxTiktokAvgViews || 10000000,
      maxTiktokAvgLikes: maxTiktokAvgLikes || 1000000,
      maxTiktokAvgComments: maxTiktokAvgComments || 100000,
      maxTiktokAvgShares: maxTiktokAvgShares || 100000,
      maxTiktokAvgSaves: maxTiktokAvgSaves || 100000,
      maxTiktokTotalVideos: maxTiktokTotalVideos || 10000,
      maxYoutubeAvgViews: maxYoutubeAvgViews || 10000000,
      maxYoutubeAvgLikes: maxYoutubeAvgLikes || 1000000,
      maxYoutubeAvgComments: maxYoutubeAvgComments || 100000,
      maxYoutubeTotalViews: maxYoutubeTotalViews || 1000000000,
      maxYoutubeTotalVideos: maxYoutubeTotalVideos || 10000,
      maxInstagramAvgViews: maxInstagramAvgViews || 10000000,
      maxInstagramAvgLikes: maxInstagramAvgLikes || 1000000,
      maxInstagramAvgComments: maxInstagramAvgComments || 100000,
    };
  }, [masterData]);

  const parseCount = (str: string): number => {
    if (!str) return 0;
    const s = str.toLowerCase().replace(/,/g, '');
    if (s.endsWith('m')) return parseFloat(s) * 1000000;
    if (s.endsWith('k')) return parseFloat(s) * 1000;
    return parseFloat(s);
  };

  const filteredData = useMemo(() => {
    const filtered = masterData.filter(talent => {
      // Search by name
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!talent.name.toLowerCase().includes(query)) return false;
      }
      // Date filter
      if (dateFilter !== 'all') {
        if (!talent.createdOn) return false;
        const createdTime = new Date(talent.createdOn).getTime();
        const now = Date.now();
        const threshold = dateFilter === 'last2weeks' ? 14 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        if (now - createdTime > threshold) return false;
      }

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
      if (filters.locations.length > 0) {
        if (!filters.locations.includes(talent.location)) return false;
      }
      if (filters.genders.length > 0) {
        if (!filters.genders.includes(talent.gender)) return false;
      }
      if (filters.audienceAges.length > 0) {
        if (!filters.audienceAges.includes(talent.audienceAge)) return false;
      }
      // Rate filter (admin-only)
      if (filters.rates.length > 0) {
        if (!talent.rate || !filters.rates.includes(talent.rate)) return false;
      }
      // Tier filter (admin-only - Micro/Macro)
      if (filters.tiers.length > 0) {
        if (!talent.tier || !filters.tiers.includes(talent.tier)) return false;
      }
      // Status filter (admin-only - Active/Inactive)
      if (filters.statuses.length > 0) {
        if (!talent.status || !filters.statuses.includes(talent.status)) return false;
      }
      // Platform-specific follower filters
      if (filters.minInstagram > 0) {
        const stat = talent.stats.find(s => s.platform.toLowerCase() === 'instagram');
        if (!stat || parseCount(stat.followerCount) < filters.minInstagram) return false;
      }
      if (filters.minTiktok > 0) {
        const stat = talent.stats.find(s => s.platform.toLowerCase() === 'tiktok');
        if (!stat || parseCount(stat.followerCount) < filters.minTiktok) return false;
      }
      if (filters.minYoutube > 0) {
        const stat = talent.stats.find(s => s.platform.toLowerCase() === 'youtube');
        if (!stat || parseCount(stat.followerCount) < filters.minYoutube) return false;
      }
      if (filters.minFacebook > 0) {
        const stat = talent.stats.find(s => s.platform.toLowerCase() === 'facebook');
        if (!stat || parseCount(stat.followerCount) < filters.minFacebook) return false;
      }

      // Cross-platform engagement filters (any platform that meets threshold)
      if (filters.minAvgViews > 0) {
        const hasQualifyingPlatform = talent.stats.some(s =>
          s.metrics?.avgViews && s.metrics.avgViews >= filters.minAvgViews
        );
        if (!hasQualifyingPlatform) return false;
      }
      if (filters.minAvgLikes > 0) {
        const hasQualifyingPlatform = talent.stats.some(s =>
          s.metrics?.avgLikes && s.metrics.avgLikes >= filters.minAvgLikes
        );
        if (!hasQualifyingPlatform) return false;
      }
      if (filters.minAvgComments > 0) {
        const hasQualifyingPlatform = talent.stats.some(s =>
          s.metrics?.avgComments && s.metrics.avgComments >= filters.minAvgComments
        );
        if (!hasQualifyingPlatform) return false;
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

      return true;
    });

    // Manually positioned creators (position < 100000) are always pinned at the top,
    // sorted by their position ascending. Everyone else sorts by date in the chosen direction.
    const MANUAL_POSITION_THRESHOLD = 100000;
    const manuallyPositioned = filtered.filter(t => t.position != null && t.position < MANUAL_POSITION_THRESHOLD);
    const rest = filtered.filter(t => t.position == null || t.position >= MANUAL_POSITION_THRESHOLD);
    manuallyPositioned.sort((a, b) => a.position! - b.position!);
    sortByCreatedOn(rest, sortDirection);
    const sorted = [...manuallyPositioned, ...rest];

    // When on All Stars tab, show only starred creators
    if (activeTab === 'allStars') {
      return sorted.filter(t => t.allStar);
    }

    return sorted;
  }, [masterData, filters, searchQuery, sortDirection, dateFilter, activeTab]);

  const activeFilterCount =
    filters.categories.length +
    filters.platforms.length +
    filters.locations.length +
    filters.genders.length +
    filters.audienceAges.length +
    filters.rates.length +
    filters.tiers.length +
    filters.statuses.length +
    (filters.minReach > 0 ? 1 : 0) +
    (filters.minInstagram > 0 ? 1 : 0) +
    (filters.minTiktok > 0 ? 1 : 0) +
    (filters.minYoutube > 0 ? 1 : 0) +
    (filters.minFacebook > 0 ? 1 : 0) +
    // Cross-platform engagement filters
    (filters.minAvgViews > 0 ? 1 : 0) +
    (filters.minAvgLikes > 0 ? 1 : 0) +
    (filters.minAvgComments > 0 ? 1 : 0) +
    // TikTok engagement filters
    (filters.minTiktokAvgViews > 0 ? 1 : 0) +
    (filters.minTiktokAvgLikes > 0 ? 1 : 0) +
    (filters.minTiktokAvgComments > 0 ? 1 : 0) +
    (filters.minTiktokAvgShares > 0 ? 1 : 0) +
    (filters.minTiktokAvgSaves > 0 ? 1 : 0) +
    (filters.minTiktokTotalVideos > 0 ? 1 : 0) +
    // YouTube engagement filters
    (filters.minYoutubeAvgViews > 0 ? 1 : 0) +
    (filters.minYoutubeAvgLikes > 0 ? 1 : 0) +
    (filters.minYoutubeAvgComments > 0 ? 1 : 0) +
    (filters.minYoutubeTotalViews > 0 ? 1 : 0) +
    (filters.minYoutubeTotalVideos > 0 ? 1 : 0) +
    // Instagram engagement filters
    (filters.minInstagramAvgViews > 0 ? 1 : 0) +
    (filters.minInstagramAvgLikes > 0 ? 1 : 0) +
    (filters.minInstagramAvgComments > 0 ? 1 : 0) +
    (dateFilter !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setDateFilter('all');
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
      rates: [],
      tiers: [],
      statuses: [],
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
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDelete = async (talent: Talent) => {
    const result = await deleteAirtableRecord(talent.id);
    if (result.success) {
      setMasterData(prev => prev.filter(t => t.id !== talent.id));
      // Also remove from selection if selected
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(talent.id);
        return next;
      });
    } else {
      console.error('Delete failed:', result.error);
    }
  };

  // Selection helpers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredData.map(t => t.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleExportCSV = () => {
    const selectedCreators = masterData.filter(t => selectedIds.has(t.id));
    if (selectedCreators.length > 0) {
      exportCreatorsToCSV(selectedCreators, `creators-export-${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const handleBulkShareLink = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const param = ids.length === 1 ? `creator=${ids[0]}` : `creators=${ids.join(',')}`;
    const url = `${window.location.origin}/?${param}`;
    navigator.clipboard.writeText(url).then(() => {
      setBulkLinkCopied(true);
      setTimeout(() => setBulkLinkCopied(false), 2000);
    });
  };

  const handlePositionAssign = async (targetPosition: number) => {
    if (!positionAssignTarget) return;

    const result = await reassignCreatorPosition(
      positionAssignTarget.id,
      targetPosition,
      masterData.map(c => ({ id: c.id, position: c.position }))
    );

    if (result.success) {
      setPositionAssignTarget(null);
      await loadData();
    } else {
      throw new Error(result.error || 'Failed to update position');
    }
  };

  const allStarCount = useMemo(() => masterData.filter(t => t.allStar).length, [masterData]);

  const handleAllStarToggle = async (id: string, allStar: boolean) => {
    // Optimistic update
    setMasterData(prev => prev.map(t => t.id === id ? { ...t, allStar } : t));
    // Persist to Airtable
    const result = await updateAirtableRecord(id, { allStar });
    if (!result.success) {
      // Revert on failure
      setMasterData(prev => prev.map(t => t.id === id ? { ...t, allStar: !allStar } : t));
      alert('Failed to save All Star status. Please try again.');
    }
  };

  const totalPositionedCreators = useMemo(() => {
    // Only count manually-positioned creators (< 100000); auto-assigned defaults don't count
    return masterData.filter(t => t.position != null && t.position < 100000).length;
  }, [masterData]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <img src={logo} alt="TSP Talent" className="h-6 object-contain" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            availableTags={availableTags}
            availableLocations={availableLocations}
            metricRanges={metricRanges}
            showRateFilter={true}
          />
        </motion.div>

        {/* Results Info + Tabs */}
        <div className="flex items-center justify-between mb-8 px-2 border-b border-slate-200 pb-0">
          <div className="flex items-center gap-6">
            {/* All Creators Tab */}
            <button
              onClick={() => setActiveTab('all')}
              className={`relative pb-3 text-lg font-semibold tracking-tight transition-colors ${
                activeTab === 'all'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              All Creators
              {activeTab === 'all' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full"
                />
              )}
            </button>

            {/* All Stars Tab */}
            <button
              onClick={() => setActiveTab('allStars')}
              className={`relative pb-3 text-lg font-semibold tracking-tight transition-colors flex items-center gap-2 ${
                activeTab === 'allStars'
                  ? 'text-amber-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Star className={`w-4 h-4 ${activeTab === 'allStars' ? 'fill-amber-400 text-amber-500' : ''}`} />
              All Stars
              {allStarCount > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {allStarCount}
                </span>
              )}
              {activeTab === 'allStars' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full"
                />
              )}
            </button>

            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium mb-3">
              Admin View
            </span>
          </div>

          <div className="flex items-center gap-4 pb-3">
            <div className="text-sm text-slate-500">
              <span className="text-slate-900 font-bold">{filteredData.length}</span> Results
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200"
              >
                <X className="w-3 h-3" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Admin Toolbar: Search, View Toggle, Selection Actions */}
        <div className="flex flex-wrap items-center gap-4 mb-6 bg-white rounded-xl border border-slate-200 p-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5072a7]/20 focus:border-[#5072a7] transition-all"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'card'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Toggle */}
          <button
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            title={sortDirection === 'asc' ? 'Oldest first' : 'Newest first'}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">{sortDirection === 'asc' ? 'Oldest' : 'Newest'}</span>
          </button>

          {/* Date Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setDateFilter(prev => prev === 'last2weeks' ? 'all' : 'last2weeks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateFilter === 'last2weeks'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Show creators added in the last 2 weeks"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">2 Weeks</span>
            </button>
            <button
              onClick={() => setDateFilter(prev => prev === 'lastMonth' ? 'all' : 'lastMonth')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateFilter === 'lastMonth'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Show creators added in the last month"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">1 Month</span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          {/* Selection Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {selectedIds.size > 0 && (
              <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {selectedIds.size} selected
              </span>
            )}
            <button
              onClick={selectAll}
              className="text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={handleExportCSV}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#5072a7] text-white rounded-lg hover:bg-[#3d5a87] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handleBulkShareLink}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#5072a7] text-white rounded-lg hover:bg-[#3d5a87] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkLinkCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share Link
                </>
              )}
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <button
              onClick={downloadCSVTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              <FileDown className="w-4 h-4" />
              Download Template
            </button>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          {/* Add Influencer */}
          <button
            onClick={() => navigate('/admin/add')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Influencer
          </button>
        </div>

        {/* Creator Display - Card or List View */}
        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading creators...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <X className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-xl text-slate-900 font-medium mb-2">No creators found</p>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              Try adjusting your filters or search to find who you're looking for.
            </p>
            <button
              onClick={resetFilters}
              className="text-[#5072a7] font-semibold hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : viewMode === 'card' ? (
          /* Card Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-5 gap-y-6">
            <AnimatePresence mode="popLayout">
              {filteredData.map((talent, index) => (
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
                  <TalentCard
                    talent={talent}
                    onClick={() => setSelectedTalent(talent)}
                    onEdit={() => navigate(`/admin/edit/${talent.id}`)}
                    onDelete={() => handleDelete(talent)}
                    onMovePosition={() => setPositionAssignTarget(talent)}
                    showAddress={true}
                    showRate={true}
                    showNotes={true}
                    onAllStarToggle={handleAllStarToggle}
                    onNotesChange={async (id, notes) => {
                      await updateAirtableRecord(id, { notes });
                      setMasterData(prev => prev.map(t =>
                        t.id === id ? { ...t, notes } : t
                      ));
                    }}
                    isSelected={selectedIds.has(talent.id)}
                    onSelectionChange={toggleSelection}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* List Header */}
            <div className="grid grid-cols-[40px_60px_1fr_1fr_100px_70px_80px] md:grid-cols-[40px_70px_1fr_200px_100px_70px_100px] gap-3 md:gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="flex items-center justify-center">
                <button
                  onClick={() => {
                    const allFilteredSelected = filteredData.every(t => selectedIds.has(t.id));
                    if (allFilteredSelected) {
                      deselectAll();
                    } else {
                      selectAll();
                    }
                  }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    filteredData.length > 0 && filteredData.every(t => selectedIds.has(t.id))
                      ? 'bg-[#5072a7] border-[#5072a7]'
                      : 'border-slate-300 hover:border-[#5072a7]'
                  }`}
                >
                  {filteredData.length > 0 && filteredData.every(t => selectedIds.has(t.id)) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>
              </div>
              <div>Photo</div>
              <div>Creator</div>
              <div>Platforms</div>
              <div className="text-center">Reach</div>
              <div className="text-center">Rate</div>
              <div className="text-right">Actions</div>
            </div>
            {/* List Rows */}
            {filteredData.map(talent => (
              <CreatorListRow
                key={talent.id}
                talent={talent}
                isSelected={selectedIds.has(talent.id)}
                onSelectionChange={toggleSelection}
                onClick={() => setSelectedTalent(talent)}
                onEdit={() => navigate(`/admin/edit/${talent.id}`)}
                onDelete={() => handleDelete(talent)}
                onMovePosition={() => setPositionAssignTarget(talent)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Creator Profile Overlay */}
      <AnimatePresence>
        {selectedTalent && (
          <CreatorProfile
            talent={selectedTalent}
            onClose={() => setSelectedTalent(null)}
            isAdmin={true}
            onNotesChange={async (notes) => {
              await updateAirtableRecord(selectedTalent.id, { notes });
              setMasterData(prev => prev.map(t =>
                t.id === selectedTalent.id ? { ...t, notes } : t
              ));
              setSelectedTalent(prev => prev ? { ...prev, notes } : null);
            }}
          />
        )}
      </AnimatePresence>

      {/* CSV Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <CSVImportModal
            onClose={() => setIsImportModalOpen(false)}
            onSuccess={(count) => {
              setIsImportModalOpen(false);
              loadData();
            }}
          />
        )}
      </AnimatePresence>

      {/* Position Assign Modal */}
      <AnimatePresence>
        {positionAssignTarget && (
          <PositionAssignModal
            talent={positionAssignTarget}
            totalPositionedCreators={totalPositionedCreators}
            onClose={() => setPositionAssignTarget(null)}
            onConfirm={handlePositionAssign}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
