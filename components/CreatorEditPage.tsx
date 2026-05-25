import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Upload, Camera, X } from 'lucide-react';
import { Talent, CreatorEditFormState } from '../types';
import { fetchAirtableData, updateAirtableRecord, uploadAttachment } from '../lib/airtable';
import { useFieldOptions } from '../contexts/FieldOptionsContext';
import { SocialLinkInput } from '../lib/socialLinks';

// Convert Talent to flat form state
function talentToFormState(talent: Talent): CreatorEditFormState {
  const findStat = (platform: string) =>
    talent.stats.find((s) => s.platform.toLowerCase() === platform.toLowerCase());

  const instagram = findStat('Instagram');
  const tiktok = findStat('TikTok');
  const youtube = findStat('YouTube');
  const facebook = findStat('Facebook');

  return {
    name: talent.name,
    email: talent.email || '',
    phoneNumber: talent.phoneNumber || '',
    address: talent.address || '',
    age: talent.age,
    gender: talent.gender,
    location: talent.location,
    bio: talent.bio,
    audienceAge: talent.audienceAge,
    exclusives: talent.exclusives || '',
    tags: talent.tags,
    brands: talent.brands,
    rate: talent.rate || '',
    demographicsMale: talent.demographics.male,
    demographicsFemale: talent.demographics.female,
    instagramFollowers: instagram?.rawFollowerCount ?? 0,
    instagramLink: instagram?.link || '',
    tiktokFollowers: tiktok?.rawFollowerCount ?? 0,
    tiktokLink: tiktok?.link || '',
    youtubeFollowers: youtube?.rawFollowerCount ?? 0,
    youtubeLink: youtube?.link || '',
    facebookFollowers: facebook?.rawFollowerCount ?? 0,
    facebookLink: facebook?.link || '',
    notes: talent.notes || '',
  };
}

const CreatorEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories, locations, audienceAges, genders, rates, isLoading: optionsLoading } = useFieldOptions();

  const [talent, setTalent] = useState<Talent | null>(null);
  const [formState, setFormState] = useState<CreatorEditFormState | null>(null);
  const initialValues = useRef<CreatorEditFormState | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newProfilePhoto, setNewProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [newAnalyticsPhotos, setNewAnalyticsPhotos] = useState<File[]>([]);
  const [analyticsPreview, setAnalyticsPreview] = useState<string[]>([]);

  // Load talent data
  useEffect(() => {
    async function loadTalent() {
      setIsLoading(true);
      try {
        const data = await fetchAirtableData();
        const found = data.find((t) => t.id === id);
        if (found) {
          setTalent(found);
          const formData = talentToFormState(found);
          setFormState(formData);
          initialValues.current = JSON.parse(JSON.stringify(formData));
        } else {
          setError('Creator not found');
        }
      } catch (err) {
        setError('Failed to load creator data');
      } finally {
        setIsLoading(false);
      }
    }
    loadTalent();
  }, [id]);

  // Get only changed fields
  const getChangedFields = (): Partial<CreatorEditFormState> => {
    if (!formState || !initialValues.current) return {};

    const changes: Partial<CreatorEditFormState> = {};

    for (const key of Object.keys(formState) as (keyof CreatorEditFormState)[]) {
      const current = formState[key];
      const initial = initialValues.current[key];

      if (JSON.stringify(current) !== JSON.stringify(initial)) {
        (changes as Record<string, unknown>)[key] = current;
      }
    }

    return changes;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!talent || !formState) return;

    const changed = getChangedFields();

    if (Object.keys(changed).length === 0) {
      navigate('/admin');
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await updateAirtableRecord(talent.id, changed, formState);

    if (!result.success) {
      setError(result.error || 'Failed to save changes');
      setIsSaving(false);
      return;
    }

    // Upload new photo if selected
    if (newProfilePhoto) {
      setIsUploading(true);
      const uploadResult = await uploadAttachment(talent.id, 'Profile Photo', newProfilePhoto);
      if (!uploadResult.success) {
        setError(`Changes saved but photo upload failed: ${uploadResult.error}`);
        setIsSaving(false);
        setIsUploading(false);
        return;
      }
    }

    // Upload analytics screenshots if selected
    if (newAnalyticsPhotos.length > 0) {
      setIsUploading(true);
      for (const file of newAnalyticsPhotos) {
        const uploadResult = await uploadAttachment(talent.id, 'Analytics', file);
        if (!uploadResult.success) {
          setError(`Changes saved but analytics upload failed: ${uploadResult.error}`);
          setIsSaving(false);
          setIsUploading(false);
          return;
        }
      }
    }

    setIsUploading(false);
    setIsSaving(false);
    navigate('/admin');
  };

  // Update form field
  const updateField = <K extends keyof CreatorEditFormState>(
    field: K,
    value: CreatorEditFormState[K]
  ) => {
    setFormState((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // Toggle tag
  const toggleTag = (tag: string) => {
    if (!formState) return;
    const newTags = formState.tags.includes(tag)
      ? formState.tags.filter((t) => t !== tag)
      : [...formState.tags, tag];
    updateField('tags', newTags);
  };

  // Photo handlers
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

    setNewProfilePhoto(file);
    setError(null);
  };

  const removeNewPhoto = () => {
    setNewProfilePhoto(null);
    setPhotoPreview(null);
  };

  // Analytics photo handlers
  const handleAnalyticsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach((file) => {
      if (!validTypes.includes(file.type)) {
        setError('Please select JPEG, PNG, or WebP images only');
        return;
      }
      if (file.size > maxSize) {
        setError('Each image must be less than 5MB');
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length === 0) return;

    // Generate previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        previews.push(e.target?.result as string);
        if (previews.length === validFiles.length) {
          setAnalyticsPreview((prev) => [...prev, ...previews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setNewAnalyticsPhotos((prev) => [...prev, ...validFiles]);
    setError(null);
  };

  const removeAnalyticsPhoto = (index: number) => {
    setNewAnalyticsPhotos((prev) => prev.filter((_, i) => i !== index));
    setAnalyticsPreview((prev) => prev.filter((_, i) => i !== index));
  };

  const inputClass =
    'w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#5072a7] focus:ring-2 focus:ring-[#5072a7]/20 outline-none transition-all bg-white';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
  const sectionClass = 'bg-white rounded-xl p-6 shadow-sm border border-slate-200';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5072a7]" />
      </div>
    );
  }

  if (error && !talent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => navigate('/admin')}
          className="px-4 py-2 bg-[#5072a7] text-white rounded-lg hover:bg-[#3d5a87] transition-colors"
        >
          Back to Admin
        </button>
      </div>
    );
  }

  if (!talent || !formState) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Edit Creator</h1>
              <p className="text-sm text-slate-500">{talent.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {talent.image && (
              <img
                src={talent.image}
                alt={talent.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
          </div>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Profile Photo */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Photo</h2>
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-slate-200">
              {photoPreview ? (
                <img src={photoPreview} alt="New photo" className="w-full h-full object-cover" />
              ) : talent.image ? (
                <img src={talent.image} alt={talent.name} className="w-full h-full object-cover" />
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
                {talent.image ? 'Replace Photo' : 'Choose Photo'}
              </label>
              {newProfilePhoto && (
                <button
                  type="button"
                  onClick={removeNewPhoto}
                  className="ml-3 inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium"
                >
                  <X className="w-4 h-4" />
                  Remove
                </button>
              )}
              <p className="mt-2 text-sm text-slate-500">JPEG, PNG, or WebP. Max 5MB.</p>
            </div>
          </div>
        </section>

        {/* Basic Info */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                type="tel"
                value={formState.phoneNumber}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input
                type="text"
                value={formState.address}
                onChange={(e) => updateField('address', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Age</label>
              <input
                type="number"
                value={formState.age ?? ''}
                onChange={(e) =>
                  updateField('age', e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                className={inputClass}
                min={13}
                max={120}
              />
            </div>
            <div>
              <label className={labelClass}>Gender</label>
              <select
                value={formState.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className={inputClass}
                disabled={optionsLoading}
              >
                <option value="">{optionsLoading ? 'Loading...' : 'Select Gender'}</option>
                {genders.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Rate
                <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Admin</span>
              </label>
              <select
                value={formState.rate}
                onChange={(e) => updateField('rate', e.target.value)}
                className={inputClass}
                disabled={optionsLoading}
              >
                <option value="">No Rate</option>
                {rates.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Location & Demographics */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Location & Demographics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Location</label>
              <select
                value={formState.location}
                onChange={(e) => updateField('location', e.target.value)}
                className={inputClass}
                disabled={optionsLoading}
              >
                <option value="">{optionsLoading ? 'Loading...' : 'Select Location'}</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Audience Age Range</label>
              <select
                value={formState.audienceAge}
                onChange={(e) => updateField('audienceAge', e.target.value)}
                className={inputClass}
                disabled={optionsLoading}
              >
                <option value="">{optionsLoading ? 'Loading...' : 'Select Age Range'}</option>
                {audienceAges.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Male Audience %</label>
              <input
                type="number"
                value={formState.demographicsMale}
                onChange={(e) => updateField('demographicsMale', parseInt(e.target.value, 10) || 0)}
                className={inputClass}
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className={labelClass}>Female Audience %</label>
              <input
                type="number"
                value={formState.demographicsFemale}
                onChange={(e) =>
                  updateField('demographicsFemale', parseInt(e.target.value, 10) || 0)
                }
                className={inputClass}
                min={0}
                max={100}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Exclusives</label>
              <input
                type="text"
                value={formState.exclusives}
                onChange={(e) => updateField('exclusives', e.target.value)}
                className={inputClass}
                placeholder="e.g., Brand exclusivity agreements"
              />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {optionsLoading ? (
              <span className="text-slate-500 text-sm">Loading categories...</span>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleTag(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formState.tags.includes(cat)
                      ? 'bg-[#5072a7] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))
            )}
          </div>
        </section>

        {/* Social Stats */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Social Media</h2>
          <div className="space-y-6">
            {/* Instagram */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Instagram Followers</label>
                <input
                  type="number"
                  value={formState.instagramFollowers || ''}
                  onChange={(e) => updateField('instagramFollowers', parseInt(e.target.value, 10) || 0)}
                  className={inputClass}
                  placeholder="e.g., 57400"
                  min={0}
                />
              </div>
              <div>
                <label className={labelClass}>Instagram Link</label>
                <SocialLinkInput
                  platform="instagram"
                  value={formState.instagramLink}
                  onChange={(url) => updateField('instagramLink', url)}
                  inputClass={inputClass}
                />
              </div>
            </div>

            {/* TikTok */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>TikTok Followers</label>
                <input
                  type="number"
                  value={formState.tiktokFollowers || ''}
                  onChange={(e) => updateField('tiktokFollowers', parseInt(e.target.value, 10) || 0)}
                  className={inputClass}
                  placeholder="e.g., 29500"
                  min={0}
                />
              </div>
              <div>
                <label className={labelClass}>TikTok Link</label>
                <SocialLinkInput
                  platform="tiktok"
                  value={formState.tiktokLink}
                  onChange={(url) => updateField('tiktokLink', url)}
                  inputClass={inputClass}
                />
              </div>
            </div>

            {/* YouTube */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>YouTube Subscribers</label>
                <input
                  type="number"
                  value={formState.youtubeFollowers || ''}
                  onChange={(e) => updateField('youtubeFollowers', parseInt(e.target.value, 10) || 0)}
                  className={inputClass}
                  placeholder="e.g., 8140"
                  min={0}
                />
              </div>
              <div>
                <label className={labelClass}>YouTube Link</label>
                <SocialLinkInput
                  platform="youtube"
                  value={formState.youtubeLink}
                  onChange={(url) => updateField('youtubeLink', url)}
                  inputClass={inputClass}
                  placeholder="yourchannel"
                />
              </div>
            </div>

            {/* Facebook */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Facebook Followers</label>
                <input
                  type="number"
                  value={formState.facebookFollowers || ''}
                  onChange={(e) => updateField('facebookFollowers', parseInt(e.target.value, 10) || 0)}
                  className={inputClass}
                  placeholder="e.g., 2600"
                  min={0}
                />
              </div>
              <div>
                <label className={labelClass}>Facebook Link</label>
                <SocialLinkInput
                  platform="facebook"
                  value={formState.facebookLink}
                  onChange={(url) => updateField('facebookLink', url)}
                  inputClass={inputClass}
                  placeholder="yourpage"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Bio */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Bio</h2>
          <textarea
            value={formState.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            className={`${inputClass} min-h-[120px] resize-y`}
            placeholder="Creator bio..."
          />
        </section>

        {/* Notes (Admin Only) */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
            Notes
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Admin</span>
          </h2>
          <p className="text-sm text-slate-500 mb-3">Internal notes — not visible to public or creators</p>
          <textarea
            value={formState.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className={`${inputClass} min-h-[100px] resize-y`}
            placeholder="Internal notes about this creator..."
          />
        </section>

        {/* Brands */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Favourite Brands</h2>
          <p className="text-sm text-slate-500 mb-2">Separate brands with commas</p>
          <input
            type="text"
            value={formState.brands.join(', ')}
            onChange={(e) =>
              updateField(
                'brands',
                e.target.value
                  .split(',')
                  .map((b) => b.trim())
                  .filter(Boolean)
              )
            }
            className={inputClass}
            placeholder="e.g., Gymshark, NOCCO, Real Good Foods"
          />
        </section>

        {/* Analytics Screenshots */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Analytics Screenshots</h2>
          <p className="text-sm text-slate-500 mb-4">
            Upload screenshots of statistics to show brands. These will appear in the creator profile.
          </p>

          {/* Existing screenshots from Airtable */}
          {talent.analytics && talent.analytics.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-600 mb-2">Current Screenshots:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {talent.analytics.map((url, i) => (
                  <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt={`Analytics ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New screenshots preview */}
          {analyticsPreview.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-600 mb-2">New Screenshots to Upload:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {analyticsPreview.map((preview, i) => (
                  <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 group">
                    <img src={preview} alt={`New analytics ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeAnalyticsPhoto(i)}
                      className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload button */}
          <div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAnalyticsChange}
              className="hidden"
              id="analytics-photos"
              multiple
            />
            <label
              htmlFor="analytics-photos"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors font-medium text-slate-700"
            >
              <Upload className="w-4 h-4" />
              Add Screenshots
            </label>
            <p className="mt-2 text-sm text-slate-500">JPEG, PNG, or WebP. Max 5MB each.</p>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="px-6 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || isUploading}
            className="px-6 py-3 bg-[#5072a7] text-white rounded-lg hover:bg-[#3d5a87] transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving || isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isUploading ? 'Uploading images...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatorEditPage;
