import React, { useState, useEffect, useContext, useRef } from 'react';
import { Context } from '../store/appContext';
import '../../styles/VideoChannelProfile.css';

const VideoChannelProfile = () => {
  const { store } = useContext(Context);
  const [channelData, setChannelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Form data state
  const [formData, setFormData] = useState({
    channelName: '',
    description: '',
    customUrl: '',
    primaryCategory: '',
    secondaryCategory: '',
    country: '',
    language: 'en',
    isPublic: true,
    allowComments: true,
    allowLikes: true,
    ageRestricted: false,
    madeForKids: false,
    enableMonetization: false
  });

  // Media upload state
  const [mediaUploads, setMediaUploads] = useState({
    avatar: null,
    banner: null,
    watermark: null
  });

  // Branding state
  const [branding, setBranding] = useState({
    themeColor: '#667eea',
    accentColor: '#764ba2',
    customCSS: ''
  });

  // Social links state
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    twitter: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    discord: '',
    twitch: ''
  });

  // File input refs
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const watermarkInputRef = useRef(null);

  // Categories data
  const categories = [
    'Gaming', 'Music', 'Education', 'Entertainment', 'Technology',
    'Science', 'Sports', 'News', 'Comedy', 'Lifestyle', 'Travel',
    'Food', 'Health', 'Business', 'Arts', 'DIY', 'Automotive', 'Other'
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' }
  ];

  useEffect(() => {
    fetchChannelData();
  }, []);

  const fetchChannelData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.BACKEND_URL}/api/video/channel/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChannelData(data);
        populateFormData(data);
      } else if (response.status === 404) {
        // No channel exists, create one
        await createDefaultChannel();
      } else {
        throw new Error('Failed to fetch channel data');
      }
    } catch (error) {
      console.error('Error fetching channel data:', error);
      setError('Failed to load channel data');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultChannel = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.BACKEND_URL}/api/video/channel/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel_name: `${store.user?.username || 'My'} Channel`,
          description: 'Welcome to my video channel!'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChannelData(data.channel);
        populateFormData(data.channel);
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      setError('Failed to create channel');
    }
  };

  const populateFormData = (data) => {
    setFormData({
      channelName: data.channel_name || '',
      description: data.description || '',
      customUrl: data.custom_url || '',
      primaryCategory: data.primary_category || '',
      secondaryCategory: data.secondary_category || '',
      country: data.country || '',
      language: data.language || 'en',
      isPublic: data.is_public !== false,
      allowComments: data.allow_comments !== false,
      allowLikes: data.allow_likes !== false,
      ageRestricted: data.age_restricted || false,
      madeForKids: data.made_for_kids || false,
      enableMonetization: data.enable_monetization || false
    });

    setBranding({
      themeColor: data.theme_color || '#667eea',
      accentColor: data.accent_color || '#764ba2',
      customCSS: data.custom_css || ''
    });

    setSocialLinks({
      website: data.website_url || '',
      twitter: data.twitter_url || '',
      instagram: data.instagram_url || '',
      facebook: data.facebook_url || '',
      tiktok: data.tiktok_url || '',
      discord: data.discord_url || '',
      twitch: data.twitch_url || ''
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialLinkChange = (platform, value) => {
    setSocialLinks(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  const handleBrandingChange = (field, value) => {
    setBranding(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (type, file) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.BACKEND_URL}/api/upload/cloudinary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setMediaUploads(prev => ({
          ...prev,
          [type]: data.secure_url
        }));
        setSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Failed to upload ${type}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const updateData = {
        ...formData,
        ...branding,
        ...socialLinks,
        avatar_url: mediaUploads.avatar || channelData?.avatar_url,
        banner_url: mediaUploads.banner || channelData?.banner_url,
        watermark_url: mediaUploads.watermark || channelData?.watermark_url
      };

      const response = await fetch(`${process.env.BACKEND_URL}/api/video/channel/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedData = await response.json();
        setChannelData(updatedData);
        setSuccessMessage('Channel updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error('Failed to update channel');
      }
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="channel-profile-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading channel profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="channel-profile-container">
      {/* Header */}
      <div className="profile-header">
        <h1>📹 Channel Profile Settings</h1>
        <p>Customize your video channel appearance and settings</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="success-message">
          ✅ {successMessage}
        </div>
      )}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="profile-content">
        {/* Channel Information */}
        <section className="profile-section">
          <h2>📝 Channel Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Channel Name *</label>
              <input
                type="text"
                value={formData.channelName}
                onChange={(e) => handleInputChange('channelName', e.target.value)}
                placeholder="Enter channel name"
                maxLength="100"
              />
              <small>{formData.channelName.length}/100 characters</small>
            </div>

            <div className="form-group">
              <label>Custom URL</label>
              <div className="url-input-group">
                <span className="url-prefix">streampirex.com/c/</span>
                <input
                  type="text"
                  value={formData.customUrl}
                  onChange={(e) => handleInputChange('customUrl', e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  placeholder="channel-url"
                  maxLength="50"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Tell viewers about your channel..."
                maxLength="1000"
                rows="4"
              />
              <small>{formData.description.length}/1000 characters</small>
            </div>

            <div className="form-group">
              <label>Primary Category</label>
              <select
                value={formData.primaryCategory}
                onChange={(e) => handleInputChange('primaryCategory', e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Secondary Category</label>
              <select
                value={formData.secondaryCategory}
                onChange={(e) => handleInputChange('secondaryCategory', e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="United States"
              />
            </div>

            <div className="form-group">
              <label>Primary Language</label>
              <select
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Channel Branding */}
        <section className="profile-section">
          <h2>🎨 Channel Branding</h2>
          
          {/* Avatar Upload */}
          <div className="branding-grid">
            <div className="upload-section">
              <h3>Channel Avatar</h3>
              <div className="upload-area avatar-upload">
                {(mediaUploads.avatar || channelData?.avatar_url) ? (
                  <div className="current-image">
                    <img 
                      src={mediaUploads.avatar || channelData?.avatar_url} 
                      alt="Channel Avatar"
                      className="preview-avatar"
                    />
                    <button 
                      className="change-btn"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div 
                    className="upload-placeholder"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <span className="upload-icon">📷</span>
                    <p>Upload Avatar</p>
                    <small>Recommended: 800x800px</small>
                  </div>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('avatar', e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Banner Upload */}
            <div className="upload-section">
              <h3>Channel Banner</h3>
              <div className="upload-area banner-upload">
                {(mediaUploads.banner || channelData?.banner_url) ? (
                  <div className="current-image">
                    <img 
                      src={mediaUploads.banner || channelData?.banner_url} 
                      alt="Channel Banner"
                      className="preview-banner"
                    />
                    <button 
                      className="change-btn"
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div 
                    className="upload-placeholder"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <span className="upload-icon">🖼️</span>
                    <p>Upload Banner</p>
                    <small>Recommended: 2560x1440px</small>
                  </div>
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('banner', e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Watermark Upload */}
            <div className="upload-section">
              <h3>Video Watermark</h3>
              <div className="upload-area watermark-upload">
                {(mediaUploads.watermark || channelData?.watermark_url) ? (
                  <div className="current-image">
                    <img 
                      src={mediaUploads.watermark || channelData?.watermark_url} 
                      alt="Video Watermark"
                      className="preview-watermark"
                    />
                    <button 
                      className="change-btn"
                      onClick={() => watermarkInputRef.current?.click()}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div 
                    className="upload-placeholder"
                    onClick={() => watermarkInputRef.current?.click()}
                  >
                    <span className="upload-icon">🏷️</span>
                    <p>Upload Watermark</p>
                    <small>Recommended: 150x150px</small>
                  </div>
                )}
                <input
                  ref={watermarkInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('watermark', e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Color Theme */}
          <div className="color-section">
            <h3>Color Theme</h3>
            <div className="color-grid">
              <div className="color-group">
                <label>Primary Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={branding.themeColor}
                    onChange={(e) => handleBrandingChange('themeColor', e.target.value)}
                  />
                  <input
                    type="text"
                    value={branding.themeColor}
                    onChange={(e) => handleBrandingChange('themeColor', e.target.value)}
                    placeholder="#667eea"
                  />
                </div>
              </div>

              <div className="color-group">
                <label>Accent Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={branding.accentColor}
                    onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                  />
                  <input
                    type="text"
                    value={branding.accentColor}
                    onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                    placeholder="#764ba2"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Channel Settings */}
        <section className="profile-section">
          <h2>⚙️ Channel Settings</h2>
          <div className="settings-grid">
            <div className="setting-group">
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Make channel public
                </label>
                <small>Allow others to find and view your channel</small>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={formData.allowComments}
                    onChange={(e) => handleInputChange('allowComments', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Allow comments on videos
                </label>
                <small>Let viewers comment on your videos</small>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={formData.allowLikes}
                    onChange={(e) => handleInputChange('allowLikes', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Allow likes/dislikes
                </label>
                <small>Enable like and dislike buttons</small>
              </div>
            </div>

            <div className="setting-group">
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={formData.ageRestricted}
                    onChange={(e) => handleInputChange('ageRestricted', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Age-restricted content
                </label>
                <small>Mark channel as 18+ content</small>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={formData.madeForKids}
                    onChange={(e) => handleInputChange('madeForKids', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Made for kids
                </label>
                <small>Channel content is designed for children</small>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={formData.enableMonetization}
                    onChange={(e) => handleInputChange('enableMonetization', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Enable monetization
                </label>
                <small>Allow ads and revenue generation</small>
              </div>
            </div>
          </div>
        </section>

        {/* Social Links */}
        <section className="profile-section">
          <h2>🔗 Social Links</h2>
          <div className="social-grid">
            {Object.entries(socialLinks).map(([platform, url]) => (
              <div key={platform} className="social-group">
                <label>{platform.charAt(0).toUpperCase() + platform.slice(1)}</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                  placeholder={`https://${platform === 'website' ? 'example.com' : platform + '.com/username'}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Save Actions */}
        <div className="save-actions">
          <button 
            className="save-btn primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
          <button 
            className="save-btn secondary"
            onClick={() => window.history.back()}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoChannelProfile;