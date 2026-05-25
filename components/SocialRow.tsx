
import React from 'react';
import { Link2 } from 'lucide-react';
import { InstagramIcon, YouTubeIcon, FacebookIcon, TikTokIcon } from './SocialIcons';
import { SocialStat } from '../types';

interface SocialRowProps {
  stat: SocialStat;
}

const getIcon = (platform: string) => {
  const cn = "w-4 h-4";
  switch (platform.toLowerCase()) {
    case 'instagram': return <InstagramIcon className={cn} />;
    case 'youtube': return <YouTubeIcon className={cn} />;
    case 'facebook': return <FacebookIcon className={cn} />;
    case 'tiktok': return <TikTokIcon className={cn} />;
    default: return <Link2 className={cn} />;
  }
};

const SocialRow: React.FC<SocialRowProps> = ({ stat }) => {
  return (
    <div className="flex items-center justify-between group/row">
      <a 
        href={stat.link} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
      >
        <span className="text-slate-400 group-hover/row:text-slate-900 transition-colors">
          {getIcon(stat.platform)}
        </span>
        <span className="text-sm font-medium">{stat.platform}</span>
      </a>
      <span className="text-sm font-semibold text-slate-900 tabular-nums">
        {stat.followerCount}
      </span>
    </div>
  );
};

export default SocialRow;
