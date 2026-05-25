
import React, { useState } from 'react';
import { FilterState, Talent } from '../types';
import { MapPin, User, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFieldOptions } from '../contexts/FieldOptionsContext';

interface MetricRanges {
  maxAvgViews: number;
  maxAvgLikes: number;
  maxAvgComments: number;
  maxTiktokAvgViews: number;
  maxTiktokAvgLikes: number;
  maxTiktokAvgComments: number;
  maxTiktokAvgShares: number;
  maxTiktokAvgSaves: number;
  maxTiktokTotalVideos: number;
  maxYoutubeAvgViews: number;
  maxYoutubeAvgLikes: number;
  maxYoutubeAvgComments: number;
  maxYoutubeTotalViews: number;
  maxYoutubeTotalVideos: number;
  maxInstagramAvgViews: number;
  maxInstagramAvgLikes: number;
  maxInstagramAvgComments: number;
}

interface FilterPanelProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  availableTags: string[];
  availableLocations: string[];
  metricRanges?: MetricRanges;
  showRateFilter?: boolean;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, setFilters, availableTags, availableLocations, metricRanges, showRateFilter = false }) => {
  const { rates: rateOptions, tiers: tierOptions, statuses: statusOptions } = useFieldOptions();
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleArrayItem = (key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const current = prev[key] as string[];
      return {
        ...prev,
        [key]: current.includes(value)
          ? current.filter(item => item !== value)
          : [...current, value]
      };
    });
  };

  const handleReachChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, minReach: parseInt(e.target.value) }));
  };

  const reachLabel = (val: number) => {
    if (val === 0) return 'Any Reach';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M+`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k+`;
    return val;
  };

  return (
    <div className="w-full mx-auto mb-12">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Header / Toggle */}
        <motion.div
          className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ backgroundColor: "rgba(248, 250, 252, 1)" }}
          whileTap={{ scale: 0.995 }}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Filter Creators</span>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="text-slate-400"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.div>

        {/* Filter Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden"
            >
              <div className="p-6 md:p-8 space-y-8 border-t border-slate-100">

                {/* 1. Categories (Primary Filter) */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => {
                      const isActive = filters.categories.includes(tag);
                      return (
                        <motion.button
                          key={tag}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleArrayItem('categories', tag)}
                          className={`
                            px-4 py-2 rounded-md text-xs font-semibold transition-colors duration-200 border
                            ${isActive
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50'}
                          `}
                        >
                          {tag}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                {/* 2. Secondary Filters Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                  {/* Reach Slider */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Min. Reach</h3>
                    </div>
                    <div className="px-1">
                      <input
                        type="range"
                        min="0"
                        max="2000000"
                        step="50000"
                        value={filters.minReach}
                        onChange={handleReachChange}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900 hover:accent-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                      />
                      <div className="mt-2 text-right">
                        <span className="inline-block px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-700 tabular-nums">
                          {reachLabel(filters.minReach)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <User className="w-3 h-3" /> Gender
                    </h3>
                    <div className="flex gap-2">
                      {['Male', 'Female'].map(g => {
                        const isActive = filters.genders.includes(g);
                        return (
                          <motion.button
                            key={g}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleArrayItem('genders', g)}
                            className={`
                                px-4 py-2 rounded-md text-xs font-semibold flex-1 border transition-colors
                                ${isActive
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}
                                `}
                          >
                            {g}
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Location - All available locations */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Location
                      {availableLocations.length > 0 && (
                        <span className="text-slate-400 font-normal normal-case">({availableLocations.length})</span>
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                      {availableLocations.map(loc => {
                        const isActive = filters.locations.includes(loc);
                        return (
                          <motion.button
                            key={loc}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleArrayItem('locations', loc)}
                            className={`
                                 px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-colors
                                 ${isActive
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800'}
                               `}
                          >
                            {loc}
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>

                </div>

                {/* Rate Filter - Admin Only */}
                {showRateFilter && (
                  <>
                    <div className="h-px bg-slate-100 w-full" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        Rate
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium normal-case">Admin</span>
                      </h3>
                      <div className="flex gap-2">
                        {rateOptions.map(rate => {
                          const isActive = filters.rates.includes(rate);
                          return (
                            <motion.button
                              key={rate}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleArrayItem('rates', rate)}
                              className={`
                                px-4 py-2 rounded-md text-xs font-semibold border transition-colors
                                ${isActive ? 'bg-[#5072a7] text-white border-[#5072a7]' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}
                              `}
                            >
                              {rate}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Tier Filter (Micro/Macro) */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        Tier
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium normal-case">Admin</span>
                      </h3>
                      <div className="flex gap-2">
                        {tierOptions.map(tier => {
                          const isActive = filters.tiers.includes(tier);
                          return (
                            <motion.button
                              key={tier}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleArrayItem('tiers', tier)}
                              className={`
                                px-4 py-2 rounded-md text-xs font-semibold border transition-colors
                                ${isActive ? 'bg-[#5072a7] text-white border-[#5072a7]' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}
                              `}
                            >
                              {tier}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Status Filter (Active/Inactive) */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        Status
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium normal-case">Admin</span>
                      </h3>
                      <div className="flex gap-2">
                        {statusOptions.map(status => {
                          const isActive = filters.statuses.includes(status);
                          return (
                            <motion.button
                              key={status}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleArrayItem('statuses', status)}
                              className={`
                                px-4 py-2 rounded-md text-xs font-semibold border transition-colors
                                ${isActive ? 'bg-[#5072a7] text-white border-[#5072a7]' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}
                              `}
                            >
                              {status}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FilterPanel;
