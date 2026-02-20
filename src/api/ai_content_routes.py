# =============================================================================
# ai_content_routes.py - AI Content Writer Endpoints
# =============================================================================
# Add to routes.py OR import as a Blueprint
# No database model needed — stateless API calls
# Requires: ANTHROPIC_API_KEY in .env (optional - has template fallback)
# Install: pip install anthropic
# =============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import json
import random

ai_content_bp = Blueprint('ai_content', __name__)

# =============================================================================
# MAIN GENERATE ENDPOINT
# =============================================================================

@ai_content_bp.route('/api/ai/generate-content', methods=['POST'])
@jwt_required()
def generate_content():
    """
    Generate AI content for creators.
    
    POST body:
    {
        "type": "track_description" | "artist_bio" | "social_post" | "podcast_notes" | 
                "video_description" | "email_newsletter" | "press_release" | "hashtags",
        "context": {
            "title": "Song/Video/Podcast title",
            "artist_name": "Creator name",
            "genre": "Hip Hop",
            "mood": "energetic",
            "platform": "instagram" | "twitter" | "youtube" | "tiktok" | "linkedin",
            "tone": "professional" | "casual" | "hype" | "storytelling",
            "keywords": ["optional", "keywords"],
            "additional_info": "Any extra context the user provides"
        }
    }
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        content_type = data.get('type', 'track_description')
        context = data.get('context', {})
        
        if not content_type:
            return jsonify({"error": "Content type is required"}), 400
        
        # Try AI generation first, fall back to templates
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        
        if api_key:
            result = generate_with_ai(content_type, context, api_key)
        else:
            result = generate_with_templates(content_type, context)
        
        if result.get('error'):
            return jsonify({"error": result['error']}), 500
        
        return jsonify({
            "success": True,
            "type": content_type,
            "content": result['content'],
            "variants": result.get('variants', []),
            "ai_powered": bool(api_key)
        }), 200
        
    except Exception as e:
        print(f"AI Content Error: {e}")
        return jsonify({"error": f"Generation failed: {str(e)}"}), 500


# =============================================================================
# AI GENERATION (Anthropic Claude)
# =============================================================================

def generate_with_ai(content_type, context, api_key):
    """Generate content using Claude API"""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        
        prompt = build_prompt(content_type, context)
        
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            system="You are a professional content writer for music artists, video creators, and podcasters. Write engaging, authentic content that sounds human — never robotic or generic. Always return valid JSON with the exact structure requested."
        )
        
        # Parse response
        response_text = message.content[0].text
        
        # Try to parse as JSON
        try:
            # Strip markdown code fences if present
            cleaned = response_text.strip()
            if cleaned.startswith('```'):
                cleaned = cleaned.split('\n', 1)[1]
                cleaned = cleaned.rsplit('```', 1)[0]
            parsed = json.loads(cleaned)
            return parsed
        except json.JSONDecodeError:
            # Return raw text as content
            return {
                "content": response_text,
                "variants": []
            }
            
    except ImportError:
        print("anthropic package not installed, using templates")
        return generate_with_templates(content_type, context)
    except Exception as e:
        print(f"AI generation error: {e}")
        return generate_with_templates(content_type, context)


def build_prompt(content_type, context):
    """Build the prompt for Claude based on content type"""
    
    title = context.get('title', 'Untitled')
    artist = context.get('artist_name', 'the artist')
    genre = context.get('genre', 'music')
    mood = context.get('mood', '')
    platform = context.get('platform', '')
    tone = context.get('tone', 'casual')
    keywords = context.get('keywords', [])
    extra = context.get('additional_info', '')
    
    keyword_str = ', '.join(keywords) if keywords else ''
    
    prompts = {
        'track_description': f"""Write 3 different track descriptions for a {genre} song called "{title}" by {artist}.
Mood: {mood}. Tone: {tone}. {f'Keywords: {keyword_str}.' if keyword_str else ''} {f'Extra context: {extra}' if extra else ''}

Return JSON: {{"content": "best description (2-3 sentences)", "variants": ["variant 1", "variant 2"]}}""",

        'artist_bio': f"""Write 3 artist bio variants for {artist}, a {genre} artist.
Tone: {tone}. {f'Extra context: {extra}' if extra else ''}

Return JSON: {{"content": "main bio (3-4 sentences, first person or third person based on tone)", "variants": ["short bio (1 sentence)", "long bio (5-6 sentences)"]}}""",

        'social_post': f"""Write 3 social media posts for {platform or 'social media'} promoting "{title}" by {artist}.
Genre: {genre}. Tone: {tone}. {f'Mood: {mood}.' if mood else ''} {f'Extra: {extra}' if extra else ''}

Platform guidelines:
- Twitter/X: max 280 chars, punchy
- Instagram: engaging caption, line breaks, call to action
- TikTok: trending style, hook in first line
- YouTube: SEO-friendly, include call to action
- LinkedIn: professional, industry angle

Return JSON: {{"content": "best post with relevant emojis", "variants": ["variant 2", "variant 3"]}}""",

        'podcast_notes': f"""Write show notes for a podcast episode called "{title}" hosted by {artist}.
Genre/Topic: {genre}. Tone: {tone}. {f'Extra: {extra}' if extra else ''}

Return JSON: {{"content": "show notes with episode summary, key topics as bullet points, and a call to action (use markdown)", "variants": ["short summary (2 sentences)", "tweet-length teaser"]}}""",

        'video_description': f"""Write 3 YouTube/video descriptions for a video called "{title}" by {artist}.
Genre: {genre}. Tone: {tone}. {f'Extra: {extra}' if extra else ''}

Return JSON: {{"content": "main description with timestamps section, links section, and call to action", "variants": ["short description (2-3 sentences)", "SEO-optimized version"]}}""",

        'email_newsletter': f"""Write a short email newsletter promoting "{title}" by {artist}.
Genre: {genre}. Tone: {tone}. {f'Extra: {extra}' if extra else ''}

Return JSON: {{"content": "email body with subject line at top, greeting, main content, and call to action", "variants": ["subject line only", "short version (3 sentences)"]}}""",

        'press_release': f"""Write a press release for "{title}" by {artist}.
Genre: {genre}. Tone: professional. {f'Extra: {extra}' if extra else ''}

Return JSON: {{"content": "press release with headline, dateline, body paragraphs, quote from artist, and boilerplate", "variants": ["one-paragraph summary", "social media announcement"]}}""",

        'hashtags': f"""Generate hashtags for "{title}" by {artist} in the {genre} genre.
Platform: {platform or 'all'}. {f'Mood: {mood}.' if mood else ''} {f'Extra: {extra}' if extra else ''}

Return JSON: {{"content": "top 15 hashtags as a single string separated by spaces", "variants": ["5 niche hashtags", "5 trending hashtags"]}}"""
    }
    
    return prompts.get(content_type, prompts['track_description'])


# =============================================================================
# TEMPLATE FALLBACK (No API key needed)
# =============================================================================

def generate_with_templates(content_type, context):
    """Generate content using templates when no AI API is available"""
    
    title = context.get('title', 'Untitled')
    artist = context.get('artist_name', 'the artist')
    genre = context.get('genre', 'music')
    mood = context.get('mood', 'fresh')
    platform = context.get('platform', '')
    
    templates = {
        'track_description': {
            'content': random.choice([
                f'"{title}" is the latest release from {artist}, blending {genre} influences with a {mood} energy that hits different. Stream it now and feel the vibe.',
                f'{artist} delivers pure heat with "{title}" — a {genre} track that captures a {mood} mood from start to finish. This one\'s going on repeat.',
                f'New music alert: "{title}" by {artist}. A {mood} {genre} experience that showcases everything that makes {artist} special.',
            ]),
            'variants': [
                f'"{title}" — {mood} {genre} energy from {artist}. Out now on all platforms.',
                f'{artist}\'s new track "{title}" is a {mood} {genre} journey you don\'t want to miss. Stream now wherever you listen.',
            ]
        },
        
        'artist_bio': {
            'content': f'{artist} is a {genre} artist pushing boundaries and breaking molds. With a sound that blends raw authenticity with polished production, {artist} has built a growing fanbase that connects with every release. From the studio to the stage, {artist} brings an energy that\'s impossible to ignore.',
            'variants': [
                f'{artist} — {genre} artist. Making music that matters.',
                f'{artist} is a {genre} creator and performer known for {mood} soundscapes and authentic storytelling. With multiple releases and a dedicated community of fans, {artist} continues to evolve and push creative boundaries. Drawing inspiration from diverse influences, {artist} crafts music that resonates on a deeply personal level while maintaining universal appeal. Currently working on new material and building a movement one track at a time.',
            ]
        },
        
        'social_post': {
            'content': random.choice([
                f'🔥 NEW MUSIC 🔥\n\n"{title}" is OUT NOW!\n\nThis one hits different. {mood.capitalize()} vibes, {genre} energy, all heart.\n\n🎧 Link in bio\n\n#NewMusic #{genre.replace(" ", "")} #StreamNow',
                f'"{title}" just dropped and I put everything into this one 💯\n\nIf you fw {genre} music with real {mood} energy, this is for you.\n\nStream it. Share it. Let me know what you think 🎵👇',
                f'It\'s here. 🎵\n\n"{title}" — available everywhere right now.\n\n{mood.capitalize()}. Raw. {genre.capitalize()}.\n\nGo run it up ▶️ Link in bio',
            ]),
            'variants': [
                f'"{title}" out now 🎧🔥 #{genre.replace(" ", "")} #NewMusic',
                f'POV: you\'re listening to "{title}" for the first time and it hits you right in the feels 😤🔥 New {genre} out now! #NewRelease',
            ]
        },
        
        'podcast_notes': {
            'content': f'## {title}\n\n**Hosted by {artist}**\n\n### Episode Summary\nIn this episode, we dive deep into the topics that matter most. {artist} brings {mood} energy and real talk.\n\n### Key Topics\n- Main discussion and insights\n- Behind-the-scenes stories\n- Listener questions and community highlights\n- What\'s coming next\n\n### Connect\n- Follow {artist} on StreamPireX\n- Leave a review and subscribe\n- Share this episode with someone who needs to hear it!',
            'variants': [
                f'{artist} gets real in this episode of "{title}" — covering everything from industry insights to personal stories. Don\'t miss it.',
                f'New episode: "{title}" 🎙️ {artist} brings the heat this week. Subscribe & listen now!',
            ]
        },
        
        'video_description': {
            'content': f'{title} | {artist}\n\n{artist} presents "{title}" — a {mood} {genre} visual experience.\n\n🕐 Timestamps:\n0:00 - Intro\n0:30 - Main Content\n\n🔗 Links:\n• StreamPireX: [link]\n• Socials: [links]\n\n👍 Like, Comment & Subscribe for more {genre} content!\n\n#{genre.replace(" ", "")} #{artist.replace(" ", "")} #NewVideo',
            'variants': [
                f'"{title}" by {artist} — {mood} {genre} vibes. Watch now and subscribe for more!',
                f'{title} | {artist} | Official Video\n\nThe wait is over. "{title}" is here — {artist}\'s latest {genre} release brings {mood} energy to every frame. Hit subscribe and turn on notifications so you never miss a drop.\n\nTags: {genre}, new music, {artist}, {mood}, 2026',
            ]
        },
        
        'email_newsletter': {
            'content': f'Subject: 🎵 "{title}" is OUT NOW — Don\'t Miss This\n\nHey fam,\n\nI\'m hyped to share my latest release with you — "{title}" is officially out everywhere!\n\nThis {genre} track has been months in the making, and I poured everything into it. The {mood} energy, the lyrics, the production — it all came together perfectly.\n\nStream it now on your favorite platform and let me know what you think. Your support means everything.\n\nLove,\n{artist}\n\nP.S. Share it with someone who needs this vibe today 🎧',
            'variants': [
                f'Subject: "{title}" just dropped 🔥',
                f'Hey! Quick update — "{title}" is live! Stream it, share it, and thank you for rocking with me. More coming soon. — {artist}',
            ]
        },
        
        'press_release': {
            'content': f'FOR IMMEDIATE RELEASE\n\n{artist.upper()} RELEASES NEW {genre.upper()} {"TRACK" if "music" in genre.lower() or genre else "PROJECT"} "{title.upper()}"\n\n[City, Date] — {artist} announces the release of "{title}," a {mood} new {genre} {"track" if genre else "project"} available now on all major streaming platforms through StreamPireX.\n\nThe release showcases {artist}\'s signature sound while pushing into new creative territory. "{title}" blends {genre} elements with {mood} production choices that set it apart.\n\n"{title} represents a new chapter for me," says {artist}. "I wanted to create something that connects with people on a deeper level."\n\n"{title}" is available now on Spotify, Apple Music, and 150+ platforms via StreamPireX distribution.\n\n### About {artist}\n{artist} is a {genre} artist creating music that matters. For press inquiries, contact: [email]',
            'variants': [
                f'{artist} drops "{title}" — a {mood} new {genre} release now streaming everywhere.',
                f'🚨 PRESS: {artist} releases "{title}" — available now on all platforms via StreamPireX distribution.',
            ]
        },
        
        'hashtags': {
            'content': f'#{genre.replace(" ", "")} #NewMusic #{artist.replace(" ", "")} #{title.replace(" ", "")} #MusicIsLife #StreamNow #IndependentArtist #NewRelease #MusicProducer #{mood.replace(" ", "")}Vibes #SupportIndieMusic #StreamPireX #MusicCommunity #ArtistLife #NowPlaying',
            'variants': [
                f'#{genre.replace(" ", "")} #{mood.replace(" ", "")}Music #Underground{genre.replace(" ", "")} #IndieArtist #{artist.replace(" ", "")}Music',
                f'#Trending #FYP #NewMusic2026 #ViralMusic #MustListen',
            ]
        }
    }
    
    return templates.get(content_type, templates['track_description'])


# =============================================================================
# CONTENT TYPE LIST ENDPOINT
# =============================================================================

@ai_content_bp.route('/api/ai/content-types', methods=['GET'])
@jwt_required()
def get_content_types():
    """Return available content generation types"""
    return jsonify({
        "types": [
            {
                "id": "track_description",
                "name": "Track Description",
                "icon": "🎵",
                "description": "Write compelling descriptions for your music releases"
            },
            {
                "id": "artist_bio",
                "name": "Artist Bio",
                "icon": "👤",
                "description": "Generate professional bios for your profile"
            },
            {
                "id": "social_post",
                "name": "Social Media Post",
                "icon": "📱",
                "description": "Create engaging posts for any platform"
            },
            {
                "id": "podcast_notes",
                "name": "Podcast Show Notes",
                "icon": "🎙️",
                "description": "Generate structured show notes and summaries"
            },
            {
                "id": "video_description",
                "name": "Video Description",
                "icon": "🎬",
                "description": "Write SEO-friendly video descriptions"
            },
            {
                "id": "email_newsletter",
                "name": "Email Newsletter",
                "icon": "📧",
                "description": "Draft email campaigns for your fans"
            },
            {
                "id": "press_release",
                "name": "Press Release",
                "icon": "📰",
                "description": "Create professional press releases"
            },
            {
                "id": "hashtags",
                "name": "Hashtag Generator",
                "icon": "#️⃣",
                "description": "Generate relevant hashtags for your content"
            }
        ]
    }), 200