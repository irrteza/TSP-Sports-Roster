import { Talent, SocialStat, CreatorEditFormState, PlatformMetrics } from '../types';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

// New creators get this position so they appear at the bottom of the roster
const NEW_CREATOR_DEFAULT_POSITION = 999999;

interface AirtableAttachment {
  url: string;
  filename: string;
  thumbnails?: {
    small?: { url: string };
    large?: { url: string };
    full?: { url: string };
  };
}

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

function formatFollowerCount(value: unknown): string {
  if (typeof value === 'number') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  }
  return String(value || '0');
}

// Helper to safely get a number field
function getNumberField(fields: Record<string, unknown>, fieldName: string): number | undefined {
  const value = fields[fieldName];
  return typeof value === 'number' ? value : undefined;
}

function parseSocialStats(fields: Record<string, unknown>): SocialStat[] {
  const stats: SocialStat[] = [];

  // Instagram
  const hasInstagram = fields['Instagram Followers'] || fields['Instagram'] || fields['Instagram Followers (Scraped)'];
  if (hasInstagram) {
    const scrapedFollowers = getNumberField(fields, 'Instagram Followers (Scraped)');
    const manualFollowers = getNumberField(fields, 'Instagram Followers') ?? 0;
    // Prefer scraped followers, fall back to manual
    const effectiveFollowers = scrapedFollowers ?? manualFollowers;

    const metrics: PlatformMetrics = {
      avgLikes: getNumberField(fields, 'Instagram Avg Likes'),
      avgComments: getNumberField(fields, 'Instagram Avg Comments'),
      avgViews: getNumberField(fields, 'Instagram Avg Views'),
      scrapedFollowers,
      manualFollowers,
    };

    stats.push({
      platform: 'Instagram',
      followerCount: formatFollowerCount(effectiveFollowers),
      rawFollowerCount: effectiveFollowers,
      link: String(fields['Instagram'] || ''),
      metrics,
    });
  }

  // TikTok
  const hasTikTok = fields['Tiktok Followers'] || fields['Tiktok'] || fields['TikTok Followers (Scraped)'];
  if (hasTikTok) {
    const scrapedFollowers = getNumberField(fields, 'TikTok Followers (Scraped)');
    const manualFollowers = getNumberField(fields, 'Tiktok Followers') ?? 0;
    const effectiveFollowers = scrapedFollowers ?? manualFollowers;

    const metrics: PlatformMetrics = {
      avgLikes: getNumberField(fields, 'TikTok Avg Likes'),
      avgComments: getNumberField(fields, 'TikTok Avg Comments'),
      avgViews: getNumberField(fields, 'TikTok Avg Views'),
      avgShares: getNumberField(fields, 'TikTok Avg Shares'),
      avgSaves: getNumberField(fields, 'TikTok Avg Saves'),
      totalLikes: getNumberField(fields, 'TikTok Total Likes'),
      totalVideos: getNumberField(fields, 'TikTok Total Videos'),
      scrapedFollowers,
      manualFollowers,
    };

    stats.push({
      platform: 'TikTok',
      followerCount: formatFollowerCount(effectiveFollowers),
      rawFollowerCount: effectiveFollowers,
      link: String(fields['Tiktok'] || ''),
      metrics,
    });
  }

  // YouTube
  const hasYouTube = fields['Youtube Followers'] || fields['Youtube'] || fields['YouTube Subscribers'];
  if (hasYouTube) {
    const scrapedFollowers = getNumberField(fields, 'YouTube Subscribers');
    const manualFollowers = getNumberField(fields, 'Youtube Followers') ?? 0;
    const effectiveFollowers = scrapedFollowers ?? manualFollowers;

    const metrics: PlatformMetrics = {
      avgLikes: getNumberField(fields, 'YouTube Avg Likes'),
      avgComments: getNumberField(fields, 'YouTube Avg Comments'),
      avgViews: getNumberField(fields, 'YouTube Avg Views'),
      subscribers: scrapedFollowers,
      totalViews: getNumberField(fields, 'YouTube Total Views'),
      totalVideos: getNumberField(fields, 'YouTube Total Videos'),
      scrapedFollowers,
      manualFollowers,
    };

    stats.push({
      platform: 'YouTube',
      followerCount: formatFollowerCount(effectiveFollowers),
      rawFollowerCount: effectiveFollowers,
      link: String(fields['Youtube'] || ''),
      metrics,
    });
  }

  // Facebook (no scraped metrics, keep as-is)
  if (fields['Facebook Followers'] || fields['Facebook']) {
    const raw = typeof fields['Facebook Followers'] === 'number'
      ? (fields['Facebook Followers'] as number) : 0;
    stats.push({
      platform: 'Facebook',
      followerCount: formatFollowerCount(fields['Facebook Followers']),
      rawFollowerCount: raw,
      link: String(fields['Facebook'] || ''),
    });
  }

  return stats;
}

function getImageUrl(fields: Record<string, unknown>): string {
  const photos = fields['Profile Photo'] as AirtableAttachment[] | undefined;
  if (photos && photos.length > 0) {
    // Prefer large thumbnail, then full, then original URL
    return photos[0].thumbnails?.large?.url ||
           photos[0].thumbnails?.full?.url ||
           photos[0].url || '';
  }
  return '';
}

function getAnalyticsUrls(fields: Record<string, unknown>): string[] {
  const analytics = fields['Analytics'] as AirtableAttachment[] | undefined;
  if (!analytics || analytics.length === 0) return [];
  return analytics.map(a =>
    a.thumbnails?.large?.url || a.thumbnails?.full?.url || a.url
  ).filter((url): url is string => Boolean(url));
}

function parseCategories(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return [value];
  return [];
}

function parseBrands(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function mapAirtableToTalent(record: AirtableRecord): Talent {
  const f = record.fields;

  // Parse percentage fields (stored as 0-1 decimals)
  const malePct = typeof f['% Male Demographic'] === 'number'
    ? Math.round(f['% Male Demographic'] as number * 100)
    : 50;
  const femalePct = typeof f['% Female Demographic'] === 'number'
    ? Math.round(f['% Female Demographic'] as number * 100)
    : 50;

  return {
    id: record.id,
    name: String(f['Full Name'] || ''),
    image: getImageUrl(f),
    tags: parseCategories(f['Category']),
    location: String(f['Location'] || ''),
    address: String(f['Address'] || ''),
    phoneNumber: String(f['Phone Number'] || ''),
    email: String(f['Email'] || ''),
    age: typeof f['Age'] === 'number' ? f['Age'] : undefined,
    exclusives: String(f['Exclusives'] || ''),
    gender: String(f['Gender'] || 'Male'),
    audienceAge: String(f['Largest Age Demographic'] || '18-24'),
    stats: parseSocialStats(f),
    position: typeof f['Position'] === 'number' ? f['Position'] : undefined,
    createdOn: record.createdTime,
    rate: f['Rate'] as string | undefined,
    tier: f['Tier'] as string | undefined,
    status: f['Status'] as string | undefined,
    allStar: f['All Star'] === true,
    bio: String(f['Bio'] || ''),
    engagementRate: '0%', // Not in the current Airtable schema
    avgViews: '0', // Not in the current Airtable schema
    totalReach: formatFollowerCount(f['Total Reach'] || 0),
    brands: parseBrands(f['Favourite Brands']),
    demographics: {
      male: malePct,
      female: femalePct,
      topCountries: [String(f['Location'] || '')].filter(Boolean),
    },
    analytics: getAnalyticsUrls(f),
    notes: String(f['Notes'] || ''),
  };
}

// Mapping from form field names to Airtable field names
const TALENT_TO_AIRTABLE: Record<string, string> = {
  name: 'Full Name',
  location: 'Location',
  address: 'Address',
  phoneNumber: 'Phone Number',
  email: 'Email',
  age: 'Age',
  gender: 'Gender',
  audienceAge: 'Largest Age Demographic',
  bio: 'Bio',
  exclusives: 'Exclusives',
  tags: 'Category',
  brands: 'Favourite Brands',
  totalReach: 'Total Reach',
  demographicsMale: '% Male Demographic',
  demographicsFemale: '% Female Demographic',
  instagramFollowers: 'Instagram Followers',
  instagramLink: 'Instagram',
  tiktokFollowers: 'Tiktok Followers',
  tiktokLink: 'Tiktok',
  youtubeFollowers: 'Youtube Followers',
  youtubeLink: 'Youtube',
  facebookFollowers: 'Facebook Followers',
  facebookLink: 'Facebook',
  position: 'Position',
  rate: 'Rate',
  notes: 'Notes',
  allStar: 'All Star',
};

// Parse formatted follower count back to number (e.g., "2.1M" -> 2100000)
function parseFollowerCount(value: string): number {
  if (!value || value === '0') return 0;
  const cleaned = value.replace(/,/g, '').trim();
  const match = cleaned.match(/^([\d.]+)\s*([KMB])?$/i);
  if (!match) return parseInt(cleaned, 10) || 0;

  const num = parseFloat(match[1]);
  const suffix = (match[2] || '').toUpperCase();

  switch (suffix) {
    case 'K': return Math.round(num * 1000);
    case 'M': return Math.round(num * 1000000);
    case 'B': return Math.round(num * 1000000000);
    default: return Math.round(num);
  }
}

// Transform form values to Airtable format
function transformValueForAirtable(fieldName: string, value: unknown): unknown {
  // Demographics percentages: UI is 0-100, Airtable is 0-1
  if (fieldName === 'demographicsMale' || fieldName === 'demographicsFemale') {
    return typeof value === 'number' ? value / 100 : 0;
  }

  // Follower counts: now stored as numbers in form state, pass through directly
  if (fieldName.endsWith('Followers')) {
    return typeof value === 'number' ? value : 0;
  }

  // Brands: join array with newlines
  if (fieldName === 'brands' && Array.isArray(value)) {
    return value.join('\n');
  }

  // Tags/categories: keep as array
  if (fieldName === 'tags' && Array.isArray(value)) {
    return value;
  }

  return value;
}

export async function updateAirtableRecord(
  recordId: string,
  changedFields: Record<string, unknown>,
  fullFormState?: CreatorEditFormState
): Promise<{ success: boolean; error?: string }> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
    return { success: false, error: 'Airtable credentials not configured' };
  }

  // Convert form field names to Airtable field names and transform values
  const airtableFields: Record<string, unknown> = {};

  for (const [formField, value] of Object.entries(changedFields)) {
    const airtableField = TALENT_TO_AIRTABLE[formField];
    if (airtableField) {
      airtableFields[airtableField] = transformValueForAirtable(formField, value);
    }
  }

  if (Object.keys(airtableFields).length === 0) {
    return { success: true }; // Nothing to update
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${recordId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: airtableFields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable update error:', response.status, errorText);
      return { success: false, error: `Failed to update: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating Airtable:', error);
    return { success: false, error: 'Network error while updating' };
  }
}

export async function createAirtableRecord(
  formState: CreatorEditFormState
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
    return { success: false, error: 'Airtable credentials not configured' };
  }

  // Convert form state to Airtable fields
  const airtableFields: Record<string, unknown> = {};

  for (const [formField, value] of Object.entries(formState)) {
    const airtableField = TALENT_TO_AIRTABLE[formField];
    if (airtableField && value !== undefined && value !== '' &&
        !(Array.isArray(value) && value.length === 0)) {
      airtableFields[airtableField] = transformValueForAirtable(formField, value);
    }
  }

  airtableFields['Position'] = NEW_CREATOR_DEFAULT_POSITION;

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: airtableFields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable create error:', response.status, errorText);
      return { success: false, error: `Failed to create: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, recordId: data.id };
  } catch (error) {
    console.error('Error creating Airtable record:', error);
    return { success: false, error: 'Network error while creating record' };
  }
}

// Batch create records (Airtable supports up to 10 per request)
export interface BatchCreateResult {
  success: boolean;
  results: Array<{
    index: number;
    success: boolean;
    recordId?: string;
    error?: string;
  }>;
}

export async function createAirtableRecordsBatch(
  formStates: CreatorEditFormState[]
): Promise<BatchCreateResult> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
    return {
      success: false,
      results: formStates.map((_, index) => ({
        index,
        success: false,
        error: 'Airtable credentials not configured',
      })),
    };
  }

  // Convert all form states to Airtable records format
  const records = formStates.map((formState) => {
    const airtableFields: Record<string, unknown> = {};

    for (const [formField, value] of Object.entries(formState)) {
      const airtableField = TALENT_TO_AIRTABLE[formField];
      if (airtableField && value !== undefined && value !== '' &&
          !(Array.isArray(value) && value.length === 0)) {
        airtableFields[airtableField] = transformValueForAirtable(formField, value);
      }
    }

    return { fields: airtableFields };
  });

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable batch create error:', response.status, errorText);

      // All records failed
      return {
        success: false,
        results: formStates.map((_, index) => ({
          index,
          success: false,
          error: `Failed to create: ${response.status}`,
        })),
      };
    }

    const data = await response.json();
    const createdRecords = data.records || [];

    // Map results back to input indices
    const results = formStates.map((_, index) => {
      const created = createdRecords[index];
      if (created && created.id) {
        return { index, success: true, recordId: created.id };
      }
      return { index, success: false, error: 'Record not returned from API' };
    });

    return {
      success: results.every(r => r.success),
      results,
    };
  } catch (error) {
    console.error('Error batch creating Airtable records:', error);
    return {
      success: false,
      results: formStates.map((_, index) => ({
        index,
        success: false,
        error: 'Network error while creating records',
      })),
    };
  }
}

// Field ID mapping for attachment fields (from Airtable schema)
const ATTACHMENT_FIELD_IDS: Record<string, string> = {
  'Profile Photo': 'fldYoEPVRMWz6ECbT',
  'Analytics': 'fldzpfmG48ChK8xsH',
};

// Convert file to base64 string
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

export async function uploadAttachment(
  recordId: string,
  fieldName: string,
  file: File
): Promise<{ success: boolean; error?: string }> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return { success: false, error: 'Airtable credentials not configured' };
  }

  // Get field ID from mapping
  const fieldId = ATTACHMENT_FIELD_IDS[fieldName];
  if (!fieldId) {
    return { success: false, error: `Unknown attachment field: ${fieldName}` };
  }

  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);

    // Content API format: baseId/recordId/fieldId (no table ID)
    const url = `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/${fieldId}/uploadAttachment`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentType: file.type,
        file: base64,
        filename: file.name,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable upload error:', response.status, errorText);
      return { success: false, error: `Failed to upload: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return { success: false, error: 'Network error while uploading' };
  }
}

export async function deleteAirtableRecord(
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
    return { success: false, error: 'Airtable credentials not configured' };
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${recordId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable delete error:', response.status, errorText);
      return { success: false, error: `Failed to delete: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting Airtable record:', error);
    return { success: false, error: 'Network error while deleting' };
  }
}

// Types for field options from Airtable metadata
export interface FieldOptions {
  categories: string[];
  locations: string[];
  audienceAges: string[];
  genders: string[];
  rates: string[];
  tiers: string[];
  statuses: string[];
}

interface AirtableFieldChoice {
  id: string;
  name: string;
  color?: string;
}

interface AirtableMetadataField {
  id: string;
  name: string;
  type: string;
  options?: {
    choices?: AirtableFieldChoice[];
  };
}

interface AirtableMetadataTable {
  id: string;
  name: string;
  fields: AirtableMetadataField[];
}

interface AirtableMetadataResponse {
  tables: AirtableMetadataTable[];
}

export async function fetchAirtableFieldOptions(): Promise<FieldOptions> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
    throw new Error('Airtable credentials not configured');
  }

  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Airtable metadata API error:', response.status, errorText);
    throw new Error(`Airtable metadata API error: ${response.status}`);
  }

  const data: AirtableMetadataResponse = await response.json();

  // Find our table by ID
  const table = data.tables.find(t => t.id === AIRTABLE_TABLE_ID);
  if (!table) {
    console.error('Available tables:', data.tables.map(t => ({ id: t.id, name: t.name })));
    throw new Error(`Table ${AIRTABLE_TABLE_ID} not found in metadata response`);
  }

  // Log all fields for debugging
  console.log('Available fields:', table.fields.map(f => ({ name: f.name, type: f.type })));

  // Extract Category field options (multipleSelects type)
  const categoryField = table.fields.find(
    f => f.name === 'Category' && (f.type === 'multipleSelects' || f.type === 'singleSelect')
  );

  if (!categoryField) {
    console.warn('Category field not found. Looking for field named "Category" with type multipleSelects or singleSelect');
  }

  const categories = categoryField?.options?.choices?.map(c => c.name) || [];

  // Extract Location field options (singleSelect type)
  const locationField = table.fields.find(
    f => f.name === 'Location' && (f.type === 'singleSelect' || f.type === 'multipleSelects')
  );

  if (!locationField) {
    console.warn('Location field not found. Looking for field named "Location" with type singleSelect or multipleSelects');
  }

  const locations = locationField?.options?.choices?.map(c => c.name) || [];

  // Extract Largest Age Demographic field options
  const audienceAgeField = table.fields.find(
    f => f.name === 'Largest Age Demographic' && (f.type === 'singleSelect' || f.type === 'multipleSelects')
  );
  const audienceAges = audienceAgeField?.options?.choices?.map(c => c.name) || [];

  // Extract Gender field options
  const genderField = table.fields.find(
    f => f.name === 'Gender' && (f.type === 'singleSelect' || f.type === 'multipleSelects')
  );
  const genders = genderField?.options?.choices?.map(c => c.name) || [];

  // Extract Rate field options
  const rateField = table.fields.find(
    f => f.name === 'Rate' && (f.type === 'singleSelect' || f.type === 'multipleSelects')
  );
  const rates = rateField?.options?.choices?.map(c => c.name) || [];

  // Extract Tier field options
  const tierField = table.fields.find(
    f => f.name === 'Tier' && (f.type === 'singleSelect' || f.type === 'multipleSelects')
  );
  const tiers = tierField?.options?.choices?.map(c => c.name) || [];

  // Extract Status field options
  const statusField = table.fields.find(
    f => f.name === 'Status' && (f.type === 'singleSelect' || f.type === 'multipleSelects')
  );
  const statuses = statusField?.options?.choices?.map(c => c.name) || [];

  console.log(`Fetched field options: ${categories.length} categories, ${locations.length} locations, ${audienceAges.length} audience ages, ${genders.length} genders, ${rates.length} rates, ${tiers.length} tiers, ${statuses.length} statuses`);

  return { categories, locations, audienceAges, genders, rates, tiers, statuses };
}

// Batch update positions for multiple records (Airtable supports up to 10 per request)
export interface PositionUpdate {
  id: string;
  position: number;
}

export interface ReassignPositionResult {
  success: boolean;
  error?: string;
}

export async function reassignCreatorPosition(
  creatorId: string,
  targetPosition: number,
  allCreators: { id: string; position?: number }[]
): Promise<ReassignPositionResult> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
    return { success: false, error: 'Airtable credentials not configured' };
  }

  if (targetPosition < 1) {
    return { success: false, error: 'Position must be at least 1' };
  }

  // Take all manually-positioned creators (< 100000), sort by position,
  // remove the moved creator from the list, then re-insert at the target slot
  // and renumber everyone sequentially. This correctly handles moves both up
  // and down the list.
  const MANUAL_POSITION_THRESHOLD = 100000;
  const movedCreator = allCreators.find(c => c.id === creatorId);

  const others = allCreators
    .filter(c =>
      c.id !== creatorId &&
      c.position != null &&
      c.position < MANUAL_POSITION_THRESHOLD
    )
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  // Clamp target position so we never insert past the end of the list
  const insertIndex = Math.max(0, Math.min(targetPosition - 1, others.length));

  // Build the new ordered list with the moved creator at the target slot
  const newOrder: { id: string; position?: number }[] = [
    ...others.slice(0, insertIndex),
    movedCreator || { id: creatorId },
    ...others.slice(insertIndex),
  ];

  // Renumber everyone 1..N — but only emit a PATCH for creators whose
  // position actually changed, to minimise Airtable writes.
  const allUpdates: PositionUpdate[] = [];
  newOrder.forEach((c, idx) => {
    const newPos = idx + 1;
    if (c.position !== newPos) {
      allUpdates.push({ id: c.id, position: newPos });
    }
  });

  if (allUpdates.length === 0) {
    return { success: true };
  }

  try {
    // Process updates in batches of 10 (Airtable limit)
    const batchSize = 10;
    for (let i = 0; i < allUpdates.length; i += batchSize) {
      const batch = allUpdates.slice(i, i + batchSize);

      const records = batch.map(update => ({
        id: update.id,
        fields: {
          Position: update.position,
        },
      }));

      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Airtable batch update error:', response.status, errorText);
        return { success: false, error: `Failed to update positions: ${response.status}` };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error reassigning creator position:', error);
    return { success: false, error: 'Network error while updating positions' };
  }
}

export async function fetchAirtableData(): Promise<Talent[]> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
    console.error('Airtable credentials not configured');
    return [];
  }

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  try {
    do {
      const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);
      if (offset) url.searchParams.set('offset', offset);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Airtable API error:', response.status, errorText);
        throw new Error(`Airtable API error: ${response.status}`);
      }

      const data: AirtableResponse = await response.json();
      allRecords.push(...data.records);
      offset = data.offset;
    } while (offset);

    console.log(`Fetched ${allRecords.length} records from Airtable`);
    return allRecords.map(mapAirtableToTalent);
  } catch (error) {
    console.error('Error fetching from Airtable:', error);
    return [];
  }
}
