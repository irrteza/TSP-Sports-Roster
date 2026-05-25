
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Talent, SocialStat } from '../types';
import { X, MapPin, ArrowUpRight, ChevronLeft, ChevronRight, Share2, Check, Loader2 } from 'lucide-react';
import { InstagramIcon, YouTubeIcon, FacebookIcon, TikTokIcon } from './SocialIcons';

interface CreatorProfileProps {
  talent: Talent;
  onClose: () => void;
  isAdmin?: boolean;
  onNotesChange?: (notes: string) => void;
}

// Helper to parse "3.1M" into ["3.1", "M"]
const parseMetric = (value: string) => {
  const match = value.match(/^([\d.,]+)(.*)$/);
  return match ? [match[1], match[2]] : [value, ''];
};

const BigStatCard = ({ label, value, subtext }: { label: string, value: string, subtext?: string }) => {
  const [num, unit] = parseMetric(value);

  return (
    <div className="flex flex-col">
       <div className="flex items-baseline gap-1">
          <span className="text-5xl md:text-7xl font-light tracking-tighter text-slate-900">{num}</span>
          <span className="text-xl md:text-3xl font-medium text-[#5072a7] mb-auto pt-2">{unit}</span>
       </div>
       <div className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">{label}</div>
       {subtext && <div className="text-sm text-slate-400 mt-1 font-medium">{subtext}</div>}
    </div>
  );
};

// Format large numbers for display (e.g., 15234 -> "15.2K")
const formatMetricValue = (value: number | undefined): string => {
  if (value === undefined || value === 0) return '-';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

// Calculate platform engagement rate: (likes + comments + shares) / views * 100
// Shares only available for TikTok
const calculatePlatformEngagementRate = (stat: SocialStat): string => {
  const metrics = stat.metrics;
  if (!metrics || !metrics.avgViews || metrics.avgViews === 0) return '-';

  const likes = metrics.avgLikes || 0;
  const comments = metrics.avgComments || 0;
  const shares = stat.platform === 'TikTok' ? (metrics.avgShares || 0) : 0;

  const rate = ((likes + comments + shares) / metrics.avgViews) * 100;
  return `${rate.toFixed(2)}%`;
};

// Calculate overall engagement rate: (likes + comments + shares) / views * 100
const calculateOverallEngagementRate = (stats: SocialStat[]): string => {
  let totalEngagement = 0;
  let totalViews = 0;

  stats.forEach(stat => {
    if (stat.metrics && stat.metrics.avgViews) {
      const { avgLikes = 0, avgComments = 0, avgShares = 0, avgViews = 0 } = stat.metrics;
      totalEngagement += avgLikes + avgComments + avgShares;
      totalViews += avgViews;
    }
  });

  if (totalViews === 0) return '-';
  const rate = (totalEngagement / totalViews) * 100;
  return `${rate.toFixed(2)}%`;
};

// Calculate total average views across platforms
const calculateTotalAvgViews = (stats: SocialStat[]): string => {
  let totalViews = 0;
  let platformCount = 0;

  stats.forEach(stat => {
    if (stat.metrics?.avgViews) {
      totalViews += stat.metrics.avgViews;
      platformCount++;
    }
  });

  if (platformCount === 0) return '-';
  return formatMetricValue(Math.round(totalViews / platformCount));
};

// Platform icon component
const PlatformIcon = ({ platform, className }: { platform: string, className?: string }) => {
  switch (platform.toLowerCase()) {
    case 'instagram': return <InstagramIcon className={className} />;
    case 'tiktok': return <TikTokIcon className={className} />;
    case 'youtube': return <YouTubeIcon className={className} />;
    case 'facebook': return <FacebookIcon className={className} />;
    default: return null;
  }
};

// Platform Metrics Card Component
interface PlatformMetricsCardProps {
  stat: SocialStat;
  index: number;
}

const PlatformMetricsCard: React.FC<PlatformMetricsCardProps> = ({ stat, index }) => {
  const hasMetrics = stat.metrics && (
    stat.metrics.avgLikes !== undefined ||
    stat.metrics.avgViews !== undefined ||
    stat.metrics.avgComments !== undefined
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + (index * 0.1) }}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#5072a7]/30 transition-all"
    >
      {/* Platform Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-slate-900">
            <PlatformIcon platform={stat.platform} className="w-8 h-8" />
          </div>
          <div>
            <div className="font-bold text-slate-900">{stat.platform}</div>
            <div className="text-xs text-slate-500">{stat.followerCount} Followers</div>
          </div>
        </div>
        {stat.link && (
          <a href={stat.link} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowUpRight className="w-4 h-4 text-[#5072a7]" />
          </a>
        )}
      </div>

      {/* Engagement Metrics Grid - Only if metrics exist */}
      {hasMetrics && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-4 border-t border-slate-100">
          {/* Engagement Rate (primary) */}
          <div>
            <div className="text-lg font-bold text-[#5072a7]">
              {calculatePlatformEngagementRate(stat)}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Engagement</div>
          </div>

          {/* Avg Views */}
          <div>
            <div className="text-lg font-bold text-slate-900">
              {formatMetricValue(stat.metrics?.avgViews)}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Avg Views</div>
          </div>

          {/* Avg Likes */}
          <div>
            <div className="text-lg font-bold text-slate-900">
              {formatMetricValue(stat.metrics?.avgLikes)}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Avg Likes</div>
          </div>

          {/* Avg Comments */}
          <div>
            <div className="text-lg font-bold text-slate-900">
              {formatMetricValue(stat.metrics?.avgComments)}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Avg Comments</div>
          </div>
        </div>
      )}

      {/* TikTok-specific additional metrics */}
      {stat.platform === 'TikTok' && stat.metrics && (stat.metrics.avgShares !== undefined || stat.metrics.avgSaves !== undefined || stat.metrics.totalVideos !== undefined) && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-3 pt-3 border-t border-slate-50">
          {stat.metrics.avgShares !== undefined && (
            <div>
              <div className="text-sm font-semibold text-slate-700">
                {formatMetricValue(stat.metrics.avgShares)}
              </div>
              <div className="text-[10px] text-slate-400 tracking-wide">Avg Shares</div>
            </div>
          )}
          {stat.metrics.avgSaves !== undefined && (
            <div>
              <div className="text-sm font-semibold text-slate-700">
                {formatMetricValue(stat.metrics.avgSaves)}
              </div>
              <div className="text-[10px] text-slate-400 tracking-wide">Avg Saves</div>
            </div>
          )}
          {stat.metrics.totalVideos !== undefined && (
            <div>
              <div className="text-sm font-semibold text-slate-700">
                {formatMetricValue(stat.metrics.totalVideos)}
              </div>
              <div className="text-[10px] text-slate-400 tracking-wide">Videos</div>
            </div>
          )}
        </div>
      )}

      {/* YouTube-specific additional metrics */}
      {stat.platform === 'YouTube' && stat.metrics && (stat.metrics.totalViews !== undefined || stat.metrics.totalVideos !== undefined) && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-3 pt-3 border-t border-slate-50">
          {stat.metrics.totalViews !== undefined && (
            <div>
              <div className="text-sm font-semibold text-slate-700">
                {formatMetricValue(stat.metrics.totalViews)}
              </div>
              <div className="text-[10px] text-slate-400 tracking-wide">Total Views</div>
            </div>
          )}
          {stat.metrics.totalVideos !== undefined && (
            <div>
              <div className="text-sm font-semibold text-slate-700">
                {formatMetricValue(stat.metrics.totalVideos)}
              </div>
              <div className="text-[10px] text-slate-400 tracking-wide">Videos</div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

const CreatorProfile: React.FC<CreatorProfileProps> = ({ talent, onClose, isAdmin, onNotesChange }) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [notesValue, setNotesValue] = useState(talent.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastPinchDistance = useRef<number | null>(null);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => {
    setLightboxIndex(null);
    resetZoom();
  };

  const goToPrev = () => {
    if (lightboxIndex !== null && talent.analytics && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
      resetZoom();
    }
  };

  const goToNext = () => {
    if (lightboxIndex !== null && talent.analytics && lightboxIndex < talent.analytics.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
      resetZoom();
    }
  };

  // Click to toggle zoom
  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoomLevel === 1) {
      setZoomLevel(2);
    } else {
      resetZoom();
    }
  };

  // Scroll wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoomLevel(prev => {
      const newZoom = Math.min(Math.max(prev + delta, 1), 3);
      if (newZoom === 1) setPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };

  // Mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for pinch zoom and pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDistance.current = dist;
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - lastPinchDistance.current) * 0.01;
      setZoomLevel(prev => {
        const newZoom = Math.min(Math.max(prev + delta, 1), 3);
        if (newZoom === 1) setPosition({ x: 0, y: 0 });
        return newZoom;
      });
      lastPinchDistance.current = dist;
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    lastPinchDistance.current = null;
    setIsDragging(false);
  };

  const handleShareLink = useCallback(() => {
    const url = `${window.location.origin}?creator=${talent.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [talent.id]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />
      
      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-[1400px] h-[100dvh] md:h-[90vh] bg-[#F8FAFC] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleShareLink}
            className="p-2 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full text-white transition-colors border border-white/20"
            title="Copy link"
          >
            {linkCopied ? <Check className="w-6 h-6 text-green-400" /> : <Share2 className="w-6 h-6" />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full text-white transition-colors border border-white/20"
          >
            <X className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Left Column: Hero Image & Overlay */}
        <div className="w-full md:w-[45%] h-[35vh] md:h-full relative shrink-0 overflow-hidden group">
          <div className="absolute inset-0">
             <img 
                src={talent.image} 
                alt={talent.name} 
                className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" 
             />
             <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-90" />
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-0 left-0 w-full p-6 md:p-12 text-white z-10"
          >
             <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
               {talent.tags.map(tag => (
                 <span key={tag} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] md:text-xs font-bold border border-white/20 tracking-wide uppercase">
                   {tag}
                 </span>
               ))}
             </div>
             <h2 className="text-4xl md:text-7xl font-semibold mb-2 md:mb-4 tracking-tighter leading-[0.9]">{talent.name}</h2>
             <div className="flex items-center gap-2 text-white/70 font-medium tracking-wide text-sm md:text-base">
               <MapPin className="w-4 h-4" /> {talent.location}
             </div>
          </motion.div>
        </div>

        {/* Right Column: Data Dashboard */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar">
          <div className="p-6 md:p-16 space-y-10 md:space-y-12 pb-20">
            
            {/* Bio */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
            >
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> 
                About
              </h3>
              <p className="text-lg md:text-2xl text-slate-800 leading-relaxed font-light">
                {talent.bio}
              </p>
            </motion.div>

            {/* Platform Performance Section */}
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.5 }}
               className="border-t border-slate-200 pt-8 md:pt-10"
            >
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Platform Performance</h3>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {talent.stats.map((stat, i) => (
                    <PlatformMetricsCard key={stat.platform} stat={stat} index={i} />
                  ))}
               </div>
            </motion.div>

            {/* Key Metrics */}
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.6 }}
               className="border-t border-slate-200 pt-8 md:pt-10"
            >
               <BigStatCard
                 label="Collective Reach"
                 value={talent.totalReach}
               />
            </motion.div>

            {/* Statistics Screenshots */}
            {talent.analytics && talent.analytics.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 }}
                className="border-t border-slate-200 pt-8 md:pt-10"
              >
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Statistics Screenshots</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {talent.analytics.map((url, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.85 + (i * 0.05) }}
                      onClick={() => openLightbox(i)}
                      className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 hover:border-[#5072a7]/50 transition-all group cursor-pointer"
                    >
                      <img
                        src={url}
                        alt={`Analytics screenshot ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Lightbox Modal */}
            <AnimatePresence>
              {lightboxIndex !== null && talent.analytics && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
                  onClick={closeLightbox}
                >
                  {/* Close button */}
                  <button
                    onClick={closeLightbox}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  {/* Navigation - Previous */}
                  {lightboxIndex > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                      className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}

                  {/* Navigation - Next */}
                  {lightboxIndex < talent.analytics.length - 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); goToNext(); }}
                      className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}

                  {/* Image with zoom */}
                  <motion.div
                    key={lightboxIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative select-none"
                    onClick={(e) => e.stopPropagation()}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ touchAction: 'none' }}
                  >
                    <img
                      src={talent.analytics[lightboxIndex]}
                      alt={`Analytics screenshot ${lightboxIndex + 1}`}
                      className={`max-w-[90vw] max-h-[85vh] object-contain rounded-lg transition-transform duration-150 ${
                        zoomLevel > 1 ? 'cursor-grab' : 'cursor-zoom-in'
                      } ${isDragging ? 'cursor-grabbing' : ''}`}
                      style={{
                        transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                      }}
                      onClick={handleImageClick}
                      draggable={false}
                    />
                  </motion.div>

                  {/* Image counter and zoom indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <div className="px-4 py-2 bg-white/10 rounded-full text-white text-sm">
                      {lightboxIndex + 1} / {talent.analytics.length}
                    </div>
                    {zoomLevel > 1 && (
                      <div className="px-3 py-2 bg-white/10 rounded-full text-white text-sm">
                        {Math.round(zoomLevel * 100)}%
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Admin Notes */}
            {isAdmin && onNotesChange && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="border-t border-slate-200 pt-8 md:pt-10"
              >
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Admin Notes
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium normal-case tracking-normal">Internal Only</span>
                </h3>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#5072a7] focus:ring-2 focus:ring-[#5072a7]/20 outline-none transition-all bg-white min-h-[100px] resize-y text-sm text-slate-700"
                  placeholder="Add internal notes about this creator..."
                />
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={async () => {
                      setIsSavingNotes(true);
                      setNotesSaved(false);
                      await onNotesChange(notesValue);
                      setIsSavingNotes(false);
                      setNotesSaved(true);
                      setTimeout(() => setNotesSaved(false), 2000);
                    }}
                    disabled={isSavingNotes || notesValue === (talent.notes || '')}
                    className="px-4 py-2 bg-[#5072a7] text-white rounded-lg hover:bg-[#3d5a87] transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingNotes ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                    ) : notesSaved ? (
                      <><Check className="w-3.5 h-3.5" /> Saved</>
                    ) : (
                      'Save Notes'
                    )}
                  </button>
                  {notesValue !== (talent.notes || '') && (
                    <span className="text-xs text-slate-400">Unsaved changes</span>
                  )}
                </div>
              </motion.div>
            )}

             {/* Connect CTA */}
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.9 }}
               className="border-t border-slate-200 pt-8 md:pt-10 pb-4"
             >
                <motion.a
                   href="https://tsptalent.co/brand-inquiries"
                   target="_blank"
                   rel="noopener noreferrer"
                   whileHover={{ scale: 1.01, backgroundColor: "#1e293b" }}
                   whileTap={{ scale: 0.98 }}
                   className="w-full bg-slate-900 text-white text-base md:text-lg font-medium py-4 md:py-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 group"
                >
                   Request Booking Info
                   <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </motion.a>
             </motion.div>

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreatorProfile;
