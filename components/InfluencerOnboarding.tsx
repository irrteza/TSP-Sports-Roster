import React, { useState } from 'react';
import { Loader2, Upload, Camera, X, CheckCircle } from 'lucide-react';
import logo from '../assets/logo.png';
import { CreatorEditFormState } from '../types';
import { createAirtableRecord, uploadAttachment } from '../lib/airtable';
import { useFieldOptions } from '../contexts/FieldOptionsContext';
import { SocialLinkInput } from '../lib/socialLinks';

const DEFAULT_FORM_STATE: CreatorEditFormState = {
  name: '',
  email: '',
  phoneNumber: '',
  address: '',
  age: undefined,
  gender: '',
  location: '',
  bio: '',
  audienceAge: '',
  exclusives: '',
  tags: [],
  brands: [],
  rate: '',
  demographicsMale: 50,
  demographicsFemale: 50,
  instagramFollowers: 0,
  instagramLink: '',
  tiktokFollowers: 0,
  tiktokLink: '',
  youtubeFollowers: 0,
  youtubeLink: '',
  facebookFollowers: 0,
  facebookLink: '',
  notes: '',
};

// Competition level options
const COMPETITION_LEVELS = [
  'High School/Youth',
  'NCAA D1',
  'NCAA D2–D3',
  'NAIA/JuCo',
  'Semi-Pro/Minor League',
  'Professional',
  'Olympic/National Team',
  'Retired',
];

// Brand categories the athlete will NOT represent
const BRAND_EXCLUSION_CATEGORIES = [
  'Alcohol',
  'Gambling',
  'Tobacco & Vaping',
  'Adult Content',
  'Political',
  'Fast Food',
  'Supplements',
];

// Content types comfortable creating
const CONTENT_TYPES = [
  'Social posts',
  'Short-form video',
  'Long-form video',
  'Photo shoots',
  'Live appearances',
  'Podcast/Interview',
  'Autographs & merch',
];

// NIL/NCAA restriction options
const NIL_RESTRICTION_OPTIONS = [
  'No restrictions',
  'Yes — NCAA/NIL rules apply',
  'Yes — league or team restrictions',
  'Not sure',
];

const InfluencerOnboarding: React.FC = () => {
  const { genders, isLoading: optionsLoading } = useFieldOptions();

  const [formState, setFormState] = useState<CreatorEditFormState>(DEFAULT_FORM_STATE);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Sports-specific fields (stored in notes on submit)
  const [preferredName, setPreferredName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [primarySport, setPrimarySport] = useState('');
  const [competitionLevel, setCompetitionLevel] = useState('');
  const [currentTeam, setCurrentTeam] = useState('');
  const [secondarySports, setSecondarySports] = useState('');
  const [careerHighlights, setCareerHighlights] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [hasBrandPartnerships, setHasBrandPartnerships] = useState<string>('');
  const [currentPartnerships, setCurrentPartnerships] = useState('');
  const [brandExclusions, setBrandExclusions] = useState<string[]>([]);
  const [brandExclusionOther, setBrandExclusionOther] = useState('');
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [hasAgent, setHasAgent] = useState<string>('');
  const [agentInfo, setAgentInfo] = useState('');
  const [nilRestriction, setNilRestriction] = useState('');
  const [nilDetails, setNilDetails] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a JPEG, PNG, or WebP image');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setProfilePhoto(file);
    setError(null);
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    setPhotoPreview(null);
  };

  // Build structured notes from all sports-specific fields
  const buildNotes = (): string => {
    const parts: string[] = [];

    if (preferredName.trim()) parts.push(`Preferred Name: ${preferredName.trim()}`);
    if (dateOfBirth.trim()) parts.push(`Date of Birth: ${dateOfBirth.trim()}`);
    if (primarySport.trim()) parts.push(`Primary Sport: ${primarySport.trim()}`);
    if (competitionLevel) parts.push(`Competition Level: ${competitionLevel}`);
    if (currentTeam.trim()) parts.push(`Current Team/Org: ${currentTeam.trim()}`);
    if (secondarySports.trim()) parts.push(`Secondary Sports: ${secondarySports.trim()}`);
    if (careerHighlights.trim()) parts.push(`Career Highlights: ${careerHighlights.trim()}`);
    if (twitterHandle.trim()) parts.push(`X (Twitter): ${twitterHandle.trim()}`);
    if (hasBrandPartnerships) parts.push(`Prior Brand Partnerships: ${hasBrandPartnerships}`);
    if (currentPartnerships.trim()) parts.push(`Current/Recent Partnerships: ${currentPartnerships.trim()}`);
    if (brandExclusions.length > 0) {
      const allExclusions = [...brandExclusions];
      if (brandExclusionOther.trim()) allExclusions.push(brandExclusionOther.trim());
      parts.push(`Won't Represent: ${allExclusions.join(', ')}`);
    }
    if (contentTypes.length > 0) parts.push(`Content Comfortable Creating: ${contentTypes.join(', ')}`);
    if (hasAgent) parts.push(`Has Agent/Manager: ${hasAgent}`);
    if (agentInfo.trim()) parts.push(`Agent/Manager Info: ${agentInfo.trim()}`);
    if (nilRestriction) parts.push(`NIL/NCAA Restrictions: ${nilRestriction}`);
    if (nilDetails.trim()) parts.push(`Restriction Details: ${nilDetails.trim()}`);

    return parts.join('\n');
  };

  // Validation
  const validateForm = (): string | null => {
    if (!formState.name.trim()) return 'Full legal name is required';
    if (!formState.email.trim()) return 'Email is required';
    if (!formState.phoneNumber.trim()) return 'Phone number is required';
    if (!formState.address.trim()) return 'City & State / Country is required';
    if (!primarySport.trim()) return 'Primary sport is required';
    if (!formState.bio.trim()) return 'Short bio is required';

    // At least one social platform
    const hasSocial =
      (formState.instagramFollowers > 0 && formState.instagramLink.trim()) ||
      (formState.tiktokFollowers > 0 && formState.tiktokLink.trim()) ||
      (formState.youtubeFollowers > 0 && formState.youtubeLink.trim()) ||
      (formState.facebookFollowers > 0 && formState.facebookLink.trim()) ||
      twitterHandle.trim();

    if (!hasSocial) return 'Please add at least one social media platform';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Build the submission with notes containing all sports-specific fields
      const submissionState: CreatorEditFormState = {
        ...formState,
        tags: primarySport.trim() ? [primarySport.trim()] : [],
        notes: buildNotes(),
      };

      const createResult = await createAirtableRecord(submissionState);

      if (!createResult.success) {
        setError(createResult.error || 'Failed to submit application');
        setIsSaving(false);
        return;
      }

      if (profilePhoto && createResult.recordId) {
        setIsUploading(true);
        const uploadResult = await uploadAttachment(
          createResult.recordId,
          'Profile Photo',
          profilePhoto
        );

        if (!uploadResult.success) {
          setError(`Application submitted but photo upload failed: ${uploadResult.error}`);
          setIsSaving(false);
          setIsUploading(false);
          return;
        }
      }

      setIsSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const updateField = <K extends keyof CreatorEditFormState>(
    field: K,
    value: CreatorEditFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (arr: string[], item: string): string[] => {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
  };

  const inputClass =
    'w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#5072a7] focus:ring-2 focus:ring-[#5072a7]/20 outline-none transition-all bg-white';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
  const sectionTitleClass = 'flex items-center gap-3 mb-6';
  const sectionNumberClass = 'text-sm font-bold text-[#b8860b] min-w-[28px]';
  const sectionNameClass = 'text-xs font-bold text-slate-800 uppercase tracking-widest';
  const sectionBarClass = 'w-1 h-6 bg-[#b8860b] rounded-full';
  const sectionClass = 'bg-white rounded-xl p-6 shadow-sm border border-slate-200';
  const requiredStar = <span className="text-red-500 ml-1">*</span>;
  const chipClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
      active
        ? 'bg-[#5072a7] text-white'
        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
    }`;

  // Success State
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Welcome to the Team!</h1>
          <p className="text-slate-600 mb-6">
            Thank you for submitting your athlete onboarding form. We're excited to have you on board!
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-[#5072a7] text-white rounded-lg hover:bg-[#3d5a87] transition-colors font-medium"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <img src={logo} alt="TSP" className="h-8 object-contain" />
            <div>
              <h1 className="text-white font-bold text-lg tracking-wide">ATHLETE ONBOARDING</h1>
              <p className="text-slate-400 text-xs tracking-wider uppercase">Talent Services & Partnerships</p>
            </div>
          </div>
        </div>
      </header>

      {/* Intro */}
      <div className="max-w-4xl mx-auto px-6 pt-6 pb-2">
        <p className="text-slate-600 text-sm">
          Please complete all fields below. This information will be used to match you with brand deals and campaigns.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 01 · BASIC INFORMATION */}
        <section className={sectionClass}>
          <div className={sectionTitleClass}>
            <div className={sectionBarClass} />
            <span className={sectionNumberClass}>01</span>
            <span className="text-slate-400 text-xs">·</span>
            <span className={sectionNameClass}>Basic Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>1. Full Legal Name{requiredStar}</label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={inputClass}
                placeholder="Your full legal name"
              />
            </div>
            <div>
              <label className={labelClass}>2. Preferred Name / Nickname</label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                className={inputClass}
                placeholder="(if different)"
              />
            </div>
            <div>
              <label className={labelClass}>3. Email Address{requiredStar}</label>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputClass}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className={labelClass}>4. Phone Number{requiredStar}</label>
              <input
                type="tel"
                value={formState.phoneNumber}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
                className={inputClass}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <label className={labelClass}>5. City & State / Country{requiredStar}</label>
              <input
                type="text"
                value={formState.address}
                onChange={(e) => updateField('address', e.target.value)}
                className={inputClass}
                placeholder="e.g., Miami, FL, USA"
              />
            </div>
            <div>
              <label className={labelClass}>6. Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass}>7. Gender</label>
            <div className="flex flex-wrap gap-2">
              {(optionsLoading ? [] : genders.length > 0 ? genders : ['Male', 'Female', 'Non-binary', 'Prefer not to say']).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => updateField('gender', formState.gender === g ? '' : g)}
                  className={chipClass(formState.gender === g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 02 · SPORT & CAREER */}
        <section className={sectionClass}>
          <div className={sectionTitleClass}>
            <div className={sectionBarClass} />
            <span className={sectionNumberClass}>02</span>
            <span className="text-slate-400 text-xs">·</span>
            <span className={sectionNameClass}>Sport & Career</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>8. Primary Sport{requiredStar}</label>
              <input
                type="text"
                value={primarySport}
                onChange={(e) => setPrimarySport(e.target.value)}
                className={inputClass}
                placeholder="e.g., Basketball, Soccer, Track & Field"
              />
            </div>

            <div>
              <label className={labelClass}>9. Competition Level</label>
              <div className="flex flex-wrap gap-2">
                {COMPETITION_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setCompetitionLevel(competitionLevel === level ? '' : level)}
                    className={chipClass(competitionLevel === level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>10. Current Team or Organization</label>
                <input
                  type="text"
                  value={currentTeam}
                  onChange={(e) => setCurrentTeam(e.target.value)}
                  className={inputClass}
                  placeholder='(or "Independent")'
                />
              </div>
              <div>
                <label className={labelClass}>11. Secondary Sport(s), if any</label>
                <input
                  type="text"
                  value={secondarySports}
                  onChange={(e) => setSecondarySports(e.target.value)}
                  className={inputClass}
                  placeholder="e.g., Boxing, Swimming"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>12. Top Career Highlights</label>
              <p className="text-xs text-slate-500 mb-1.5">Championships, records, draft history, awards — keep it to 3–5</p>
              <textarea
                value={careerHighlights}
                onChange={(e) => setCareerHighlights(e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="e.g., 2x State Champion, NCAA All-American..."
              />
            </div>
          </div>
        </section>

        {/* 03 · SOCIAL MEDIA */}
        <section className={sectionClass}>
          <div className={sectionTitleClass}>
            <div className={sectionBarClass} />
            <span className={sectionNumberClass}>03</span>
            <span className="text-slate-400 text-xs">·</span>
            <span className={sectionNameClass}>Social Media</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Fill in whichever platforms apply — at least one required. Include handle and follower/subscriber count.
          </p>

          <div className="space-y-5">
            {/* Instagram */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>13. Instagram — Handle + Followers</label>
                <SocialLinkInput
                  platform="instagram"
                  value={formState.instagramLink}
                  onChange={(url) => updateField('instagramLink', url)}
                  inputClass={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Followers</label>
                <input
                  type="number"
                  value={formState.instagramFollowers || ''}
                  onChange={(e) => updateField('instagramFollowers', parseInt(e.target.value, 10) || 0)}
                  className={inputClass}
                  placeholder="e.g., 57400"
                  min={0}
                />
              </div>
            </div>

            {/* TikTok */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>14. TikTok — Handle + Followers</label>
                <SocialLinkInput
                  platform="tiktok"
                  value={formState.tiktokLink}
                  onChange={(url) => updateField('tiktokLink', url)}
                  inputClass={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Followers</label>
                <input
                  type="number"
                  value={formState.tiktokFollowers || ''}
                  onChange={(e) => updateField('tiktokFollowers', parseInt(e.target.value, 10) || 0)}
                  className={inputClass}
                  placeholder="e.g., 29500"
                  min={0}
                />
              </div>
            </div>

            {/* YouTube */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>15. YouTube — Channel + Subscribers</label>
                <SocialLinkInput
                  platform="youtube"
                  value={formState.youtubeLink}
                  onChange={(url) => updateField('youtubeLink', url)}
                  inputClass={inputClass}
                  placeholder="yourchannel"
                />
              </div>
              <div>
                <label className={labelClass}>Subscribers</label>
                <input
                  type="number"
                  value={formState.youtubeFollowers || ''}
                  onChange={(e) => updateField('youtubeFollowers', parseInt(e.target.value, 10) || 0)}
                  className={inputClass}
                  placeholder="e.g., 8140"
                  min={0}
                />
              </div>
            </div>

            {/* X (Twitter) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>16. X (Twitter) — Handle + Followers</label>
                <input
                  type="text"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value)}
                  className={inputClass}
                  placeholder="@yourhandle"
                />
              </div>
              <div>
                <label className={labelClass}>Followers</label>
                <input
                  type="number"
                  value={formState.facebookFollowers || ''}
                  onChange={(e) => updateField('facebookFollowers', parseInt(e.target.value, 10) || 0)}
                  className={inputClass}
                  placeholder="e.g., 12000"
                  min={0}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 04 · BRAND & DEALS */}
        <section className={sectionClass}>
          <div className={sectionTitleClass}>
            <div className={sectionBarClass} />
            <span className={sectionNumberClass}>04</span>
            <span className="text-slate-400 text-xs">·</span>
            <span className={sectionNameClass}>Brand & Deals</span>
          </div>

          <div className="space-y-5">
            <div>
              <label className={labelClass}>17. Have you had prior brand partnerships?</label>
              <div className="flex gap-2">
                {['Yes', 'No'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setHasBrandPartnerships(hasBrandPartnerships === opt ? '' : opt)}
                    className={chipClass(hasBrandPartnerships === opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {hasBrandPartnerships === 'Yes' && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-1.5">If yes, list any current or recent ones below so we can flag conflicts.</p>
                  <textarea
                    value={currentPartnerships}
                    onChange={(e) => setCurrentPartnerships(e.target.value)}
                    className={`${inputClass} min-h-[60px] resize-y`}
                    placeholder="e.g., Nike, Gatorade..."
                  />
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>18. Active Exclusivity Agreements</label>
              <p className="text-xs text-slate-500 mb-1.5">List any brands you are currently exclusive with, if applicable.</p>
              <input
                type="text"
                value={formState.exclusives}
                onChange={(e) => updateField('exclusives', e.target.value)}
                className={inputClass}
                placeholder="e.g., Nike, Under Armour"
              />
            </div>

            <div>
              <label className={labelClass}>19. Brand Categories You Will NOT Represent</label>
              <p className="text-xs text-slate-500 mb-2">Circle or list all that apply</p>
              <div className="flex flex-wrap gap-2">
                {BRAND_EXCLUSION_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setBrandExclusions(toggleArrayItem(brandExclusions, cat))}
                    className={chipClass(brandExclusions.includes(cat))}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBrandExclusions(toggleArrayItem(brandExclusions, 'Other'))}
                  className={chipClass(brandExclusions.includes('Other'))}
                >
                  Other
                </button>
              </div>
              {brandExclusions.includes('Other') && (
                <input
                  type="text"
                  value={brandExclusionOther}
                  onChange={(e) => setBrandExclusionOther(e.target.value)}
                  className={`${inputClass} mt-2`}
                  placeholder="Specify other..."
                />
              )}
            </div>

            <div>
              <label className={labelClass}>20. Content You're Comfortable Creating for a Brand</label>
              <p className="text-xs text-slate-500 mb-2">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setContentTypes(toggleArrayItem(contentTypes, type))}
                    className={chipClass(contentTypes.includes(type))}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>21. Do you have an agent or manager for deal negotiations?</label>
              <div className="flex gap-2">
                {['Yes', 'No'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setHasAgent(hasAgent === opt ? '' : opt)}
                    className={chipClass(hasAgent === opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {hasAgent === 'Yes' && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-1.5">If yes, provide their name and email below.</p>
                  <input
                    type="text"
                    value={agentInfo}
                    onChange={(e) => setAgentInfo(e.target.value)}
                    className={inputClass}
                    placeholder="Name — email@example.com"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 05 · COMPLIANCE */}
        <section className={sectionClass}>
          <div className={sectionTitleClass}>
            <div className={sectionBarClass} />
            <span className={sectionNumberClass}>05</span>
            <span className="text-slate-400 text-xs">·</span>
            <span className={sectionNameClass}>Compliance</span>
          </div>

          <div>
            <label className={labelClass}>22. NIL, NCAA, or League/Team Restrictions</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {NIL_RESTRICTION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setNilRestriction(nilRestriction === opt ? '' : opt)}
                  className={chipClass(nilRestriction === opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            {nilRestriction && nilRestriction !== 'No restrictions' && (
              <div>
                <p className="text-xs text-slate-500 mb-1.5">If restrictions apply, briefly describe them below.</p>
                <textarea
                  value={nilDetails}
                  onChange={(e) => setNilDetails(e.target.value)}
                  className={`${inputClass} min-h-[60px] resize-y`}
                  placeholder="Describe your restrictions..."
                />
              </div>
            )}
          </div>
        </section>

        {/* 06 · BIO */}
        <section className={sectionClass}>
          <div className={sectionTitleClass}>
            <div className={sectionBarClass} />
            <span className={sectionNumberClass}>06</span>
            <span className="text-slate-400 text-xs">·</span>
            <span className={sectionNameClass}>Bio</span>
          </div>

          <div>
            <label className={labelClass}>23. Short Bio{requiredStar}</label>
            <p className="text-xs text-slate-500 mb-1.5">
              Tell us about yourself, your athletic career, and what makes you a strong partner for brands. (3–5 sentences)
            </p>
            <textarea
              value={formState.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              className={`${inputClass} min-h-[120px] resize-y`}
              placeholder="Tell us about yourself..."
            />
          </div>
        </section>

        {/* 07 · PHOTOS */}
        <section className={sectionClass}>
          <div className={sectionTitleClass}>
            <div className={sectionBarClass} />
            <span className={sectionNumberClass}>07</span>
            <span className="text-slate-400 text-xs">·</span>
            <span className={sectionNameClass}>Photos</span>
          </div>

          <div>
            <label className={labelClass}>24. Headshot / Profile Photo</label>
            <p className="text-xs text-slate-500 mb-3">JPEG or PNG format. Max 5MB per file.</p>
            <div className="flex items-start gap-6">
              <div className="w-28 h-28 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-slate-200">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="profile-photo"
                />
                <label
                  htmlFor="profile-photo"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors font-medium text-slate-700"
                >
                  <Upload className="w-4 h-4" />
                  Choose Photo
                </label>
                {profilePhoto && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="ml-3 inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-2 pb-2">
          TSP Talent Services & Partnerships · Athlete Roster Onboarding · Confidential
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center pt-2 pb-8">
          <button
            type="submit"
            disabled={isSaving || isUploading}
            className="px-8 py-4 bg-[#5072a7] text-white rounded-lg hover:bg-[#3d5a87] transition-colors font-semibold text-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isSaving || isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isUploading ? 'Uploading photo...' : 'Submitting...'}
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InfluencerOnboarding;
