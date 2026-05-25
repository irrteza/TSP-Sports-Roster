import { Talent } from '../types';

// Helper to escape CSV values properly
function escapeCSVValue(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const stringValue = String(value);
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Get stat for a specific platform
function getStatForPlatform(stats: Talent['stats'], platform: string): { followers: string; link: string } {
  const stat = stats.find(s => s.platform.toLowerCase() === platform.toLowerCase());
  return {
    followers: stat?.followerCount || '',
    link: stat?.link || ''
  };
}

export function exportCreatorsToCSV(creators: Talent[], filename: string = 'creators-export.csv'): void {
  // CSV Headers
  const headers = [
    'ID',
    'Name',
    'Email',
    'Phone',
    'Address',
    'Location',
    'Age',
    'Gender',
    'Bio',
    'Tags',
    'Exclusives',
    'Audience Age',
    'Demographics Male %',
    'Demographics Female %',
    'Top Countries',
    'Instagram Followers',
    'Instagram Link',
    'TikTok Followers',
    'TikTok Link',
    'YouTube Followers',
    'YouTube Link',
    'Facebook Followers',
    'Facebook Link',
    'Rate',
    'Tier',
    'Status',
    'Engagement Rate',
    'Avg Views',
    'Total Reach',
    'Brands'
  ];

  // Build CSV rows
  const rows = creators.map(creator => {
    const instagram = getStatForPlatform(creator.stats, 'Instagram');
    const tiktok = getStatForPlatform(creator.stats, 'TikTok');
    const youtube = getStatForPlatform(creator.stats, 'YouTube');
    const facebook = getStatForPlatform(creator.stats, 'Facebook');

    return [
      escapeCSVValue(creator.id),
      escapeCSVValue(creator.name),
      escapeCSVValue(creator.email),
      escapeCSVValue(creator.phoneNumber),
      escapeCSVValue(creator.address),
      escapeCSVValue(creator.location),
      escapeCSVValue(creator.age),
      escapeCSVValue(creator.gender),
      escapeCSVValue(creator.bio),
      escapeCSVValue(creator.tags?.join(', ')),
      escapeCSVValue(creator.exclusives),
      escapeCSVValue(creator.audienceAge),
      escapeCSVValue(creator.demographics?.male),
      escapeCSVValue(creator.demographics?.female),
      escapeCSVValue(creator.demographics?.topCountries?.join(', ')),
      escapeCSVValue(instagram.followers),
      escapeCSVValue(instagram.link),
      escapeCSVValue(tiktok.followers),
      escapeCSVValue(tiktok.link),
      escapeCSVValue(youtube.followers),
      escapeCSVValue(youtube.link),
      escapeCSVValue(facebook.followers),
      escapeCSVValue(facebook.link),
      escapeCSVValue(creator.rate),
      escapeCSVValue(creator.tier),
      escapeCSVValue(creator.status),
      escapeCSVValue(creator.engagementRate),
      escapeCSVValue(creator.avgViews),
      escapeCSVValue(creator.totalReach),
      escapeCSVValue(creator.brands?.join(', '))
    ].join(',');
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link and trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
