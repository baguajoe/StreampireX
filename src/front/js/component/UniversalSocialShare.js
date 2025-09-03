// src/front/js/component/UniversalSocialShare.js
import React, { useState, useEffect } from 'react';
import "../../styles/UniversalSocialShare.css"

const UniversalSocialShare = ({ 
  isOpen, 
  onClose, 
  contentType, // 'music', 'video', 'podcast', 'radio', 'gaming', 'live_stream'
  contentData 
}) => {
  const [activePlatform, setActivePlatform] = useState('instagram');
  const [generatedContent, setGeneratedContent] = useState({});
  const [copyStatus, setCopyStatus] = useState({});
  const [loading, setLoading] = useState(false);

  // Platform configurations
  const platforms = {
    instagram: {
      name: 'Instagram',
      icon: '📸',
      color: '#E4405F',
      maxChars: 2200,
      imageSize: '1080x1080',
      hashtagLimit: 30
    },
    twitter: {
      name: 'Twitter',
      icon: '🐦',
      color: '#1DA1F2',
      maxChars: 280,
      imageSize: '1200x675',
      hashtagLimit: 3
    },
    facebook: {
      name: 'Facebook',
      icon: '📘',
      color: '#4267B2',
      maxChars: 63206,
      imageSize: '1200x630',
      hashtagLimit: 5
    },
    tiktok: {
      name: 'TikTok',
      icon: '🎬',
      color: '#000000',
      maxChars: 2200,
      imageSize: '1080x1920',
      hashtagLimit: 5
    },
    linkedin: {
      name: 'LinkedIn',
      icon: '💼',
      color: '#0077B5',
      maxChars: 3000,
      imageSize: '1200x627',
      hashtagLimit: 5
    },
    youtube: {
      name: 'YouTube',
      icon: '📺',
      color: '#FF0000',
      maxChars: 5000,
      imageSize: '1280x720',
      hashtagLimit: 15
    },
    discord: {
      name: 'Discord',
      icon: '👾',
      color: '#7289DA',
      maxChars: 2000,
      imageSize: '1920x1080',
      hashtagLimit: 0
    }
  };

  // Content type configurations
  const contentTypeConfigs = {
    music: {
      emoji: '🎵',
      platforms: ['instagram', 'twitter', 'facebook', 'tiktok', 'linkedin']
    },
    video: {
      emoji: '🎬',
      platforms: ['instagram', 'twitter', 'facebook', 'tiktok', 'youtube']
    },
    podcast: {
      emoji: '🎙️',
      platforms: ['twitter', 'facebook', 'linkedin', 'instagram']
    },
    radio: {
      emoji: '📻',
      platforms: ['twitter', 'facebook', 'instagram', 'linkedin']
    },
    gaming: {
      emoji: '🎮',
      platforms: ['twitter', 'discord', 'instagram', 'tiktok']
    },
    live_stream: {
      emoji: '🔴',
      platforms: ['twitter', 'instagram', 'facebook', 'tiktok']
    }
  };

  // Generate content when modal opens
  useEffect(() => {
    if (isOpen && contentData) {
      generateContent();
    }
  }, [isOpen, contentData, contentType]);

  const generateContent = async () => {
    setLoading(true);
    
    try {
      // Try backend generation first
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      
      if (backendUrl && token) {
        const response = await fetch(`${backendUrl}/api/social/generate-universal-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content_type: contentType,
            content_id: contentData.id,
            platforms: contentTypeConfigs[contentType]?.platforms || ['instagram', 'twitter'],
            custom_data: contentData
          })
        });

        if (response.ok) {
          const data = await response.json();
          setGeneratedContent(data.content);
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.warn('Backend generation failed, using frontend fallback:', error);
    }

    // Frontend fallback generation
    const content = {};
    const allowedPlatforms = contentTypeConfigs[contentType]?.platforms || ['instagram', 'twitter'];
    
    allowedPlatforms.forEach(platform => {
      content[platform] = generatePlatformContentFrontend(platform);
    });
    
    setGeneratedContent(content);
    setLoading(false);
  };

  const generatePlatformContentFrontend = (platform) => {
    const platformConfig = platforms[platform];
    const contentConfig = contentTypeConfigs[contentType];
    
    if (!platformConfig || !contentConfig) {
      return {
        text: `Check out my latest ${contentType}: "${contentData?.title}"!\n\nStreampireX.com - The ultimate creator platform\n\n#StreampireX`,
        characterCount: 100,
        isOverLimit: false,
        hashtags: '#StreampireX'
      };
    }

    // Generate branded content templates
    const templates = {
      music: {
        instagram: `🎵 Just dropped "${contentData.title}" on StreampireX and I'm so excited to share it!

This track represents months of hard work and creativity. Every beat, every melody crafted with passion 🔥

🎧 Stream it now on all platforms through StreampireX
🌟 Follow my journey: @${contentData.artist_name || 'me'}

Check out StreampireX.com - The ultimate platform for independent artists!`,

        twitter: `🎵 NEW TRACK: "${contentData.title}" is live!

Created and distributed through @StreampireX - the ultimate platform for independent artists 🚀

Stream everywhere: [link]`,

        facebook: `🎵 I'm thrilled to share my latest creation: "${contentData.title}"!

Thanks to StreampireX, I can focus on what I love most - making music - while they handle the distribution to all major platforms worldwide 🌍

This track is now live on Spotify, Apple Music, Amazon Music, and everywhere else music is streamed.

StreampireX isn't just a platform, it's a community of creators supporting each other. Join us at StreampireX.com`,

        linkedin: `🎵 Proud to announce my latest musical project: "${contentData.title}"

As an independent artist, finding the right tools and platforms is crucial for success. StreampireX has revolutionized how I distribute my music, manage my brand, and connect with fans across all social media platforms.

"${contentData.title}" is now available worldwide thanks to StreampireX's global distribution network.

For fellow creators looking for a comprehensive platform: StreampireX.com offers music distribution, social media management, radio streaming, gaming communities, and so much more.`,

        tiktok: `New track "${contentData.title}" hits different 🔥 Created on StreampireX - the ultimate creator platform! 

Check it out: StreampireX.com`
      },
      
      video: {
        instagram: `🎬 New video "${contentData.title}" is live!

Created using StreampireX's amazing creator tools - from editing to sharing across all platforms 📱

This platform has everything a content creator needs in one place!

Check it out: StreampireX.com
Follow for more: @${contentData.creator || 'me'}`,

        youtube: `🎬 "${contentData.title}" - Created with StreampireX

${contentData.description || 'Check out my latest video!'}

🌟 About this video: Created using StreampireX, the all-in-one platform for creators. From video editing to social media management, live streaming to music distribution - everything I need is in one place.

🔗 Try StreampireX: https://StreampireX.com
🔔 Don't forget to subscribe for more content!`,

        twitter: `🎬 NEW VIDEO: "${contentData.title}" is live!

Created with @StreampireX - the all-in-one creator platform 🚀

Watch: [link]`,

        facebook: `🎬 Just uploaded "${contentData.title}" and I'm excited to share it!

This video was created using StreampireX's comprehensive creator tools. The platform makes content creation, editing, and distribution so much easier.

StreampireX is revolutionizing how creators work - everything you need in one place!

Check it out: StreampireX.com`
      },
      
      podcast: {
        twitter: `🎙️ NEW EPISODE: "${contentData.title}" is live!

Powered by @StreampireX - the ultimate platform for podcasters 🚀

Listen now: [link]`,

        linkedin: `🎙️ Latest podcast episode: "${contentData.title}"

This conversation offers valuable insights for professionals and creatives alike. Hosted and distributed through StreampireX - the comprehensive platform that handles everything from recording to distribution.

StreampireX makes podcasting accessible to everyone with professional tools and global distribution.

Listen now and discover more at StreampireX.com`,

        facebook: `🎙️ New podcast episode "${contentData.title}" is now available!

Thanks to StreampireX, hosting and distributing podcasts has never been easier. From recording tools to global distribution - they handle it all!

This episode dives deep into ${contentData.description || 'fascinating topics'} and I think you'll love it.

Check out StreampireX.com for all your podcasting needs!`
      },
      
      radio: {
        twitter: `📻 LIVE NOW: "${contentData.station_name || contentData.title}" on StreampireX!

Currently spinning: ${contentData.current_track || 'Amazing music'} 🎶

StreampireX makes running a 24/7 radio station effortless!

Tune in: StreampireX.com/radio/${contentData.id || ''}`,

        facebook: `📻 "${contentData.station_name || contentData.title}" is broadcasting live on StreampireX!

What started as a passion for sharing great music has become a thriving radio station, thanks to StreampireX's incredible radio platform. No technical knowledge needed - just passion for music!

🎵 Currently playing: ${contentData.current_track || 'Great music'}
👥 ${contentData.listener_count || '0'} listeners and growing!

StreampireX has revolutionized how independent creators can start their own radio stations. If you've ever dreamed of being a radio DJ, now's your chance!

Join the broadcast revolution: StreampireX.com`
      },
      
      gaming: {
        discord: `🎮 **${contentData.title || 'Gaming Session'}** - Powered by StreampireX Gaming

${contentData.description || 'Squad looking for players!'}

StreampireX isn't just for music - it's the ultimate hub for gamers too! Squad finder, team rooms, live streaming, and community building all in one platform.

React with 🎮 to join our squad!

Check out StreampireX Gaming: https://StreampireX.com/gaming`,

        twitter: `🎮 Squad up for ${contentData.game || 'gaming'}! 

${contentData.description || 'Looking for skilled players!'}

Using @StreampireX gaming hub to find the perfect teammates - no more random matchmaking! 🎯

Join the gaming revolution: StreampireX.com/gaming`,

        instagram: `🎮 Gaming session starting soon!

Looking for squad members for ${contentData.game || 'epic gaming'} - who's ready to team up? 

StreampireX makes finding gaming communities so easy!

Check it out: StreampireX.com/gaming 🔥`
      },
      
      live_stream: {
        instagram: `🔴 GOING LIVE: "${contentData.title || 'Live Stream'}"

Streaming live on StreampireX - the platform that makes live streaming effortless with built-in social sharing, community features, and zero technical setup!

Come hang out and chat! 💬

Join: StreampireX.com/live/${contentData.stream_id || ''}`,

        twitter: `🔴 LIVE NOW: "${contentData.title || 'Live Stream'}"

Streaming on @StreampireX - the all-in-one creator platform that just makes everything easier! 

✨ Built-in chat  ✨ Social sharing  ✨ Community features  ✨ Zero setup required

Watch: StreampireX.com/live/${contentData.stream_id || ''}`,

        facebook: `🔴 LIVE STREAM STARTING NOW!

Join me for "${contentData.title || 'Live Stream'}" - we're going to have some fun and I want to see you all in the chat!

Streaming on StreampireX - the platform that makes live streaming accessible to everyone with professional features and zero technical complexity.

Click to join the live stream! StreampireX.com`
      }
    };

    // Get template
    const contentTemplates = templates[contentType] || templates.music;
    let text = contentTemplates[platform] || contentTemplates.twitter || `Check out my latest ${contentType}: "${contentData?.title}"!\n\nStreampireX.com - The ultimate creator platform`;
    
    // Generate hashtags
    const hashtags = generateHashtagsFrontend(contentType, platform, platformConfig.hashtagLimit);
    
    if (hashtags && platformConfig.hashtagLimit > 0) {
      text += `\n\n${hashtags}`;
    }

    return {
      text: text,
      characterCount: text.length,
      isOverLimit: text.length > platformConfig.maxChars,
      hashtags: hashtags
    };
  };

  const generateHashtagsFrontend = (contentType, platform, limit) => {
    if (limit === 0) return '';

    const hashtagSets = {
      music: {
        base: ['#StreampireX', '#NewMusic', '#IndependentArtist', '#MusicDistribution', '#MusicCreator', '#Artist'],
        instagram: ['#Instamusic', '#MusicPost', '#ArtistLife', '#MusicVideo', '#Studio', '#Creative'],
        twitter: ['#MusicTwitter', '#NowPlaying', '#MusicDrop'],
        tiktok: ['#fyp', '#music', '#newmusic', '#artist', '#viral', '#trending'],
        linkedin: ['#MusicIndustry', '#CreativeEntrepreneur', '#MusicBusiness', '#IndependentArtist'],
        facebook: ['#FacebookMusic', '#MusicCommunity', '#IndependentArtist']
      },
      video: {
        base: ['#StreampireX', '#ContentCreator', '#VideoContent', '#CreatorTools', '#VideoProduction'],
        instagram: ['#InstaVideo', '#Reels', '#VideoPost', '#Creative', '#Filmmaker'],
        twitter: ['#Video', '#Content', '#Creator', '#Film'],
        tiktok: ['#fyp', '#viral', '#video', '#content', '#creator', '#trending'],
        youtube: ['#YouTube', '#Video', '#Subscribe', '#Content', '#NewVideo', '#CreatorTools'],
        facebook: ['#FacebookVideo', '#VideoContent', '#Creator']
      },
      podcast: {
        base: ['#StreampireX', '#Podcast', '#PodcastLife', '#Audio', '#PodcastHost', '#Listen'],
        twitter: ['#PodcastTwitter', '#Podcasting', '#NewEpisode'],
        linkedin: ['#PodcastHost', '#BusinessPodcast', '#Entrepreneurship', '#Leadership'],
        instagram: ['#PodcastersOfInstagram', '#PodcastLife', '#Audio', '#NewEpisode'],
        facebook: ['#PodcastCommunity', '#AudioContent', '#PodcastHost']
      },
      radio: {
        base: ['#StreampireX', '#Radio', '#LiveRadio', '#DJ', '#RadioStation', '#Broadcasting'],
        twitter: ['#RadioShow', '#LiveNow', '#DJ', '#OnAir'],
        facebook: ['#OnlineRadio', '#MusicStream', '#LiveBroadcast', '#RadioStation'],
        instagram: ['#RadioDJ', '#LiveRadio', '#OnAir', '#RadioShow'],
        linkedin: ['#RadioBroadcasting', '#DigitalRadio', '#MediaIndustry']
      },
      gaming: {
        base: ['#StreampireX', '#Gaming', '#GamingCommunity', '#Squad', '#Gamers', '#TeamUp'],
        twitter: ['#GamingTwitter', '#SquadUp', '#LFG', '#Gaming'],
        discord: [], // Discord doesn't use hashtags much
        tiktok: ['#Gaming', '#Gamer', '#fyp', '#GamingTok', '#GamerLife'],
        instagram: ['#GamerLife', '#GamingPost', '#Squad', '#GamingCommunity'],
        facebook: ['#GamingCommunity', '#Gamers', '#SquadUp']
      },
      live_stream: {
        base: ['#StreampireX', '#LiveStream', '#Live', '#Streaming', '#GoingLive', '#Stream'],
        twitter: ['#LiveTweet', '#Streaming', '#GoingLive'],
        instagram: ['#InstagramLive', '#LiveStream', '#GoingLive'],
        tiktok: ['#Live', '#TikTokLive', '#Streaming', '#GoingLive'],
        facebook: ['#FacebookLive', '#LiveVideo', '#Streaming']
      }
    };

    const contentHashtags = hashtagSets[contentType] || hashtagSets.music;
    const baseHashtags = contentHashtags.base || [];
    const platformHashtags = contentHashtags[platform] || [];
    
    const allHashtags = [...baseHashtags, ...platformHashtags];
    const selectedHashtags = allHashtags.slice(0, limit);
    
    return selectedHashtags.join(' ');
  };

  const copyToClipboard = async (platform) => {
    const content = generatedContent[platform];
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content.text);
      setCopyStatus({ [platform]: 'success' });
      setTimeout(() => setCopyStatus({}), 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content.text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopyStatus({ [platform]: 'success' });
      setTimeout(() => setCopyStatus({}), 3000);
    }
  };

  const downloadImage = () => {
    const imageUrl = contentData.album_cover || contentData.thumbnail || contentData.cover_image;
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${contentData.title}-StreampireX-${platforms[activePlatform].imageSize}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openPlatform = (platform) => {
    const urls = {
      instagram: 'https://www.instagram.com',
      twitter: 'https://twitter.com/intent/tweet',
      facebook: 'https://www.facebook.com',
      tiktok: 'https://www.tiktok.com/upload',
      linkedin: 'https://www.linkedin.com/feed/',
      youtube: 'https://studio.youtube.com',
      discord: 'https://discord.com'
    };
    
    window.open(urls[platform], '_blank');
  };

  if (!isOpen) return null;

  const allowedPlatforms = contentTypeConfigs[contentType]?.platforms || ['instagram', 'twitter'];
  const currentPlatform = platforms[activePlatform];
  const currentContent = generatedContent[activePlatform];
  const contentConfig = contentTypeConfigs[contentType];

  return (
    <div className="social-share-overlay">
      <div className="social-share-modal" data-content-type={contentType}>
        <div className="modal-header">
          <div className="header-content">
            <h2>🚀 Share from StreampireX</h2>
            <p>{contentConfig?.emoji} "{contentData?.title}" with StreampireX branding</p>
          </div>
          <div className="streampirex-badge">
            <span className="badge-text">StreampireX</span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="platform-tabs">
          {allowedPlatforms.map(platformKey => {
            const platform = platforms[platformKey];
            if (!platform) return null;
            
            return (
              <button
                key={platformKey}
                className={`platform-tab ${activePlatform === platformKey ? 'active' : ''}`}
                onClick={() => setActivePlatform(platformKey)}
                style={{ '--platform-color': platform.color }}
                data-platform={platformKey}
              >
                <span className="platform-icon">{platform.icon}</span>
                <span>{platform.name}</span>
              </button>
            );
          })}
        </div>

        <div className="platform-content">
          {loading ? (
            <div className="generating-content">
              Generating optimized content with StreampireX branding...
            </div>
          ) : (
            <>
              <div className="content-preview">
                <div className="preview-header">
                  <h3 style={{ color: currentPlatform?.color }}>
                    {currentPlatform?.icon} {currentPlatform?.name} Post
                  </h3>
                  <div className={`character-count ${
                    currentContent?.isOverLimit ? 'over-limit' : 
                    currentContent?.characterCount > currentPlatform?.maxChars * 0.9 ? 'warning' : ''
                  }`}>
                    {currentContent?.characterCount || 0}/{currentPlatform?.maxChars}
                  </div>
                </div>

                <div className="post-preview">
                  <div className="post-text">
                    {currentContent?.text || 'Generating branded content...'}
                  </div>
                  
                  {(contentData.album_cover || contentData.thumbnail || contentData.cover_image) && (
                    <div className={`media-preview ${contentType}-content`}>
                      <img 
                        src={contentData.album_cover || contentData.thumbnail || contentData.cover_image} 
                        alt={contentData.title} 
                      />
                      <div className="streampirex-watermark">StreampireX</div>
                      <p>📐 Optimized: {currentPlatform?.imageSize} (with StreampireX branding)</p>
                    </div>
                  )}
                </div>

                <div className="action-buttons">
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(activePlatform)}
                    disabled={!currentContent}
                    data-content={contentType}
                  >
                    📋 {copyStatus[activePlatform] === 'success' ? '✅ Copied!' : 'Copy Branded Content'}
                  </button>
                  
                  <button className="download-btn" onClick={downloadImage}>
                    ⬇️ Download Branded Media
                  </button>
                  
                  <button 
                    className="open-platform-btn"
                    onClick={() => openPlatform(activePlatform)}
                    style={{ backgroundColor: currentPlatform?.color }}
                  >
                    🔗 Open {currentPlatform?.name}
                  </button>
                </div>
              </div>

              <div className="branded-features-info">
                <h4>✨ StreampireX Branded Sharing Features</h4>
                <ul>
                  <li>🏷️ StreampireX watermark on all images</li>
                  <li>📱 Platform-optimized content with branding</li>
                  <li>🔗 Automatic StreampireX.com links and attribution</li>
                  <li>🌟 Creator attribution and platform promotion</li>
                  <li>📈 Help grow the StreampireX community</li>
                </ul>
              </div>

              <div className={`platform-tips content-specific ${contentType}`}>
                <h4>💡 {currentPlatform?.name} Tips for {contentType}</h4>
                <ul>
                  {getPlatformTips(activePlatform, contentType).map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function for platform tips
const getPlatformTips = (platform, contentType) => {
  const tips = {
    instagram: {
      music: ['Use music stickers in Stories', 'Post album covers in feed', 'Use Reels for previews', 'Tag @StreampireX for features'],
      video: ['Keep videos under 60s for feed', 'Use vertical format for Reels', 'Add captions', 'Use trending audio'],
      podcast: ['Share audio quotes as graphics', 'Use carousel posts for episodes', 'Add episode highlights'],
      radio: ['Go live to announce shows', 'Share now-playing graphics', 'Use Stories for real-time updates'],
      gaming: ['Stream gameplay on Live', 'Share highlights in Reels', 'Use gaming hashtags', 'Tag gaming accounts'],
      live_stream: ['Announce with countdown stickers', 'Cross-promote in Stories', 'Interact with comments']
    },
    twitter: {
      music: ['Thread for album announcements', 'Engage with music Twitter', 'Use @StreampireX mentions'],
      video: ['Keep videos under 2:20', 'Add alt text to images', 'Use Twitter threads for context'],
      podcast: ['Tweet key quotes', 'Create Twitter Spaces', 'Engage with podcast Twitter'],
      radio: ['Live tweet shows', 'Use Twitter Spaces', 'Interact with listeners in real-time'],
      gaming: ['Tweet gaming clips', 'Join gaming conversations', 'Use gaming hashtags'],
      live_stream: ['Tweet going live alerts', 'Use relevant hashtags', 'Engage during stream']
    },
    facebook: {
      music: ['Create events for releases', 'Share behind-the-scenes content', 'Use Facebook Pages'],
      video: ['Upload natively for better reach', 'Use Facebook Watch', 'Create longer content'],
      podcast: ['Share full episodes', 'Create discussion groups', 'Use Facebook Audio'],
      radio: ['Stream live shows', 'Create station pages', 'Build community groups'],
      gaming: ['Join gaming groups', 'Stream on Facebook Gaming', 'Share gaming content'],
      live_stream: ['Use Facebook Live', 'Create events for streams', 'Promote in relevant groups']
    },
    tiktok: {
      music: ['Create 15-30s previews', 'Use trending sounds', 'Dance or performance videos'],
      video: ['Keep it vertical', 'Hook viewers in first 3s', 'Use trending effects'],
      podcast: ['Share best quotes visually', 'Behind-the-scenes content', 'Quick tips format'],
      radio: ['Show studio setup', 'React to listener calls', 'Music discovery content'],
      gaming: ['Share highlight clips', 'Gaming tips and tricks', 'Funny gaming moments'],
      live_stream: ['Announce streams with countdowns', 'Share funny moments', 'Quick highlights']
    },
    linkedin: {
      music: ['Share creative process', 'Music industry insights', 'Professional networking'],
      video: ['Professional content creation tips', 'Industry networking', 'Educational content'],
      podcast: ['Business and career episodes work best', 'Interview highlights', 'Professional insights'],
      radio: ['Broadcasting industry content', 'Media business insights', 'Industry networking'],
      gaming: ['Gaming industry news', 'Esports business content', 'Technology insights'],
      live_stream: ['Professional live content', 'Industry discussions', 'Educational streams']
    },
    youtube: {
      video: ['Optimize titles and thumbnails', 'Use end screens and cards', 'Create playlists'],
      music: ['Upload music videos', 'Create lyric videos', 'Behind-the-scenes content'],
      podcast: ['Video podcasts perform well', 'Create highlight clips', 'Use chapters'],
      gaming: ['Stream gameplay', 'Create gaming tutorials', 'Review games'],
      live_stream: ['Schedule premieres', 'Use Super Chat', 'Create waiting rooms']
    },
    discord: {
      gaming: ['Share in gaming servers', 'Create squad announcements', 'Use voice channels'],
      live_stream: ['Announce to gaming communities', 'Share clips in relevant servers']
    }
  };

  const platformTips = tips[platform] || {};
  return platformTips[contentType] || [`Share engaging ${contentType} content`, 'Use relevant hashtags', 'Engage with your audience', 'Mention @StreampireX for potential features'];
};

export default UniversalSocialShare;