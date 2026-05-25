import Papa from 'papaparse';
import { CreatorEditFormState } from '../types';

// Types for CSV import
export interface CSVParseResult {
  valid: ParsedCreator[];
  invalid: InvalidRow[];
  totalRows: number;
  headers: string[];
}

export interface ParsedCreator {
  rowNumber: number;
  data: CreatorEditFormState;
  warnings: string[];
}

export interface InvalidRow {
  rowNumber: number;
  rawData: Record<string, string>;
  errors: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// CSV header to form field mapping
const CSV_TO_FORM_FIELD: Record<string, keyof CreatorEditFormState | 'tags' | 'brands'> = {
  'name': 'name',
  'email': 'email',
  'phone': 'phoneNumber',
  'address': 'address',
  'location': 'location',
  'age': 'age',
  'gender': 'gender',
  'bio': 'bio',
  'tags': 'tags',
  'exclusives': 'exclusives',
  'audience age': 'audienceAge',
  'demographics male %': 'demographicsMale',
  'demographics female %': 'demographicsFemale',
  'instagram followers': 'instagramFollowers',
  'instagram link': 'instagramLink',
  'tiktok followers': 'tiktokFollowers',
  'tiktok link': 'tiktokLink',
  'youtube followers': 'youtubeFollowers',
  'youtube link': 'youtubeLink',
  'facebook followers': 'facebookFollowers',
  'facebook link': 'facebookLink',
  'brands': 'brands',
};

// Template headers for download
const CSV_TEMPLATE_HEADERS = [
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
  'Instagram Followers',
  'Instagram Link',
  'TikTok Followers',
  'TikTok Link',
  'YouTube Followers',
  'YouTube Link',
  'Facebook Followers',
  'Facebook Link',
  'Brands',
];

// Example row for template
const CSV_TEMPLATE_EXAMPLE = [
  'John Smith',
  'john@email.com',
  '+1-555-0123',
  '123 Main St, Los Angeles, CA',
  'United States',
  '28',
  'Male',
  'Fitness content creator and personal trainer with a passion for helping others achieve their goals.',
  'Fitness, Lifestyle',
  '',
  '18-24',
  '65',
  '35',
  '57400',
  'https://instagram.com/johnsmith',
  '29500',
  'https://tiktok.com/@johnsmith',
  '8140',
  'https://youtube.com/@johnsmith',
  '2600',
  'https://facebook.com/johnsmith',
  'Gymshark, NOCCO, MyProtein',
];

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCSVTemplate(): void {
  const csvContent = [
    CSV_TEMPLATE_HEADERS.join(','),
    CSV_TEMPLATE_EXAMPLE.map(escapeCSVValue).join(','),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'creators-import-template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim();
}

function parseNumber(value: string | undefined): number {
  if (!value || value.trim() === '') return 0;
  const cleaned = value.replace(/,/g, '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

function parseCommaSeparated(value: string | undefined): string[] {
  if (!value || value.trim() === '') return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function validateCSVRow(row: Record<string, string>, rowIndex: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field: name
  const name = row['name'] || row['Name'] || '';
  if (!name.trim()) {
    errors.push('Name is required');
  }

  // Validate gender if provided
  const gender = row['gender'] || row['Gender'] || '';
  if (gender && !['Male', 'Female', 'male', 'female'].includes(gender)) {
    warnings.push(`Gender should be "Male" or "Female", got "${gender}"`);
  }

  // Validate age if provided
  const age = row['age'] || row['Age'] || '';
  if (age) {
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      warnings.push(`Invalid age: ${age}`);
    }
  }

  // Validate demographics percentages
  const malePercent = row['demographics male %'] || row['Demographics Male %'] || '';
  const femalePercent = row['demographics female %'] || row['Demographics Female %'] || '';
  if (malePercent) {
    const num = parseFloat(malePercent);
    if (isNaN(num) || num < 0 || num > 100) {
      warnings.push(`Male demographic should be 0-100, got "${malePercent}"`);
    }
  }
  if (femalePercent) {
    const num = parseFloat(femalePercent);
    if (isNaN(num) || num < 0 || num > 100) {
      warnings.push(`Female demographic should be 0-100, got "${femalePercent}"`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function csvRowToFormState(row: Record<string, string>): CreatorEditFormState {
  // Helper to get value by normalized header
  const getValue = (keys: string[]): string => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== '') return row[key];
      const normalized = Object.keys(row).find(k => normalizeHeader(k) === normalizeHeader(key));
      if (normalized && row[normalized] !== undefined && row[normalized] !== '') {
        return row[normalized];
      }
    }
    return '';
  };

  const genderRaw = getValue(['Gender', 'gender']);
  const gender: string =
    genderRaw.toLowerCase() === 'female' ? 'Female' : 'Male';

  const ageRaw = getValue(['Age', 'age']);
  const age = ageRaw ? parseInt(ageRaw, 10) : undefined;

  return {
    name: getValue(['Name', 'name']),
    email: getValue(['Email', 'email']),
    phoneNumber: getValue(['Phone', 'phone']),
    address: getValue(['Address', 'address']),
    age: age && !isNaN(age) ? age : undefined,
    gender,
    location: getValue(['Location', 'location']),
    bio: getValue(['Bio', 'bio']),
    audienceAge: getValue(['Audience Age', 'audience age']) || '18-24',
    exclusives: getValue(['Exclusives', 'exclusives']),
    tags: parseCommaSeparated(getValue(['Tags', 'tags'])),
    brands: parseCommaSeparated(getValue(['Brands', 'brands'])),
    rate: getValue(['Rate', 'rate']) || '',
    demographicsMale: parseNumber(getValue(['Demographics Male %', 'demographics male %'])) || 50,
    demographicsFemale: parseNumber(getValue(['Demographics Female %', 'demographics female %'])) || 50,
    instagramFollowers: parseNumber(getValue(['Instagram Followers', 'instagram followers'])),
    instagramLink: getValue(['Instagram Link', 'instagram link']),
    tiktokFollowers: parseNumber(getValue(['TikTok Followers', 'tiktok followers'])),
    tiktokLink: getValue(['TikTok Link', 'tiktok link']),
    youtubeFollowers: parseNumber(getValue(['YouTube Followers', 'youtube followers'])),
    youtubeLink: getValue(['YouTube Link', 'youtube link']),
    facebookFollowers: parseNumber(getValue(['Facebook Followers', 'facebook followers'])),
    facebookLink: getValue(['Facebook Link', 'facebook link']),
  };
}

export function parseCSVFile(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const valid: ParsedCreator[] = [];
        const invalid: InvalidRow[] = [];
        const headers = results.meta.fields || [];

        results.data.forEach((row, index) => {
          const rowData = row as Record<string, string>;
          const rowNumber = index + 2; // +2 because: 1-indexed + header row

          const validation = validateCSVRow(rowData, rowNumber);

          if (validation.isValid) {
            valid.push({
              rowNumber,
              data: csvRowToFormState(rowData),
              warnings: validation.warnings,
            });
          } else {
            invalid.push({
              rowNumber,
              rawData: rowData,
              errors: validation.errors,
            });
          }
        });

        resolve({
          valid,
          invalid,
          totalRows: results.data.length,
          headers,
        });
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}
