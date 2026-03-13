import os
import xml.etree.ElementTree as ET
from datetime import datetime
from flask import Blueprint, Response, request, abort
from feedgen.feed import FeedGenerator
from src.api.models import RadioStation, db

rss_bp = Blueprint('rss_feed', __name__)

# --- UTILITY: STANDARD XML VERSION (Lightweight) ---
@rss_bp.route('/<int:station_id>/basic-feed.xml', methods=['GET'])
def generate_basic_rss(station_id):
    station = RadioStation.query.get_or_404(station_id)
    
    rss = ET.Element("rss", version="2.0", xmlns_itunes="http://www.itunes.com/dtds/podcast-1.0.dtd")
    channel = ET.SubElement(rss, "channel")
    
    ET.SubElement(channel, "title").text = station.name
    ET.SubElement(channel, "description").text = station.description or "A SpectraSphere Podcast"
    ET.SubElement(channel, "link").text = f"{os.getenv('FRONTEND_URL')}/station/{station_id}"
    ET.SubElement(channel, "language").text = "en-us"
    ET.SubElement(channel, "itunes:author").text = station.name
    ET.SubElement(channel, "itunes:image", href=station.logo_url or "")
    
    # Episodes loop (Assumes relationship exists in models.py)
    episodes = getattr(station, 'episodes', [])
    for episode in episodes: 
        item = ET.SubElement(channel, "item")
        ET.SubElement(item, "title").text = episode.title
        ET.SubElement(item, "enclosure", url=episode.file_url, length="0", type="audio/mpeg")
        ET.SubElement(item, "guid").text = str(episode.id)
        pub_date = episode.created_at.strftime("%a, %d %b %Y %H:%M:%S GMT") if episode.created_at else ""
        ET.SubElement(item, "pubDate").text = pub_date

    return Response(ET.tostring(rss), mimetype='application/xml')


# --- UTILITY: ADVANCED PODCAST VERSION (Best for Spotify/Apple) ---
@rss_bp.route('/<int:station_id>/feed.xml', methods=['GET'])
def get_advanced_podcast_feed(station_id):
    station = RadioStation.query.get_or_404(station_id)
    
    fg = FeedGenerator()
    fg.load_extension('podcast')
    
    fg.title(station.name)
    fg.description(station.description or "Powered by SpectraSphere")
    fg.link(href=f"{os.getenv('FRONTEND_URL')}/station/{station_id}", rel='alternate')
    fg.language('en-us')
    
    # Podcast specific metadata
    fg.podcast.itunes_category('Music', 'Technology')
    if station.logo_url:
        fg.podcast.itunes_image(station.logo_url)
    fg.podcast.itunes_author(station.name)
    fg.podcast.itunes_explicit('no')

    episodes = getattr(station, 'episodes', [])
    for ep in episodes:
        fe = fg.add_entry()
        fe.id(str(ep.id))
        fe.title(ep.title)
        fe.description(ep.description or "New Episode")
        
        # Pulling file_url or audio_url
        url = getattr(ep, 'file_url', getattr(ep, 'audio_url', None))
        if url:
            fe.enclosure(url, 0, 'audio/mpeg')
            
        if ep.created_at:
            fe.pubDate(ep.created_at.strftime("%a, %d %b %Y %H:%M:%S GMT"))
        
    return Response(fg.rss_str(pretty=True), mimetype='application/xml')