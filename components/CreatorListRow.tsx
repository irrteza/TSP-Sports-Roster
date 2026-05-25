import React, { useState } from 'react';
import { Talent } from '../types';
import { InstagramIcon, YouTubeIcon, FacebookIcon, TikTokIcon } from './SocialIcons';
import { Pencil, Trash2, Check, ArrowUpDown } from 'lucide-react';

interface CreatorListRowProps {
  talent: Talent;
  isSelected: boolean;
  onSelectionChange: (id: string) => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMovePosition: () => void;
}

const getIcon = (platform: string) => {
  const cn = "w-3 h-3";
  switch (platform.toLowerCase()) {
    case 'instagram': return <InstagramIcon className={cn} />;
    case 'youtube': return <YouTubeIcon className={cn} />;
    case 'facebook': return <FacebookIcon className={cn} />;
    case 'tiktok': return <TikTokIcon className={cn} />;
    default: return null;
  }
};

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

const CreatorListRow: React.FC<CreatorListRowProps> = ({
  talent,
  isSelected,
  onSelectionChange,
  onClick,
  onEdit,
  onDelete,
  onMovePosition
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handle = `@${talent.name.replace(/\s+/g, '').toLowerCase()}`;
  const topGender = talent.demographics.male > talent.demographics.female ? 'Male' : 'Female';
  const topGenderVal = Math.max(talent.demographics.male, talent.demographics.female);

  return (
    <>
      <div
        className={`grid grid-cols-[40px_60px_1fr_1fr_100px_70px_80px] md:grid-cols-[40px_70px_1fr_200px_100px_70px_100px] gap-3 md:gap-4 px-4 py-3 items-center border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
          isSelected ? 'bg-blue-50 border-l-4 border-l-[#5072a7]' : ''
        }`}
        onClick={onClick}
      >
        {/* Checkbox */}
        <div className="flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange(talent.id);
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-[#5072a7] border-[#5072a7]'
                : 'border-slate-300 hover:border-[#5072a7]'
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
        </div>

        {/* Thumbnail */}
        <div className="relative w-12 h-15 md:w-14 md:h-[70px] rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
          )}
          <img
            src={talent.image}
            alt={talent.name}
            className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
        </div>

        {/* Name & Handle */}
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 truncate text-sm">{talent.name}</div>
          <div className="text-xs text-slate-500 truncate">{handle}</div>
          <div className="text-xs text-slate-400 truncate md:hidden">
            {talent.location}
          </div>
        </div>

        {/* Social Platforms */}
        <div className="flex flex-wrap gap-1.5">
          {talent.stats.slice(0, 4).map((stat, idx) => (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 flex items-center gap-1"
            >
              <span className="text-slate-600">{getIcon(stat.platform)}</span>
              <span className="text-[10px] font-semibold text-slate-700">{stat.followerCount}</span>
            </div>
          ))}
        </div>

        {/* Total Reach */}
        <div className="text-center">
          <div className="font-bold text-slate-900 text-sm">{talent.totalReach}</div>
          <div className="text-[10px] text-slate-400 uppercase">reach</div>
        </div>

        {/* Rate */}
        <div className="text-center">
          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded ${getRateBadgeStyles(talent.rate)}`}>
            {talent.rate || '-'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMovePosition();
            }}
            className="p-2 hover:bg-[#5072a7]/10 rounded-lg transition-colors"
            title="Move to position"
          >
            <ArrowUpDown className="w-4 h-4 text-[#5072a7]" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
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
                  onDelete();
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
    </>
  );
};

export default CreatorListRow;
