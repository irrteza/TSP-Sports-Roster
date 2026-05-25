
import React, { useState } from 'react';
import { Talent } from '../types';
import { InstagramIcon, YouTubeIcon, FacebookIcon, TikTokIcon } from './SocialIcons';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Check, ArrowUpDown, Star } from 'lucide-react';

interface TalentCardProps {
  talent: Talent;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMovePosition?: () => void;
  showAddress?: boolean;
  showRate?: boolean;
  showNotes?: boolean;
  onNotesChange?: (id: string, notes: string) => void;
  onAllStarToggle?: (id: string, allStar: boolean) => void;
  isSelected?: boolean;
  onSelectionChange?: (id: string) => void;
}

const getRateBadgeStyles = (rate: string | undefined) => {
  switch (rate) {
    case 'Low':
      return 'bg-green-100 text-green-700';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'High':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-500';
  }
};

const getIcon = (platform: string) => {
  const cn = "w-3.5 h-3.5"; 
  switch (platform.toLowerCase()) {
    case 'instagram': return <InstagramIcon className={cn} />;
    case 'youtube': return <YouTubeIcon className={cn} />;
    case 'facebook': return <FacebookIcon className={cn} />;
    case 'tiktok': return <TikTokIcon className={cn} />;
    default: return null;
  }
};

// Format large numbers for display (e.g., 2100000 -> "2.1M", 57400 -> "57.4K")
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

// Parse a follower count string like "2,400,000" or "57,400" to a number, then format as K/M
const formatFollowerDisplay = (raw?: number, formatted?: string): string => {
  if (raw && raw > 0) return formatNumber(raw);
  if (!formatted || formatted === '0') return '0';
  // Parse comma-formatted strings like "2,400,000"
  const num = parseInt(formatted.replace(/,/g, ''), 10);
  if (!isNaN(num) && num > 0) return formatNumber(num);
  return formatted;
};

const TalentCard: React.FC<TalentCardProps> = ({ talent, onClick, onEdit, onDelete, onMovePosition, showAddress = false, showRate = false, showNotes = false, onNotesChange, onAllStarToggle, isSelected = false, onSelectionChange }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(talent.notes || '');
  const handle = `@${talent.name.replace(/\s+/g, '').toLowerCase()}`;

  // Parse stats for display
  const topGender = talent.demographics.male > talent.demographics.female ? 'MALE' : 'FEMALE';
  const topGenderVal = Math.max(talent.demographics.male, talent.demographics.female);

  // Calculate total reach from scraped values
  const calculatedTotalReach = talent.stats.reduce((sum, stat) => {
    const followers = stat.metrics?.scrapedFollowers ?? stat.rawFollowerCount ?? 0;
    return sum + followers;
  }, 0);

  return (
    <motion.div 
      onClick={onClick} 
      whileHover={{ y: -8, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
      whileTap={{ scale: 0.98 }}
      initial={{ border: "1px solid #e2e8f0" }}
      animate={{ borderColor: "#e2e8f0" }}
      className="group bg-white rounded-xl overflow-hidden hover:border-[#5072a7] transition-colors duration-300 cursor-pointer flex flex-col h-full relative z-0"
    >
      {/* Top Section: Image */}
      <div className="relative aspect-[4/5] w-full bg-slate-100 overflow-hidden border-b border-slate-100 group-hover:border-[#5072a7]/20 transition-colors">
        {!imageLoaded && (
             <div className="absolute inset-0 bg-slate-200 animate-pulse" />
        )}
        <motion.img
          src={talent.image}
          alt={talent.name}
          className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />

        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 z-10"
            title="Edit creator"
          >
            <Pencil className="w-4 h-4 text-slate-600" />
          </button>
        )}

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="absolute top-3 right-14 p-2 bg-red-500/90 hover:bg-red-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 z-10"
            title="Delete creator"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        )}

        {onMovePosition && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMovePosition();
            }}
            className="absolute top-3 right-[6.5rem] p-2 bg-[#5072a7]/90 hover:bg-[#5072a7] rounded-lg shadow-md hover:shadow-lg transition-all duration-200 z-10"
            title="Move to position"
          >
            <ArrowUpDown className="w-4 h-4 text-white" />
          </button>
        )}

        {/* All Star Toggle - Bottom Left of Image */}
        {onAllStarToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAllStarToggle(talent.id, !talent.allStar);
            }}
            className={`absolute bottom-3 right-3 p-1.5 rounded-full transition-all duration-200 z-10 hover:scale-110 ${talent.allStar ? 'bg-black/40' : 'bg-black/30 hover:bg-black/40'}`}
            title={talent.allStar ? 'Remove All Star' : 'Mark as All Star'}
          >
            <Star className={`w-6 h-6 ${talent.allStar ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]' : 'text-white/80 hover:text-white drop-shadow-md'}`} />
          </button>
        )}

        {/* Selection Checkbox - Top Left */}
        {onSelectionChange && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange(talent.id);
            }}
            className={`absolute top-3 left-3 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 z-10 shadow-md ${
              isSelected
                ? 'bg-[#5072a7] border-[#5072a7]'
                : 'bg-white/90 border-slate-300 hover:border-[#5072a7]'
            }`}
            title={isSelected ? 'Deselect creator' : 'Select creator'}
          >
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </button>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-3">
          <h3 className="text-slate-900 font-bold text-lg leading-tight truncate group-hover:text-[#5072a7] transition-colors duration-300">{talent.name}</h3>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">{handle}</p>
          {showAddress && (
            <>
              <p className="text-slate-400 text-xs mt-1 truncate" title={talent.address || 'No address'}>
                {talent.address || <span className="italic text-slate-300">No address on file</span>}
              </p>
              <p className="text-slate-400 text-xs mt-0.5 truncate" title={talent.phoneNumber || 'No phone'}>
                {talent.phoneNumber || <span className="italic text-slate-300">No phone on file</span>}
              </p>
            </>
          )}
          {showRate && (
            <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-semibold rounded ${getRateBadgeStyles(talent.rate)}`}>
              {talent.rate || 'No Rate'}
            </span>
          )}
        </div>

        {/* Social Pills */}
        <div className="flex gap-1.5 mb-3">
          {talent.stats.slice(0, 3).map((stat, idx) => {
            const pill = (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.05, backgroundColor: "#f1f5f9" }}
                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1.5 flex items-center gap-1 flex-1 min-w-0 cursor-pointer"
              >
                <span className="text-slate-600">{getIcon(stat.platform)}</span>
                <span className="text-[11px] font-bold text-slate-900">{formatFollowerDisplay(stat.rawFollowerCount, stat.followerCount)}</span>
              </motion.div>
            );

            return stat.link ? (
              <a key={idx} href={stat.link} target="_blank" rel="noopener noreferrer"
                 onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0">
                {pill}
              </a>
            ) : pill;
          })}
        </div>

        {/* Metrics Grid */}
        <div className="mt-auto pt-3 border-t border-slate-100 group-hover:border-slate-200 transition-colors">
           {/* Total Reach */}
           <motion.div whileHover={{ scale: 1.05 }} className="cursor-default">
              <div className="text-[9px] text-slate-500 font-bold uppercase mb-0.5 tracking-wider">Total Reach</div>
              <div className="text-slate-900 font-black text-sm">{formatNumber(calculatedTotalReach)}</div>
              <div className="text-[9px] text-slate-400 font-medium">FOLLOWERS</div>
           </motion.div>
        </div>

        {/* Internal Notes - Admin Only */}
        {showNotes && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Internal Notes</div>
              {onNotesChange && !isEditingNotes && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotesValue(talent.notes || '');
                    setIsEditingNotes(true);
                  }}
                  className="text-[9px] text-[#5072a7] hover:text-[#3d5a87] font-semibold"
                >
                  {talent.notes ? 'Edit' : 'Add Note'}
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="w-full text-xs text-slate-600 leading-relaxed border border-slate-200 rounded-md p-2 resize-none focus:outline-none focus:border-[#5072a7] focus:ring-1 focus:ring-[#5072a7]/20"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2 mt-1.5 justify-end">
                  <button
                    onClick={() => setIsEditingNotes(false)}
                    className="px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (onNotesChange) {
                        onNotesChange(talent.id, notesValue);
                      }
                      setIsEditingNotes(false);
                    }}
                    className="px-2 py-1 text-[10px] font-semibold text-white bg-[#5072a7] hover:bg-[#3d5a87] rounded"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              talent.notes ? (
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{talent.notes}</p>
              ) : (
                <p className="text-xs text-slate-400 italic">No notes</p>
              )
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Creator</h3>
            <p className="text-slate-600 mb-6">Are you sure you want to delete {talent.name}? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDelete) {
                    onDelete();
                  }
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TalentCard;
