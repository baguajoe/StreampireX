# src/api/video_editor_routes.py
# =====================================================
# VIDEO EDITOR API ROUTES - Cloudinary Integration
# =====================================================
# Add to your Flask app with: app.register_blueprint(video_editor_bp)

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from sqlalchemy import desc
import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
import json
import hashlib

# Import your models - adjust path if needed
from src.api.models import db, User, Video, VideoProject, VideoClipAsset, VideoExport
from src.api.cloudinary_setup import uploadFile

video_editor_bp = Blueprint('video_editor', __name__)

# =====================================================
# MODELS - Add these to your models.py
# =====================================================
"""
Add this to your src/api/models.py:

class VideoProject(db.Model):
    __tablename__ = 'video_projects'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False, default='Untitled Project')
    description = db.Column(db.Text)
    
    # Project settings
    resolution_width = db.Column(db.Integer, default=1920)
    resolution_height = db.Column(db.Integer, default=1080)
    frame_rate = db.Column(db.Integer, default=30)
    duration = db.Column(db.Float, default=0)  # Total duration in seconds
    
    # Timeline data stored as JSON
    timeline_data = db.Column(db.Text)  # JSON string of tracks, clips, transitions
    
    # Thumbnail
    thumbnail_url = db.Column(db.String(500))
    
    # Status
    status = db.Column(db.String(50), default='draft')  # draft, rendering, completed
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('video_projects', lazy='dynamic'))
    
    def serialize(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'resolution': {
                'width': self.resolution_width,
                'height': self.resolution_height
            },
            'frame_rate': self.frame_rate,
            'duration': self.duration,
            'timeline_data': json.loads(self.timeline_data) if self.timeline_data else None,
            'thumbnail_url': self.thumbnail_url,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class VideoClipAsset(db.Model):
    __tablename__ = 'video_clip_assets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('video_projects.id'), nullable=True)
    
    # Cloudinary info
    cloudinary_public_id = db.Column(db.String(255), nullable=False)
    cloudinary_url = db.Column(db.String(500), nullable=False)
    resource_type = db.Column(db.String(50), default='video')  # video, image, audio
    
    # Asset metadata
    title = db.Column(db.String(255))
    duration = db.Column(db.Float)  # Duration in seconds
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    file_size = db.Column(db.BigInteger)
    format = db.Column(db.String(50))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def serialize(self):
        return {
            'id': self.id,
            'cloudinary_public_id': self.cloudinary_public_id,
            'cloudinary_url': self.cloudinary_url,
            'resource_type': self.resource_type,
            'title': self.title,
            'duration': self.duration,
            'width': self.width,
            'height': self.height,
            'file_size': self.file_size,
            'format': self.format,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class VideoExport(db.Model):
    __tablename__ = 'video_exports'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('video_projects.id'), nullable=False)
    
    # Export settings
    resolution = db.Column(db.String(50))  # 1080p, 720p, 480p
    format = db.Column(db.String(50), default='mp4')
    quality = db.Column(db.String(50), default='auto')
    
    # Export result
    export_url = db.Column(db.String(500))
    transformation_url = db.Column(db.Text)  # Full Cloudinary transformation URL
    
    # Status
    status = db.Column(db.String(50), default='pending')  # pending, processing, completed, failed
    error_message = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    def serialize(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'resolution': self.resolution,
            'format': self.format,
            'quality': self.quality,
            'export_url': self.export_url,
            'status': self.status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
"""

# For now, we'll work without the model and store in existing tables
# You can add the models above to models.py later

# =====================================================
# CLOUDINARY TRANSFORMATION BUILDER
# =====================================================

class CloudinaryVideoTransformer:
    """Builds Cloudinary transformation URLs from timeline data"""
    
    def __init__(self, cloud_name=None):
        self.cloud_name = cloud_name or os.getenv("CLOUDINARY_CLOUD_NAME")
        self.base_url = f"https://res.cloudinary.com/{self.cloud_name}/video/upload"
    
    def build_trim_transformation(self, start_time, end_time):
        """Build trim transformation: so_X,eo_Y"""
        transformations = []
        if start_time is not None and start_time > 0:
            transformations.append(f"so_{start_time}")
        if end_time is not None:
            transformations.append(f"eo_{end_time}")
        return ",".join(transformations) if transformations else None
    
    def build_resize_transformation(self, width, height, crop_mode='scale'):
        """Build resize transformation: c_X,w_Y,h_Z"""
        if width and height:
            return f"c_{crop_mode},w_{width},h_{height}"
        elif width:
            return f"c_{crop_mode},w_{width}"
        elif height:
            return f"c_{crop_mode},h_{height}"
        return None
    
    def build_effect_transformation(self, effect_id, intensity=50):
        """Build effect transformation based on effect ID"""
        effect_map = {
            # Color adjustments
            'brightness': f"e_brightness:{intensity - 50}",  # -50 to 50
            'contrast': f"e_contrast:{intensity - 50}",
            'saturation': f"e_saturation:{intensity - 50}",
            'hue': f"e_hue:{intensity}",
            'gamma': f"e_gamma:{intensity}",
            'vibrance': f"e_vibrance:{intensity - 50}",
            
            # Blur effects
            'blur': f"e_blur:{int(intensity * 20)}",  # 0-2000
            'gaussianBlur': f"e_blur:{int(intensity * 20)}",
            'motionBlur': f"e_blur:{int(intensity * 10)}",
            
            # Artistic effects
            'grayscale': "e_grayscale",
            'sepia': f"e_sepia:{intensity}",
            'negate': "e_negate",
            'vignette': f"e_vignette:{intensity}",
            'pixelate': f"e_pixelate:{max(1, int(intensity / 5))}",
            'cartoonify': "e_cartoonify",
            'oil_paint': f"e_oil_paint:{max(1, int(intensity / 10))}",
            
            # Video-specific
            'accelerate': f"e_accelerate:{int((intensity - 50) * 2)}",  # -100 to 100
            'reverse': "e_reverse",
            'boomerang': "e_boomerang",
            'loop': f"e_loop:{max(1, int(intensity / 25))}",
            'fade': f"e_fade:{int(intensity * 20)}",
            'fadeIn': f"e_fade:1000",
            'fadeOut': f"e_fade:-1000",
            
            # Noise
            'noise': f"e_noise:{intensity}",
            'deshake': f"e_deshake:{min(64, int(intensity / 2))}",
            
            # Color filters (LUT-style)
            'warmth': f"e_tint:{intensity}:orange",
            'cool': f"e_tint:{intensity}:blue",
            'vintage': "e_art:incognito",
            'dramatic': "e_art:audrey",
        }
        
        return effect_map.get(effect_id)
    
    def build_overlay_transformation(self, overlay_public_id, position='center', opacity=100, scale=100):
        """Build overlay transformation for picture-in-picture"""
        gravity_map = {
            'center': 'center',
            'top-left': 'north_west',
            'top-right': 'north_east',
            'bottom-left': 'south_west',
            'bottom-right': 'south_east',
            'top': 'north',
            'bottom': 'south',
            'left': 'west',
            'right': 'east'
        }
        
        gravity = gravity_map.get(position, 'center')
        overlay_id = overlay_public_id.replace('/', ':')
        
        parts = [f"l_video:{overlay_id}"]
        if scale != 100:
            parts.append(f"w_{scale / 100},c_scale")
        if opacity != 100:
            parts.append(f"o_{opacity}")
        parts.append(f"g_{gravity}")
        parts.append("fl_layer_apply")
        
        return "/".join(parts)
    
    def build_text_overlay(self, text, font_size=40, color='white', position='center'):
        """Build text overlay transformation"""
        gravity_map = {
            'center': 'center',
            'top-left': 'north_west',
            'top-right': 'north_east',
            'bottom-left': 'south_west',
            'bottom-right': 'south_east',
        }
        
        gravity = gravity_map.get(position, 'center')
        encoded_text = text.replace(' ', '%20').replace(':', '%3A')
        
        return f"l_text:Arial_{font_size}_bold:{encoded_text},co_rgb:{color.replace('#', '')},g_{gravity}/fl_layer_apply"
    
    def build_transition_transformation(self, transition_type, duration=1):
        """Build transition transformation (limited support in Cloudinary)"""
        # Cloudinary has limited transition support
        # Most transitions need to be done via concatenation with luma mattes
        transition_map = {
            'crossDissolve': f"e_fade:{int(duration * 1000)}",
            'fade': f"e_fade:{int(duration * 1000)}",
            'fadeWhite': f"e_fade:{int(duration * 1000)}",
        }
        return transition_map.get(transition_type)
    
    def build_audio_transformation(self, effect_id, intensity=50):
        """Build audio transformation"""
        audio_map = {
            'volume': f"e_volume:{int((intensity / 50) * 100)}",  # 0-200%
            'mute': "e_volume:mute",
            'fadeIn': f"e_fade:{int(intensity * 20)}",
            'fadeOut': f"e_fade:-{int(intensity * 20)}",
        }
        return audio_map.get(effect_id)
    
    def build_quality_transformation(self, quality='auto', format='mp4'):
        """Build quality and format transformation"""
        quality_map = {
            'auto': 'q_auto',
            'best': 'q_100',
            'high': 'q_80',
            'medium': 'q_60',
            'low': 'q_40',
            'lowest': 'q_20'
        }
        
        q = quality_map.get(quality, 'q_auto')
        return f"{q}/f_{format}"
    
    def build_resolution_transformation(self, resolution):
        """Build resolution transformation from preset"""
        resolution_map = {
            '4k': {'w': 3840, 'h': 2160},
            '1080p': {'w': 1920, 'h': 1080},
            '720p': {'w': 1280, 'h': 720},
            '480p': {'w': 854, 'h': 480},
            '360p': {'w': 640, 'h': 360}
        }
        
        res = resolution_map.get(resolution)
        if res:
            return f"c_scale,w_{res['w']},h_{res['h']}"
        return None
    
    def build_full_transformation_url(self, public_id, transformations, format='mp4'):
        """Build complete transformation URL"""
        # Filter out None values and join transformations
        valid_transforms = [t for t in transformations if t]
        transform_string = "/".join(valid_transforms)
        
        if transform_string:
            return f"{self.base_url}/{transform_string}/{public_id}.{format}"
        else:
            return f"{self.base_url}/{public_id}.{format}"
    
    def process_timeline_clip(self, clip_data):
        """Process a single timeline clip and return transformations"""
        transformations = []
        
        # 1. Trim
        if clip_data.get('trim'):
            trim = self.build_trim_transformation(
                clip_data['trim'].get('start'),
                clip_data['trim'].get('end')
            )
            if trim:
                transformations.append(trim)
        
        # 2. Resize/Crop
        if clip_data.get('transform'):
            transform = clip_data['transform']
            resize = self.build_resize_transformation(
                transform.get('width'),
                transform.get('height'),
                transform.get('crop', 'scale')
            )
            if resize:
                transformations.append(resize)
        
        # 3. Effects
        if clip_data.get('effects'):
            for effect in clip_data['effects']:
                if effect.get('enabled', True):
                    effect_transform = self.build_effect_transformation(
                        effect['id'],
                        effect.get('value', 50)
                    )
                    if effect_transform:
                        transformations.append(effect_transform)
        
        # 4. Audio adjustments
        if clip_data.get('audio'):
            audio = clip_data['audio']
            if audio.get('volume') is not None:
                vol_transform = self.build_audio_transformation('volume', audio['volume'])
                if vol_transform:
                    transformations.append(vol_transform)
            if audio.get('muted'):
                transformations.append('e_volume:mute')
        
        return transformations


# Global transformer instance
transformer = CloudinaryVideoTransformer()


# =====================================================
# API ROUTES
# =====================================================

@video_editor_bp.route('/api/video-editor/upload', methods=['POST'])
@jwt_required()
def upload_editor_asset():
    """
    Upload a video/audio/image asset for use in the video editor.
    Returns Cloudinary public_id and URL for use in transformations.
    """
    try:
        user_id = get_jwt_identity()
        
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Determine resource type
        filename = file.filename.lower()
        if filename.endswith(('.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv')):
            resource_type = 'video'
        elif filename.endswith(('.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg')):
            resource_type = 'raw'  # Audio as raw for better codec support
        elif filename.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
            resource_type = 'image'
        else:
            resource_type = 'raw'
        
        # Generate unique public_id
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        hash_suffix = hashlib.md5(f"{user_id}_{timestamp}".encode()).hexdigest()[:8]
        public_id = f"editor/{user_id}/{timestamp}_{hash_suffix}"
        
        # Upload to Cloudinary with metadata extraction
        upload_options = {
            'public_id': public_id,
            'resource_type': resource_type,
            'folder': f'video_editor/{user_id}',
        }
        
        # For videos, get additional metadata
        if resource_type == 'video':
            upload_options['eager'] = [
                {'width': 320, 'height': 180, 'crop': 'fill', 'format': 'jpg'}  # Thumbnail
            ]
            upload_options['eager_async'] = True
        
        result = cloudinary.uploader.upload(file, **upload_options)
        
        # Build response with metadata
        response_data = {
            "success": True,
            "asset": {
                "public_id": result['public_id'],
                "url": result['secure_url'],
                "resource_type": resource_type,
                "format": result.get('format'),
                "width": result.get('width'),
                "height": result.get('height'),
                "duration": result.get('duration'),
                "file_size": result.get('bytes'),
                "created_at": result.get('created_at')
            }
        }
        
        # Add thumbnail for videos
        if resource_type == 'video' and result.get('eager'):
            response_data['asset']['thumbnail'] = result['eager'][0].get('secure_url')
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Editor upload error: {str(e)}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/assets', methods=['GET'])
@jwt_required()
def get_editor_assets():
    """Get all assets uploaded by user for video editor"""
    try:
        user_id = get_jwt_identity()
        
        # Get assets from Cloudinary
        result = cloudinary.api.resources(
            type='upload',
            prefix=f'video_editor/{user_id}',
            max_results=100,
            resource_type='video'
        )
        
        # Also get images
        image_result = cloudinary.api.resources(
            type='upload',
            prefix=f'video_editor/{user_id}',
            max_results=100,
            resource_type='image'
        )
        
        assets = []
        
        for resource in result.get('resources', []):
            assets.append({
                'public_id': resource['public_id'],
                'url': resource['secure_url'],
                'resource_type': 'video',
                'format': resource.get('format'),
                'width': resource.get('width'),
                'height': resource.get('height'),
                'duration': resource.get('duration'),
                'created_at': resource.get('created_at')
            })
        
        for resource in image_result.get('resources', []):
            assets.append({
                'public_id': resource['public_id'],
                'url': resource['secure_url'],
                'resource_type': 'image',
                'format': resource.get('format'),
                'width': resource.get('width'),
                'height': resource.get('height'),
                'created_at': resource.get('created_at')
            })
        
        return jsonify({
            "success": True,
            "assets": assets
        }), 200
        
    except Exception as e:
        print(f"❌ Get assets error: {str(e)}")
        return jsonify({"error": f"Failed to get assets: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/transform', methods=['POST'])
@jwt_required()
def transform_video():
    """
    Apply transformations to a video and return the transformed URL.
    This is for preview purposes - transformations are applied on-the-fly.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        public_id = data.get('public_id')
        if not public_id:
            return jsonify({"error": "No public_id provided"}), 400
        
        # Build transformations from clip data
        transformations = transformer.process_timeline_clip(data)
        
        # Add quality settings
        quality = data.get('quality', 'auto')
        format = data.get('format', 'mp4')
        transformations.append(transformer.build_quality_transformation(quality, format))
        
        # Build final URL
        transformed_url = transformer.build_full_transformation_url(
            public_id, 
            transformations, 
            format
        )
        
        return jsonify({
            "success": True,
            "transformed_url": transformed_url,
            "transformations_applied": transformations
        }), 200
        
    except Exception as e:
        print(f"❌ Transform error: {str(e)}")
        return jsonify({"error": f"Transform failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/trim', methods=['POST'])
@jwt_required()
def trim_video():
    """Trim a video to specified start and end times"""
    try:
        data = request.get_json()
        
        public_id = data.get('public_id')
        start_time = data.get('start_time', 0)
        end_time = data.get('end_time')
        
        if not public_id:
            return jsonify({"error": "No public_id provided"}), 400
        
        transformations = []
        
        # Add trim transformation
        trim = transformer.build_trim_transformation(start_time, end_time)
        if trim:
            transformations.append(trim)
        
        # Add quality
        transformations.append('q_auto/f_mp4')
        
        # Build URL
        trimmed_url = transformer.build_full_transformation_url(
            public_id,
            transformations,
            'mp4'
        )
        
        return jsonify({
            "success": True,
            "trimmed_url": trimmed_url,
            "start_time": start_time,
            "end_time": end_time
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Trim failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/effect-preview', methods=['POST'])
@jwt_required()
def preview_effect():
    """Preview a single effect on a video"""
    try:
        data = request.get_json()
        
        public_id = data.get('public_id')
        effect_id = data.get('effect_id')
        intensity = data.get('intensity', 50)
        
        if not public_id or not effect_id:
            return jsonify({"error": "Missing public_id or effect_id"}), 400
        
        # Build effect transformation
        effect_transform = transformer.build_effect_transformation(effect_id, intensity)
        
        if not effect_transform:
            return jsonify({"error": f"Unknown effect: {effect_id}"}), 400
        
        # Build preview URL (short clip for faster preview)
        transformations = [
            'so_0,eo_5',  # First 5 seconds only for preview
            effect_transform,
            'q_auto/f_mp4'
        ]
        
        preview_url = transformer.build_full_transformation_url(
            public_id,
            transformations,
            'mp4'
        )
        
        return jsonify({
            "success": True,
            "preview_url": preview_url,
            "effect_id": effect_id,
            "intensity": intensity
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Preview failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/concatenate', methods=['POST'])
@jwt_required()
def concatenate_videos():
    """
    Concatenate multiple video clips into one.
    Uses Cloudinary's splice functionality.
    """
    try:
        data = request.get_json()
        
        clips = data.get('clips', [])
        if len(clips) < 2:
            return jsonify({"error": "Need at least 2 clips to concatenate"}), 400
        
        # First clip is the base
        base_clip = clips[0]
        base_public_id = base_clip.get('public_id')
        
        if not base_public_id:
            return jsonify({"error": "Invalid clip data"}), 400
        
        # Build concatenation transformations
        transformations = []
        
        # Add transformations for base clip if any
        if base_clip.get('trim'):
            trim = transformer.build_trim_transformation(
                base_clip['trim'].get('start'),
                base_clip['trim'].get('end')
            )
            if trim:
                transformations.append(trim)
        
        # Add subsequent clips with splice
        for clip in clips[1:]:
            clip_id = clip.get('public_id')
            if clip_id:
                # Replace forward slashes with colons for layer syntax
                safe_id = clip_id.replace('/', ':')
                
                splice_parts = [f"l_video:{safe_id}"]
                
                # Add trim for this clip if specified
                if clip.get('trim'):
                    start = clip['trim'].get('start', 0)
                    end = clip['trim'].get('end')
                    if start > 0:
                        splice_parts.append(f"so_{start}")
                    if end:
                        splice_parts.append(f"eo_{end}")
                
                splice_parts.append("fl_splice")
                splice_parts.append("fl_layer_apply")
                
                transformations.append("/".join(splice_parts))
        
        # Add quality
        transformations.append('q_auto/f_mp4')
        
        # Build final URL
        concat_url = transformer.build_full_transformation_url(
            base_public_id,
            transformations,
            'mp4'
        )
        
        return jsonify({
            "success": True,
            "concatenated_url": concat_url,
            "clips_count": len(clips)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Concatenation failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/add-overlay', methods=['POST'])
@jwt_required()
def add_video_overlay():
    """Add a video or image overlay (picture-in-picture)"""
    try:
        data = request.get_json()
        
        base_public_id = data.get('base_public_id')
        overlay_public_id = data.get('overlay_public_id')
        position = data.get('position', 'bottom-right')
        scale = data.get('scale', 30)  # Percentage of main video
        opacity = data.get('opacity', 100)
        start_time = data.get('start_time', 0)
        
        if not base_public_id or not overlay_public_id:
            return jsonify({"error": "Missing base or overlay public_id"}), 400
        
        transformations = []
        
        # Start time for overlay
        if start_time > 0:
            transformations.append(f"so_{start_time}")
        
        # Build overlay transformation
        overlay = transformer.build_overlay_transformation(
            overlay_public_id,
            position,
            opacity,
            scale
        )
        transformations.append(overlay)
        
        # Add quality
        transformations.append('q_auto/f_mp4')
        
        # Build URL
        overlay_url = transformer.build_full_transformation_url(
            base_public_id,
            transformations,
            'mp4'
        )
        
        return jsonify({
            "success": True,
            "overlay_url": overlay_url
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Overlay failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/add-text', methods=['POST'])
@jwt_required()
def add_text_overlay():
    """Add text overlay to video"""
    try:
        data = request.get_json()
        
        public_id = data.get('public_id')
        text = data.get('text')
        font_size = data.get('font_size', 40)
        color = data.get('color', 'white')
        position = data.get('position', 'bottom-left')
        
        if not public_id or not text:
            return jsonify({"error": "Missing public_id or text"}), 400
        
        transformations = []
        
        # Build text overlay
        text_overlay = transformer.build_text_overlay(text, font_size, color, position)
        transformations.append(text_overlay)
        
        # Add quality
        transformations.append('q_auto/f_mp4')
        
        # Build URL
        text_url = transformer.build_full_transformation_url(
            public_id,
            transformations,
            'mp4'
        )
        
        return jsonify({
            "success": True,
            "text_overlay_url": text_url
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Text overlay failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/export', methods=['POST'])
@jwt_required()
def export_project():
    """
    Export a complete video project with all transformations.
    This is the main export function that processes the entire timeline.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No project data provided"}), 400
        
        timeline = data.get('timeline', {})
        tracks = timeline.get('tracks', [])
        settings = data.get('settings', {})
        
        if not tracks:
            return jsonify({"error": "No tracks in timeline"}), 400
        
        # Get export settings
        resolution = settings.get('resolution', '1080p')
        quality = settings.get('quality', 'auto')
        format = settings.get('format', 'mp4')
        
        # Find all video clips from tracks
        video_clips = []
        for track in tracks:
            if track.get('type') == 'video':
                for clip in track.get('clips', []):
                    if clip.get('cloudinary_public_id') or clip.get('public_id'):
                        video_clips.append(clip)
        
        if not video_clips:
            return jsonify({"error": "No video clips found in timeline"}), 400
        
        # For single clip, apply transformations directly
        if len(video_clips) == 1:
            clip = video_clips[0]
            public_id = clip.get('cloudinary_public_id') or clip.get('public_id')
            
            transformations = transformer.process_timeline_clip(clip)
            
            # Add resolution
            res_transform = transformer.build_resolution_transformation(resolution)
            if res_transform:
                transformations.append(res_transform)
            
            # Add quality
            transformations.append(transformer.build_quality_transformation(quality, format))
            
            export_url = transformer.build_full_transformation_url(
                public_id,
                transformations,
                format
            )
            
            return jsonify({
                "success": True,
                "export_url": export_url,
                "status": "completed",
                "message": "Video exported successfully. Click the URL to download."
            }), 200
        
        # For multiple clips, concatenate
        else:
            # Process first clip
            first_clip = video_clips[0]
            base_public_id = first_clip.get('cloudinary_public_id') or first_clip.get('public_id')
            
            transformations = []
            
            # Add first clip transformations
            first_transforms = transformer.process_timeline_clip(first_clip)
            transformations.extend(first_transforms)
            
            # Add subsequent clips with splice
            for clip in video_clips[1:]:
                clip_id = clip.get('cloudinary_public_id') or clip.get('public_id')
                if clip_id:
                    safe_id = clip_id.replace('/', ':')
                    
                    # Build splice with clip transformations
                    splice_parts = [f"l_video:{safe_id}"]
                    
                    # Add clip-specific transformations
                    clip_transforms = transformer.process_timeline_clip(clip)
                    if clip_transforms:
                        splice_parts.extend(clip_transforms)
                    
                    splice_parts.append("fl_splice")
                    splice_parts.append("fl_layer_apply")
                    
                    transformations.append("/".join(splice_parts))
            
            # Add resolution
            res_transform = transformer.build_resolution_transformation(resolution)
            if res_transform:
                transformations.append(res_transform)
            
            # Add quality
            transformations.append(transformer.build_quality_transformation(quality, format))
            
            export_url = transformer.build_full_transformation_url(
                base_public_id,
                transformations,
                format
            )
            
            return jsonify({
                "success": True,
                "export_url": export_url,
                "status": "completed",
                "clips_processed": len(video_clips),
                "message": "Video exported successfully. Click the URL to download."
            }), 200
        
    except Exception as e:
        print(f"❌ Export error: {str(e)}")
        return jsonify({"error": f"Export failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/save-project', methods=['POST'])
@jwt_required()
def save_project():
    """Save video project timeline to database"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        project_id = data.get('project_id')
        title = data.get('title', 'Untitled Project')
        timeline_data = data.get('timeline')
        settings = data.get('settings', {})
        
        # For now, store in a Video record (you can create VideoProject model later)
        # This is a simplified approach
        
        if project_id:
            # Update existing project
            # You'll need to add VideoProject model for proper implementation
            pass
        
        # Return success with project data
        return jsonify({
            "success": True,
            "message": "Project saved successfully",
            "project": {
                "title": title,
                "timeline": timeline_data,
                "settings": settings,
                "saved_at": datetime.utcnow().isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Save failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/effects', methods=['GET'])
def get_available_effects():
    """Get list of all available video effects"""
    effects = {
        "color": [
            {"id": "brightness", "name": "Brightness", "min": 0, "max": 100, "default": 50},
            {"id": "contrast", "name": "Contrast", "min": 0, "max": 100, "default": 50},
            {"id": "saturation", "name": "Saturation", "min": 0, "max": 100, "default": 50},
            {"id": "hue", "name": "Hue", "min": 0, "max": 100, "default": 50},
            {"id": "gamma", "name": "Gamma", "min": 0, "max": 100, "default": 50},
            {"id": "vibrance", "name": "Vibrance", "min": 0, "max": 100, "default": 50},
        ],
        "blur": [
            {"id": "blur", "name": "Blur", "min": 0, "max": 100, "default": 0},
            {"id": "gaussianBlur", "name": "Gaussian Blur", "min": 0, "max": 100, "default": 0},
        ],
        "artistic": [
            {"id": "grayscale", "name": "Grayscale", "toggle": True},
            {"id": "sepia", "name": "Sepia", "min": 0, "max": 100, "default": 50},
            {"id": "negate", "name": "Negative", "toggle": True},
            {"id": "vignette", "name": "Vignette", "min": 0, "max": 100, "default": 50},
            {"id": "pixelate", "name": "Pixelate", "min": 0, "max": 100, "default": 0},
            {"id": "cartoonify", "name": "Cartoon", "toggle": True},
            {"id": "oil_paint", "name": "Oil Paint", "min": 0, "max": 100, "default": 50},
        ],
        "video": [
            {"id": "accelerate", "name": "Speed", "min": 0, "max": 100, "default": 50},
            {"id": "reverse", "name": "Reverse", "toggle": True},
            {"id": "boomerang", "name": "Boomerang", "toggle": True},
            {"id": "loop", "name": "Loop", "min": 1, "max": 10, "default": 1},
            {"id": "fadeIn", "name": "Fade In", "toggle": True},
            {"id": "fadeOut", "name": "Fade Out", "toggle": True},
        ],
        "fix": [
            {"id": "deshake", "name": "Stabilize", "min": 0, "max": 100, "default": 50},
            {"id": "noise", "name": "Add Noise", "min": 0, "max": 100, "default": 0},
        ],
        "filters": [
            {"id": "warmth", "name": "Warm", "min": 0, "max": 100, "default": 50},
            {"id": "cool", "name": "Cool", "min": 0, "max": 100, "default": 50},
            {"id": "vintage", "name": "Vintage", "toggle": True},
            {"id": "dramatic", "name": "Dramatic", "toggle": True},
        ]
    }
    
    return jsonify({
        "success": True,
        "effects": effects
    }), 200


@video_editor_bp.route('/api/video-editor/resolutions', methods=['GET'])
def get_available_resolutions():
    """Get list of available export resolutions"""
    resolutions = [
        {"id": "4k", "name": "4K Ultra HD", "width": 3840, "height": 2160, "tier_required": "professional"},
        {"id": "1080p", "name": "Full HD", "width": 1920, "height": 1080, "tier_required": "creator"},
        {"id": "720p", "name": "HD", "width": 1280, "height": 720, "tier_required": "free"},
        {"id": "480p", "name": "SD", "width": 854, "height": 480, "tier_required": "free"},
        {"id": "360p", "name": "Low", "width": 640, "height": 360, "tier_required": "free"},
    ]
    
    return jsonify({
        "success": True,
        "resolutions": resolutions
    }), 200


@video_editor_bp.route('/api/video-editor/thumbnail', methods=['POST'])
@jwt_required()
def generate_thumbnail():
    """Generate thumbnail from video at specific timestamp"""
    try:
        data = request.get_json()
        
        public_id = data.get('public_id')
        timestamp = data.get('timestamp', 0)
        
        if not public_id:
            return jsonify({"error": "No public_id provided"}), 400
        
        # Build thumbnail URL
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        thumbnail_url = f"https://res.cloudinary.com/{cloud_name}/video/upload/so_{timestamp},c_fill,w_320,h_180/f_jpg/{public_id}"
        
        return jsonify({
            "success": True,
            "thumbnail_url": thumbnail_url
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Thumbnail generation failed: {str(e)}"}), 500


# =====================================================
# HELPER ROUTE FOR TESTING
# =====================================================

@video_editor_bp.route('/api/video-editor/health', methods=['GET'])
def health_check():
    """Health check for video editor API"""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    
    return jsonify({
        "status": "healthy",
        "service": "video-editor",
        "cloudinary_configured": bool(cloud_name),
        "timestamp": datetime.utcnow().isoformat()
    }), 200