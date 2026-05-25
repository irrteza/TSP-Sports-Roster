export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'facebook';

export const SOCIAL_PREFIXES: Record<SocialPlatform, string> = {
  instagram: 'instagram.com/',
  tiktok: 'tiktok.com/@',
  youtube: 'youtube.com/@',
  facebook: 'facebook.com/',
};

export function extractUsername(url: string, platform: SocialPlatform): string {
  if (!url) return '';
  const prefix = SOCIAL_PREFIXES[platform];
  const cleaned = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  if (cleaned.startsWith(prefix)) return cleaned.slice(prefix.length);
  return cleaned;
}

export function buildUrl(input: string, platform: SocialPlatform): string {
  if (!input.trim()) return '';
  // Strip any existing URL prefix first (handles pasted full URLs)
  const username = extractUsername(input, platform);
  if (!username) return '';
  return `https://${SOCIAL_PREFIXES[platform]}${username}`;
}

// --- React component for prefixed social link inputs ---
import React from 'react';

interface SocialLinkInputProps {
  platform: SocialPlatform;
  value: string;
  onChange: (fullUrl: string) => void;
  inputClass: string;
  placeholder?: string;
}

export const SocialLinkInput: React.FC<SocialLinkInputProps> = ({
  platform,
  value,
  onChange,
  inputClass,
  placeholder = 'yourusername',
}) => (
  <div className="flex">
    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
      {SOCIAL_PREFIXES[platform]}
    </span>
    <input
      type="text"
      value={extractUsername(value, platform)}
      onChange={(e) => onChange(buildUrl(e.target.value, platform))}
      className={`${inputClass} rounded-l-none`}
      placeholder={placeholder}
    />
  </div>
);
