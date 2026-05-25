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
};

const InfluencerOnboarding: React.FC = () => {
  const { categories, locations, genders, isLoading: optionsLoading } = useFieldOptions();

  const [formState, setFormState] = useState<CreatorEditFormState>(DEFAULT_FORM_STATE);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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

  // Validation
  const validateForm = (): string | null => {
    if (!formState.name.trim()) return 'Name is required';
    if (!formState.email.trim()) return 'Email is required';
    if (!formState.phoneNumber.trim()) return 'Phone number is required';
    if (!formState.address.trim()) return 'Address is required';
    if (!formState.age) return 'Age is required';
    if (!formState.location) return 'Location is required';
    if (formState.tags.length === 0) return 'Please select at least one category';
    if (!formState.bio.trim()) return 'Bio is required';

    // At least one social platform with both followers and link
    const hasSocial =
      (formState.instagramFollowers > 0 && formState.instagramLink.trim()) ||
      (formState.tiktokFollowers > 0 && formState.tiktokLink.trim()) ||
      (formState.youtubeFollowers > 0 && formState.youtubeLink.trim()) ||
      (formState.facebookFollowers > 0 && formState.facebookLink.trim());

    if (!hasSocial) return 'Please add at least one social media platform with followers and link';

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
      const createResult = await createAirtableRecord(formState);

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
  const requiredStar = <span className="text-red-500 ml-1">*</span>;

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
            Thank you for joining our creator roster. We're excited to have you on board!
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
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex justify-center">
            <img src={logo} alt="TSP Talent" className="h-6 object-contain" />
          </div>
        </div>
      </header>

      {/* Page Title */}
      <div className="text-center py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Join Our Creator Roster</h1>
        <p className="text-slate-600 mt-2">Fill out the form below to apply as an influencer</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Profile Photo */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Profile Photo <span className="text-sm font-normal text-slate-500">(optional)</span>
          </h2>
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-slate-200">
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
                Full Name{requiredStar}
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={inputClass}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className={labelClass}>Email{requiredStar}</label>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputClass}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number{requiredStar}</label>
              <input
                type="tel"
                value={formState.phoneNumber}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
                className={inputClass}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <label className={labelClass}>Address{requiredStar}</label>
              <input
                type="text"
                value={formState.address}
                onChange={(e) => updateField('address', e.target.value)}
                className={inputClass}
                placeholder="Your address"
              />
            </div>
            <div>
              <label className={labelClass}>Age{requiredStar}</label>
              <input
                type="number"
                value={formState.age ?? ''}
                onChange={(e) =>
                  updateField('age', e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                className={inputClass}
                min={13}
                max={120}
                placeholder="Your age"
              />
            </div>
            <div>
              <label className={labelClass}>Gender{requiredStar}</label>
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
          </div>
        </section>

        {/* Location */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Location</h2>
          <div>
            <label className={labelClass}>Location{requiredStar}</label>
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
        </section>

        {/* Categories */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Categories{requiredStar}
          </h2>
          <p className="text-sm text-slate-500 mb-4">Select at least one category that best describes your content</p>
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
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Social Media{requiredStar}
          </h2>
          <p className="text-sm text-slate-500 mb-4">Add at least one platform with your follower count and profile link</p>
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
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Bio{requiredStar}</h2>
          <textarea
            value={formState.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            className={`${inputClass} min-h-[120px] resize-y`}
            placeholder="Tell us about yourself, your content style, and what makes you unique..."
          />
        </section>

        {/* Optional: Exclusives & Brands */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Additional Information</h2>
          <p className="text-sm text-slate-500 mb-4">These fields are optional</p>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Exclusives</label>
              <input
                type="text"
                value={formState.exclusives}
                onChange={(e) => updateField('exclusives', e.target.value)}
                className={inputClass}
                placeholder="e.g., Brand exclusivity agreements"
              />
            </div>
            <div>
              <label className={labelClass}>Favourite Brands</label>
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
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-center pt-4 pb-8">
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
