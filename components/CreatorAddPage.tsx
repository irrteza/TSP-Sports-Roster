import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Upload, Camera, X } from 'lucide-react';
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

const CreatorAddPage: React.FC = () => {
  const navigate = useNavigate();
  const { categories, locations, audienceAges, genders, rates, isLoading: optionsLoading } = useFieldOptions();

  const [formState, setFormState] = useState<CreatorEditFormState>(DEFAULT_FORM_STATE);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image must be less than 5MB');
      return;
    }

    // Create preview
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formState.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Step 1: Create the record
      const createResult = await createAirtableRecord(formState);

      if (!createResult.success) {
        setError(createResult.error || 'Failed to create creator');
        setIsSaving(false);
        return;
      }

      // Step 2: Upload photo if provided
      if (profilePhoto && createResult.recordId) {
        setIsUploading(true);
        const uploadResult = await uploadAttachment(
          createResult.recordId,
          'Profile Photo',
          profilePhoto
        );

        if (!uploadResult.success) {
          // Record created but photo failed - show warning but still navigate
          setError(`Creator added but photo upload failed: ${uploadResult.error}`);
          setTimeout(() => navigate('/admin'), 2000);
          return;
        }
      }

      // Success - navigate to admin
      navigate('/admin');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  // Update form field
  const updateField = <K extends keyof CreatorEditFormState>(
    field: K,
    value: CreatorEditFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  // Toggle tag
  const toggleTag = (tag: string) => {
    const newTags = formState.tags.includes(tag)
      ? formState.tags.filter((t) => t !== tag)
      : [...formState.tags, tag];
    updateField('tags', newTags);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#5072a7] focus:ring-2 focus:ring-[#5072a7]/20 outline-none transition-all bg-white';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
  const sectionClass = 'bg-white rounded-xl p-6 shadow-sm border border-slate-200';

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
              <h1 className="text-xl font-bold text-slate-900">Add New Creator</h1>
              <p className="text-sm text-slate-500">Create a new influencer profile</p>
            </div>
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
            {/* Preview */}
            <div className="w-32 h-32 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-slate-200">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-slate-400" />
                </div>
              )}
            </div>

            {/* Upload Controls */}
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
              <p className="mt-2 text-sm text-slate-500">
                JPEG, PNG, or WebP. Max 5MB.
              </p>
            </div>
          </div>
        </section>

        {/* Basic Info */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={inputClass}
                required
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
                {isUploading ? 'Uploading photo...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Add Creator
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatorAddPage;
