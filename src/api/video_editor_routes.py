# src/api/video_editor_routes.py
# =====================================================
# VIDEO EDITOR API ROUTES - Cloudinary Integration
# =====================================================
# UPDATED: Full navbar functionality with project management,
# markers, clip operations, and track management
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
import uuid

# Import your models - adjust path if needed
from src.api.models import db, User, Video, VideoProject, VideoClipAsset, VideoExport

video_editor_bp = Blueprint('video_editor', __name__)


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
    
    def build_fps_transformation(self, frame_rate):
        """Build frame rate transformation: fps_X"""
        valid_frame_rates = [24, 25, 30, 48, 60]
        if frame_rate and frame_rate in valid_frame_rates:
            return f"fps_{frame_rate}"
        return None
    
    def build_effect_transformation(self, effect_id, intensity=50):
        """Build effect transformation based on effect ID"""
        effect_map = {
            # Color adjustments
            'brightness': f"e_brightness:{intensity - 50}",
            'contrast': f"e_contrast:{intensity - 50}",
            'saturation': f"e_saturation:{intensity - 50}",
            'hue': f"e_hue:{intensity}",
            'gamma': f"e_gamma:{intensity}",
            'vibrance': f"e_vibrance:{intensity - 50}",
            
            # Blur effects
            'blur': f"e_blur:{int(intensity * 20)}",
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
            'accelerate': f"e_accelerate:{int((intensity - 50) * 2)}",
            'reverse': "e_reverse",
            'boomerang': "e_boomerang",
            'loop': f"e_loop:{max(1, int(intensity / 25))}",
            'fade': f"e_fade:{int(intensity * 20)}",
            'fadeIn': f"e_fade:1000",
            'fadeOut': f"e_fade:-1000",
            
            # Noise
            'noise': f"e_noise:{intensity}",
            'deshake': f"e_deshake:{min(64, int(intensity / 2))}",
            
            # Color filters
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
        """Build transition transformation"""
        transition_map = {
            'crossDissolve': f"e_fade:{int(duration * 1000)}",
            'fade': f"e_fade:{int(duration * 1000)}",
            'fadeWhite': f"e_fade:{int(duration * 1000)}",
        }
        return transition_map.get(transition_type)
    
    def build_audio_transformation(self, effect_id, intensity=50):
        """Build audio transformation"""
        audio_map = {
            'volume': f"e_volume:{int((intensity / 50) * 100)}",
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
    
    def build_resolution_transformation(self, resolution, frame_rate=None):
        """Build resolution transformation from preset, optionally with frame rate"""
        resolution_map = {
            '4k': {'w': 3840, 'h': 2160},
            '1080p': {'w': 1920, 'h': 1080},
            '720p': {'w': 1280, 'h': 720},
            '480p': {'w': 854, 'h': 480},
            '360p': {'w': 640, 'h': 360}
        }
        
        res = resolution_map.get(resolution)
        if res:
            base_transform = f"c_scale,w_{res['w']},h_{res['h']}"
            if frame_rate:
                fps_transform = self.build_fps_transformation(frame_rate)
                if fps_transform:
                    return f"{base_transform},{fps_transform}"
            return base_transform
        return None
    
    def build_full_transformation_url(self, public_id, transformations, format='mp4'):
        """Build complete transformation URL"""
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
# HELPER FUNCTIONS
# =====================================================

def get_or_create_project(user_id, project_id=None):
    """Get existing project or create new one"""
    if project_id:
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        if project:
            return project
    return None


def serialize_project(project):
    """Serialize a VideoProject to dict"""
    timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
    if isinstance(project.timeline_data, str):
        try:
            timeline_data = json.loads(project.timeline_data)
        except:
            timeline_data = {}
    
    return {
        'id': project.id,
        'title': project.title,
        'description': project.description,
        'timeline_data': timeline_data,
        'settings': timeline_data.get('settings', {}),
        'markers': timeline_data.get('markers', []),
        'duration': project.duration,
        'thumbnail_url': project.thumbnail_url,
        'created_at': project.created_at.isoformat() if project.created_at else None,
        'updated_at': project.updated_at.isoformat() if project.updated_at else None
    }


# =====================================================
# PROJECT MANAGEMENT ROUTES
# =====================================================

@video_editor_bp.route('/api/video-editor/projects', methods=['GET'])
@jwt_required()
def get_projects():
    """Get all video editor projects for current user"""
    try:
        user_id = get_jwt_identity()
        
        projects = VideoProject.query.filter_by(user_id=user_id)\
            .order_by(desc(VideoProject.updated_at))\
            .all()
        
        return jsonify({
            'success': True,
            'projects': [serialize_project(p) for p in projects]
        }), 200
        
    except Exception as e:
        print(f"❌ Get projects error: {str(e)}")
        return jsonify({'error': f'Failed to get projects: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects', methods=['POST'])
@jwt_required()
def create_project():
    """Create a new video editor project"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}
        
        title = data.get('title', 'Untitled Project')
        description = data.get('description', '')
        
        # Default timeline structure
        default_timeline = {
            'tracks': [
                {'id': 'video-1', 'name': 'Video 1', 'type': 'video', 'clips': []},
                {'id': 'video-2', 'name': 'Video 2', 'type': 'video', 'clips': []},
                {'id': 'audio-1', 'name': 'Audio 1', 'type': 'audio', 'clips': []},
                {'id': 'audio-2', 'name': 'Audio 2', 'type': 'audio', 'clips': []}
            ],
            'markers': [],
            'settings': {
                'width': data.get('width', 1920),
                'height': data.get('height', 1080),
                'frameRate': data.get('frameRate', 30),
                'duration': 0
            }
        }
        
        project = VideoProject(
            user_id=user_id,
            title=title,
            description=description,
            timeline_data=default_timeline,
            duration=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.session.add(project)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Project created successfully',
            'project': serialize_project(project)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Create project error: {str(e)}")
        return jsonify({'error': f'Failed to create project: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """Get a specific video editor project"""
    try:
        user_id = get_jwt_identity()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        return jsonify({
            'success': True,
            'project': serialize_project(project)
        }), 200
        
    except Exception as e:
        print(f"❌ Get project error: {str(e)}")
        return jsonify({'error': f'Failed to get project: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    """Update/save a video editor project"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Update fields
        if 'title' in data:
            project.title = data['title']
        if 'description' in data:
            project.description = data['description']
        if 'timeline' in data or 'timeline_data' in data:
            timeline = data.get('timeline') or data.get('timeline_data')
            project.timeline_data = timeline
        if 'duration' in data:
            project.duration = data['duration']
        if 'thumbnail_url' in data:
            project.thumbnail_url = data['thumbnail_url']
        
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Project saved successfully',
            'project': serialize_project(project)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Update project error: {str(e)}")
        return jsonify({'error': f'Failed to save project: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    """Delete a video editor project"""
    try:
        user_id = get_jwt_identity()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        db.session.delete(project)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Project deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Delete project error: {str(e)}")
        return jsonify({'error': f'Failed to delete project: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/duplicate', methods=['POST'])
@jwt_required()
def duplicate_project(project_id):
    """Duplicate/Save As a video editor project"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}
        
        # Get original project
        original = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not original:
            return jsonify({'error': 'Project not found'}), 404
        
        # Create duplicate
        new_title = data.get('title', f"{original.title} (Copy)")
        
        # Deep copy timeline data
        timeline_copy = json.loads(json.dumps(
            original.timeline_data if isinstance(original.timeline_data, dict) 
            else json.loads(original.timeline_data) if original.timeline_data else {}
        ))
        
        duplicate = VideoProject(
            user_id=user_id,
            title=new_title,
            description=original.description,
            timeline_data=timeline_copy,
            duration=original.duration,
            thumbnail_url=original.thumbnail_url,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.session.add(duplicate)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Project duplicated successfully',
            'project': serialize_project(duplicate)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Duplicate project error: {str(e)}")
        return jsonify({'error': f'Failed to duplicate project: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/recent-projects', methods=['GET'])
@jwt_required()
def get_recent_projects():
    """Get recent video editor projects"""
    try:
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        
        projects = VideoProject.query.filter_by(user_id=user_id)\
            .order_by(desc(VideoProject.updated_at))\
            .limit(limit)\
            .all()
        
        return jsonify({
            'success': True,
            'projects': [serialize_project(p) for p in projects]
        }), 200
        
    except Exception as e:
        print(f"❌ Get recent projects error: {str(e)}")
        return jsonify({'error': f'Failed to get recent projects: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/autosave', methods=['POST'])
@jwt_required()
def autosave_project(project_id):
    """Lightweight autosave endpoint - only updates timeline data"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Only update timeline and timestamp
        if 'timeline' in data or 'timeline_data' in data:
            timeline = data.get('timeline') or data.get('timeline_data')
            project.timeline_data = timeline
        
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Autosave successful',
            'saved_at': project.updated_at.isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Autosave error: {str(e)}")
        return jsonify({'error': f'Autosave failed: {str(e)}'}), 500


# =====================================================
# MARKERS ROUTES
# =====================================================

@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/markers', methods=['GET'])
@jwt_required()
def get_markers(project_id):
    """Get all markers for a project"""
    try:
        user_id = get_jwt_identity()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
        if isinstance(project.timeline_data, str):
            try:
                timeline_data = json.loads(project.timeline_data)
            except:
                timeline_data = {}
        
        markers = timeline_data.get('markers', [])
        
        return jsonify({
            'success': True,
            'markers': markers
        }), 200
        
    except Exception as e:
        print(f"❌ Get markers error: {str(e)}")
        return jsonify({'error': f'Failed to get markers: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/markers', methods=['POST'])
@jwt_required()
def add_marker(project_id):
    """Add a marker to a project"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Get current timeline data
        timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
        if isinstance(project.timeline_data, str):
            try:
                timeline_data = json.loads(project.timeline_data)
            except:
                timeline_data = {}
        
        # Ensure markers array exists
        if 'markers' not in timeline_data:
            timeline_data['markers'] = []
        
        # Create new marker
        new_marker = {
            'id': str(uuid.uuid4()),
            'time': data.get('time', 0),
            'label': data.get('label', ''),
            'color': data.get('color', '#FF6600'),
            'created_at': datetime.utcnow().isoformat()
        }
        
        timeline_data['markers'].append(new_marker)
        
        # Sort markers by time
        timeline_data['markers'].sort(key=lambda m: m['time'])
        
        project.timeline_data = timeline_data
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'marker': new_marker,
            'markers': timeline_data['markers']
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Add marker error: {str(e)}")
        return jsonify({'error': f'Failed to add marker: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/markers/<marker_id>', methods=['PUT'])
@jwt_required()
def update_marker(project_id, marker_id):
    """Update a marker"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
        if isinstance(project.timeline_data, str):
            try:
                timeline_data = json.loads(project.timeline_data)
            except:
                timeline_data = {}
        
        markers = timeline_data.get('markers', [])
        marker_found = False
        
        for marker in markers:
            if marker['id'] == marker_id:
                if 'time' in data:
                    marker['time'] = data['time']
                if 'label' in data:
                    marker['label'] = data['label']
                if 'color' in data:
                    marker['color'] = data['color']
                marker_found = True
                break
        
        if not marker_found:
            return jsonify({'error': 'Marker not found'}), 404
        
        # Re-sort markers
        timeline_data['markers'].sort(key=lambda m: m['time'])
        
        project.timeline_data = timeline_data
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'markers': timeline_data['markers']
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Update marker error: {str(e)}")
        return jsonify({'error': f'Failed to update marker: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/markers/<marker_id>', methods=['DELETE'])
@jwt_required()
def delete_marker(project_id, marker_id):
    """Delete a marker from a project"""
    try:
        user_id = get_jwt_identity()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
        if isinstance(project.timeline_data, str):
            try:
                timeline_data = json.loads(project.timeline_data)
            except:
                timeline_data = {}
        
        markers = timeline_data.get('markers', [])
        original_count = len(markers)
        
        timeline_data['markers'] = [m for m in markers if m['id'] != marker_id]
        
        if len(timeline_data['markers']) == original_count:
            return jsonify({'error': 'Marker not found'}), 404
        
        project.timeline_data = timeline_data
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Marker deleted',
            'markers': timeline_data['markers']
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Delete marker error: {str(e)}")
        return jsonify({'error': f'Failed to delete marker: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/markers/clear', methods=['DELETE'])
@jwt_required()
def clear_all_markers(project_id):
    """Clear all markers from a project"""
    try:
        user_id = get_jwt_identity()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
        if isinstance(project.timeline_data, str):
            try:
                timeline_data = json.loads(project.timeline_data)
            except:
                timeline_data = {}
        
        cleared_count = len(timeline_data.get('markers', []))
        timeline_data['markers'] = []
        
        project.timeline_data = timeline_data
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Cleared {cleared_count} markers',
            'markers': []
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Clear markers error: {str(e)}")
        return jsonify({'error': f'Failed to clear markers: {str(e)}'}), 500


# =====================================================
# CLIP OPERATIONS ROUTES
# =====================================================

@video_editor_bp.route('/api/video-editor/clips/split', methods=['POST'])
@jwt_required()
def split_clip():
    """Split a clip at a specific time"""
    try:
        data = request.get_json()
        
        clip = data.get('clip')
        split_time = data.get('split_time')
        
        if not clip or split_time is None:
            return jsonify({'error': 'Missing clip or split_time'}), 400
        
        clip_start = clip.get('startTime', 0)
        clip_end = clip.get('endTime', clip.get('duration', 0))
        
        if split_time <= clip_start or split_time >= clip_end:
            return jsonify({'error': 'Split time must be within clip bounds'}), 400
        
        # Create first clip (before split)
        first_clip = {
            **clip,
            'id': str(uuid.uuid4()),
            'endTime': split_time,
            'duration': split_time - clip_start,
            'trimEnd': clip.get('trimStart', 0) + (split_time - clip_start)
        }
        
        # Create second clip (after split)
        second_clip = {
            **clip,
            'id': str(uuid.uuid4()),
            'startTime': split_time,
            'duration': clip_end - split_time,
            'trimStart': clip.get('trimStart', 0) + (split_time - clip_start)
        }
        
        return jsonify({
            'success': True,
            'first_clip': first_clip,
            'second_clip': second_clip
        }), 200
        
    except Exception as e:
        print(f"❌ Split clip error: {str(e)}")
        return jsonify({'error': f'Failed to split clip: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/clips/trim', methods=['POST'])
@jwt_required()
def trim_clip():
    """Trim a clip with new in/out points"""
    try:
        data = request.get_json()
        
        clip = data.get('clip')
        in_point = data.get('in_point')
        out_point = data.get('out_point')
        
        if not clip:
            return jsonify({'error': 'Missing clip data'}), 400
        
        original_duration = clip.get('originalDuration', clip.get('duration', 0))
        
        # Validate trim points
        if in_point is not None and (in_point < 0 or in_point >= original_duration):
            return jsonify({'error': 'Invalid in_point'}), 400
        if out_point is not None and (out_point <= 0 or out_point > original_duration):
            return jsonify({'error': 'Invalid out_point'}), 400
        if in_point is not None and out_point is not None and in_point >= out_point:
            return jsonify({'error': 'in_point must be less than out_point'}), 400
        
        trimmed_clip = {**clip}
        
        if in_point is not None:
            trimmed_clip['trimStart'] = in_point
        if out_point is not None:
            trimmed_clip['trimEnd'] = out_point
        
        # Calculate new duration
        trim_start = trimmed_clip.get('trimStart', 0)
        trim_end = trimmed_clip.get('trimEnd', original_duration)
        trimmed_clip['duration'] = trim_end - trim_start
        
        return jsonify({
            'success': True,
            'clip': trimmed_clip
        }), 200
        
    except Exception as e:
        print(f"❌ Trim clip error: {str(e)}")
        return jsonify({'error': f'Failed to trim clip: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/clips/speed', methods=['POST'])
@jwt_required()
def change_clip_speed():
    """Change playback speed of a clip"""
    try:
        data = request.get_json()
        
        clip = data.get('clip')
        speed = data.get('speed', 1.0)
        
        if not clip:
            return jsonify({'error': 'Missing clip data'}), 400
        
        # Validate speed (0.1x to 10x)
        if speed < 0.1 or speed > 10:
            return jsonify({'error': 'Speed must be between 0.1 and 10'}), 400
        
        original_duration = clip.get('originalDuration', clip.get('duration', 0))
        
        modified_clip = {
            **clip,
            'speed': speed,
            'duration': original_duration / speed
        }
        
        return jsonify({
            'success': True,
            'clip': modified_clip
        }), 200
        
    except Exception as e:
        print(f"❌ Change speed error: {str(e)}")
        return jsonify({'error': f'Failed to change speed: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/clips/reverse', methods=['POST'])
@jwt_required()
def reverse_clip():
    """Reverse a clip"""
    try:
        data = request.get_json()
        
        clip = data.get('clip')
        
        if not clip:
            return jsonify({'error': 'Missing clip data'}), 400
        
        reversed_clip = {
            **clip,
            'reversed': not clip.get('reversed', False)
        }
        
        return jsonify({
            'success': True,
            'clip': reversed_clip
        }), 200
        
    except Exception as e:
        print(f"❌ Reverse clip error: {str(e)}")
        return jsonify({'error': f'Failed to reverse clip: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/clips/duplicate', methods=['POST'])
@jwt_required()
def duplicate_clip():
    """Duplicate a clip"""
    try:
        data = request.get_json()
        
        clip = data.get('clip')
        offset = data.get('offset', 0)
        
        if not clip:
            return jsonify({'error': 'Missing clip data'}), 400
        
        duplicated_clip = {
            **clip,
            'id': str(uuid.uuid4()),
            'startTime': clip.get('startTime', 0) + clip.get('duration', 0) + offset
        }
        
        return jsonify({
            'success': True,
            'clip': duplicated_clip
        }), 200
        
    except Exception as e:
        print(f"❌ Duplicate clip error: {str(e)}")
        return jsonify({'error': f'Failed to duplicate clip: {str(e)}'}), 500


# =====================================================
# TRACK MANAGEMENT ROUTES
# =====================================================

@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/tracks', methods=['GET'])
@jwt_required()
def get_tracks(project_id):
    """Get all tracks for a project"""
    try:
        user_id = get_jwt_identity()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
        if isinstance(project.timeline_data, str):
            try:
                timeline_data = json.loads(project.timeline_data)
            except:
                timeline_data = {}
        
        tracks = timeline_data.get('tracks', [])
        
        return jsonify({
            'success': True,
            'tracks': tracks
        }), 200
        
    except Exception as e:
        print(f"❌ Get tracks error: {str(e)}")
        return jsonify({'error': f'Failed to get tracks: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/tracks', methods=['POST'])
@jwt_required()
def add_track(project_id):
    """Add a new track to a project"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
        if isinstance(project.timeline_data, str):
            try:
                timeline_data = json.loads(project.timeline_data)
            except:
                timeline_data = {}
        
        if 'tracks' not in timeline_data:
            timeline_data['tracks'] = []
        
        track_type = data.get('type', 'video')
        
        # Count existing tracks of this type
        existing_count = sum(1 for t in timeline_data['tracks'] if t.get('type') == track_type)
        
        new_track = {
            'id': str(uuid.uuid4()),
            'name': data.get('name', f"{track_type.capitalize()} {existing_count + 1}"),
            'type': track_type,
            'clips': [],
            'muted': False,
            'locked': False,
            'visible': True
        }
        
        timeline_data['tracks'].append(new_track)
        
        project.timeline_data = timeline_data
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'track': new_track,
            'tracks': timeline_data['tracks']
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Add track error: {str(e)}")
        return jsonify({'error': f'Failed to add track: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/tracks/<track_id>', methods=['DELETE'])
@jwt_required()
def delete_track(project_id, track_id):
    """Delete a track from a project"""
    try:
        user_id = get_jwt_identity()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
        if isinstance(project.timeline_data, str):
            try:
                timeline_data = json.loads(project.timeline_data)
            except:
                timeline_data = {}
        
        tracks = timeline_data.get('tracks', [])
        original_count = len(tracks)
        
        timeline_data['tracks'] = [t for t in tracks if t['id'] != track_id]
        
        if len(timeline_data['tracks']) == original_count:
            return jsonify({'error': 'Track not found'}), 404
        
        project.timeline_data = timeline_data
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Track deleted',
            'tracks': timeline_data['tracks']
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Delete track error: {str(e)}")
        return jsonify({'error': f'Failed to delete track: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/tracks/delete-empty', methods=['DELETE'])
@jwt_required()
def delete_empty_tracks(project_id):
    """Delete all empty tracks from a project"""
    try:
        user_id = get_jwt_identity()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
        if isinstance(project.timeline_data, str):
            try:
                timeline_data = json.loads(project.timeline_data)
            except:
                timeline_data = {}
        
        tracks = timeline_data.get('tracks', [])
        original_count = len(tracks)
        
        # Keep tracks that have clips
        timeline_data['tracks'] = [t for t in tracks if len(t.get('clips', [])) > 0]
        
        # Ensure at least one video and one audio track remain
        has_video = any(t.get('type') == 'video' for t in timeline_data['tracks'])
        has_audio = any(t.get('type') == 'audio' for t in timeline_data['tracks'])
        
        if not has_video:
            timeline_data['tracks'].insert(0, {
                'id': str(uuid.uuid4()),
                'name': 'Video 1',
                'type': 'video',
                'clips': []
            })
        
        if not has_audio:
            timeline_data['tracks'].append({
                'id': str(uuid.uuid4()),
                'name': 'Audio 1',
                'type': 'audio',
                'clips': []
            })
        
        deleted_count = original_count - len(timeline_data['tracks'])
        
        project.timeline_data = timeline_data
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Deleted {deleted_count} empty tracks',
            'deleted_count': deleted_count,
            'tracks': timeline_data['tracks']
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Delete empty tracks error: {str(e)}")
        return jsonify({'error': f'Failed to delete empty tracks: {str(e)}'}), 500


# =====================================================
# PROJECT SETTINGS ROUTES
# =====================================================

@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/settings', methods=['GET'])
@jwt_required()
def get_project_settings(project_id):
    """Get project settings"""
    try:
        user_id = get_jwt_identity()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
        if isinstance(project.timeline_data, str):
            try:
                timeline_data = json.loads(project.timeline_data)
            except:
                timeline_data = {}
        
        settings = timeline_data.get('settings', {
            'width': 1920,
            'height': 1080,
            'frameRate': 30,
            'duration': 0
        })
        
        return jsonify({
            'success': True,
            'settings': settings
        }), 200
        
    except Exception as e:
        print(f"❌ Get settings error: {str(e)}")
        return jsonify({'error': f'Failed to get settings: {str(e)}'}), 500


@video_editor_bp.route('/api/video-editor/projects/<int:project_id>/settings', methods=['PUT'])
@jwt_required()
def update_project_settings(project_id):
    """Update project settings"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        timeline_data = project.timeline_data if isinstance(project.timeline_data, dict) else {}
        if isinstance(project.timeline_data, str):
            try:
                timeline_data = json.loads(project.timeline_data)
            except:
                timeline_data = {}
        
        if 'settings' not in timeline_data:
            timeline_data['settings'] = {}
        
        # Update settings
        allowed_settings = ['width', 'height', 'frameRate', 'duration', 'aspectRatio', 'backgroundColor']
        for key in allowed_settings:
            if key in data:
                timeline_data['settings'][key] = data[key]
        
        project.timeline_data = timeline_data
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'settings': timeline_data['settings']
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Update settings error: {str(e)}")
        return jsonify({'error': f'Failed to update settings: {str(e)}'}), 500


# =====================================================
# ASSET UPLOAD & MANAGEMENT ROUTES
# =====================================================

@video_editor_bp.route('/api/video-editor/upload', methods=['POST'])
@jwt_required()
def upload_editor_asset():
    """Upload a video/audio/image asset for use in the video editor."""
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
            resource_type = 'raw'
        elif filename.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
            resource_type = 'image'
        else:
            resource_type = 'raw'
        
        # Generate unique public_id
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        hash_suffix = hashlib.md5(f"{user_id}_{timestamp}".encode()).hexdigest()[:8]
        public_id = f"editor/{user_id}/{timestamp}_{hash_suffix}"
        
        upload_options = {
            'public_id': public_id,
            'resource_type': resource_type,
            'folder': f'video_editor/{user_id}',
        }
        
        if resource_type == 'video':
            upload_options['eager'] = [
                {'width': 320, 'height': 180, 'crop': 'fill', 'format': 'jpg'}
            ]
            upload_options['eager_async'] = True
        
        result = cloudinary.uploader.upload(file, **upload_options)
        
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
        
        if resource_type == 'video' and result.get('eager'):
            response_data['asset']['thumbnail'] = result['eager'][0].get('secure_url')
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Editor upload error: {str(e)}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/upload-with-fps', methods=['POST'])
@jwt_required()
def upload_with_fps():
    """Upload video with eager transformation at specific frame rate."""
    try:
        user_id = get_jwt_identity()
        
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        frame_rate = request.form.get('frame_rate', 24, type=int)
        
        valid_frame_rates = [24, 25, 30, 48, 60]
        if frame_rate not in valid_frame_rates:
            frame_rate = 24
        
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        hash_suffix = hashlib.md5(f"{user_id}_{timestamp}".encode()).hexdigest()[:8]
        public_id = f"editor/{user_id}/{timestamp}_{hash_suffix}"
        
        result = cloudinary.uploader.upload(
            file,
            public_id=public_id,
            resource_type="video",
            folder=f'video_editor/{user_id}',
            eager=[
                {
                    "width": 1920,
                    "height": 1080,
                    "crop": "limit",
                    "fps": frame_rate,
                    "format": "mp4"
                },
                {
                    "width": 320,
                    "height": 180,
                    "crop": "fill",
                    "format": "jpg"
                }
            ],
            eager_async=True
        )
        
        response_data = {
            "success": True,
            "asset": {
                "public_id": result['public_id'],
                "url": result['secure_url'],
                "resource_type": "video",
                "format": result.get('format'),
                "width": result.get('width'),
                "height": result.get('height'),
                "duration": result.get('duration'),
                "file_size": result.get('bytes'),
                "frame_rate": frame_rate,
                "created_at": result.get('created_at')
            },
            "message": f"Video uploaded. Processing at {frame_rate}fps in background."
        }
        
        if result.get('eager'):
            response_data['asset']['processed_url'] = result['eager'][0].get('secure_url')
            if len(result['eager']) > 1:
                response_data['asset']['thumbnail'] = result['eager'][1].get('secure_url')
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Upload with FPS error: {str(e)}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/assets', methods=['GET'])
@jwt_required()
def get_editor_assets():
    """Get all assets uploaded by user for video editor"""
    try:
        user_id = get_jwt_identity()
        
        result = cloudinary.api.resources(
            type='upload',
            prefix=f'video_editor/{user_id}',
            max_results=100,
            resource_type='video'
        )
        
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


# =====================================================
# VIDEO TRANSFORMATION ROUTES
# =====================================================

@video_editor_bp.route('/api/video-editor/transform', methods=['POST'])
@jwt_required()
def transform_video():
    """Apply transformations to a video and return the transformed URL."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        public_id = data.get('public_id')
        if not public_id:
            return jsonify({"error": "No public_id provided"}), 400
        
        transformations = transformer.process_timeline_clip(data)
        
        frame_rate = data.get('frame_rate') or data.get('frameRate')
        if frame_rate:
            fps_transform = transformer.build_fps_transformation(frame_rate)
            if fps_transform:
                transformations.append(fps_transform)
        
        quality = data.get('quality', 'auto')
        format = data.get('format', 'mp4')
        transformations.append(transformer.build_quality_transformation(quality, format))
        
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
        
        trim = transformer.build_trim_transformation(start_time, end_time)
        if trim:
            transformations.append(trim)
        
        transformations.append('q_auto/f_mp4')
        
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
        
        effect_transform = transformer.build_effect_transformation(effect_id, intensity)
        
        if not effect_transform:
            return jsonify({"error": f"Unknown effect: {effect_id}"}), 400
        
        transformations = [
            'so_0,eo_5',
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
    """Concatenate multiple video clips into one."""
    try:
        data = request.get_json()
        
        clips = data.get('clips', [])
        if len(clips) < 2:
            return jsonify({"error": "Need at least 2 clips to concatenate"}), 400
        
        base_clip = clips[0]
        base_public_id = base_clip.get('public_id')
        
        if not base_public_id:
            return jsonify({"error": "Invalid clip data"}), 400
        
        transformations = []
        
        if base_clip.get('trim'):
            trim = transformer.build_trim_transformation(
                base_clip['trim'].get('start'),
                base_clip['trim'].get('end')
            )
            if trim:
                transformations.append(trim)
        
        for clip in clips[1:]:
            clip_id = clip.get('public_id')
            if clip_id:
                safe_id = clip_id.replace('/', ':')
                
                splice_parts = [f"l_video:{safe_id}"]
                
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
        
        transformations.append('q_auto/f_mp4')
        
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
        scale = data.get('scale', 30)
        opacity = data.get('opacity', 100)
        start_time = data.get('start_time', 0)
        
        if not base_public_id or not overlay_public_id:
            return jsonify({"error": "Missing base or overlay public_id"}), 400
        
        transformations = []
        
        if start_time > 0:
            transformations.append(f"so_{start_time}")
        
        overlay = transformer.build_overlay_transformation(
            overlay_public_id,
            position,
            opacity,
            scale
        )
        transformations.append(overlay)
        
        transformations.append('q_auto/f_mp4')
        
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
        
        text_overlay = transformer.build_text_overlay(text, font_size, color, position)
        transformations.append(text_overlay)
        
        transformations.append('q_auto/f_mp4')
        
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


# =====================================================
# EXPORT ROUTES
# =====================================================

@video_editor_bp.route('/api/video-editor/export', methods=['POST'])
@jwt_required()
def export_project():
    """Export a complete video project with all transformations."""
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
        
        resolution = settings.get('resolution', '1080p')
        quality = settings.get('quality', 'auto')
        format = settings.get('format', 'mp4')
        frame_rate = settings.get('frameRate', 24)
        
        valid_frame_rates = [24, 25, 30, 48, 60]
        if frame_rate not in valid_frame_rates:
            frame_rate = 24
        
        print(f"📹 Export settings: {resolution}, {frame_rate}fps, {quality}, {format}")
        
        video_clips = []
        for track in tracks:
            if track.get('type') == 'video':
                for clip in track.get('clips', []):
                    if clip.get('cloudinary_public_id') or clip.get('public_id'):
                        video_clips.append(clip)
        
        if not video_clips:
            return jsonify({"error": "No video clips found in timeline"}), 400
        
        if len(video_clips) == 1:
            clip = video_clips[0]
            public_id = clip.get('cloudinary_public_id') or clip.get('public_id')
            
            transformations = transformer.process_timeline_clip(clip)
            
            res_transform = transformer.build_resolution_transformation(resolution, frame_rate)
            if res_transform:
                transformations.append(res_transform)
            else:
                fps_transform = transformer.build_fps_transformation(frame_rate)
                if fps_transform:
                    transformations.append(fps_transform)
            
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
                "settings": {
                    "resolution": resolution,
                    "frame_rate": frame_rate,
                    "quality": quality,
                    "format": format
                },
                "message": f"Video exported at {resolution}, {frame_rate}fps. Click the URL to download."
            }), 200
        
        else:
            first_clip = video_clips[0]
            base_public_id = first_clip.get('cloudinary_public_id') or first_clip.get('public_id')
            
            transformations = []
            
            first_transforms = transformer.process_timeline_clip(first_clip)
            transformations.extend(first_transforms)
            
            for clip in video_clips[1:]:
                clip_id = clip.get('cloudinary_public_id') or clip.get('public_id')
                if clip_id:
                    safe_id = clip_id.replace('/', ':')
                    
                    splice_parts = [f"l_video:{safe_id}"]
                    
                    clip_transforms = transformer.process_timeline_clip(clip)
                    if clip_transforms:
                        splice_parts.extend(clip_transforms)
                    
                    splice_parts.append("fl_splice")
                    splice_parts.append("fl_layer_apply")
                    
                    transformations.append("/".join(splice_parts))
            
            res_transform = transformer.build_resolution_transformation(resolution, frame_rate)
            if res_transform:
                transformations.append(res_transform)
            else:
                fps_transform = transformer.build_fps_transformation(frame_rate)
                if fps_transform:
                    transformations.append(fps_transform)
            
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
                "settings": {
                    "resolution": resolution,
                    "frame_rate": frame_rate,
                    "quality": quality,
                    "format": format
                },
                "message": f"Video exported at {resolution}, {frame_rate}fps. Click the URL to download."
            }), 200
        
    except Exception as e:
        print(f"❌ Export error: {str(e)}")
        return jsonify({"error": f"Export failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/build-url', methods=['POST'])
@jwt_required()
def build_video_url():
    """Build a Cloudinary video URL with specific transformations."""
    try:
        data = request.get_json()
        
        public_id = data.get('public_id')
        if not public_id:
            return jsonify({"error": "No public_id provided"}), 400
        
        width = data.get('width', 1920)
        height = data.get('height', 1080)
        frame_rate = data.get('frame_rate', 24)
        quality = data.get('quality', 'auto')
        format = data.get('format', 'mp4')
        
        valid_frame_rates = [24, 25, 30, 48, 60]
        if frame_rate not in valid_frame_rates:
            frame_rate = 24
        
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        base_url = f"https://res.cloudinary.com/{cloud_name}/video/upload"
        
        transformation = f"w_{width},h_{height},c_limit,fps_{frame_rate},q_{quality}"
        
        video_url = f"{base_url}/{transformation}/{public_id}.{format}"
        
        return jsonify({
            "success": True,
            "video_url": video_url,
            "settings": {
                "width": width,
                "height": height,
                "frame_rate": frame_rate,
                "quality": quality,
                "format": format
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"URL build failed: {str(e)}"}), 500


# =====================================================
# LEGACY SAVE PROJECT (kept for backwards compatibility)
# =====================================================

@video_editor_bp.route('/api/video-editor/save-project', methods=['POST'])
@jwt_required()
def save_project_legacy():
    """
    Legacy save endpoint - redirects to proper project update.
    Kept for backwards compatibility with existing frontend code.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        project_id = data.get('project_id')
        title = data.get('title', 'Untitled Project')
        timeline_data = data.get('timeline')
        settings = data.get('settings', {})
        
        # If project_id exists, update existing project
        if project_id:
            project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
            if project:
                project.title = title
                project.timeline_data = timeline_data if timeline_data else project.timeline_data
                project.updated_at = datetime.utcnow()
                db.session.commit()
                
                return jsonify({
                    "success": True,
                    "message": "Project saved successfully",
                    "project": serialize_project(project)
                }), 200
        
        # Otherwise create new project
        new_project = VideoProject(
            user_id=user_id,
            title=title,
            timeline_data=timeline_data or {'tracks': [], 'markers': [], 'settings': settings},
            duration=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.session.add(new_project)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Project created successfully",
            "project": serialize_project(new_project)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Save project error: {str(e)}")
        return jsonify({"error": f"Save failed: {str(e)}"}), 500


# =====================================================
# UTILITY ROUTES
# =====================================================

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
    """Get list of available export resolutions and frame rates"""
    resolutions = [
        {"id": "4k", "name": "4K Ultra HD", "width": 3840, "height": 2160, "tier_required": "professional"},
        {"id": "1080p", "name": "Full HD", "width": 1920, "height": 1080, "tier_required": "creator"},
        {"id": "720p", "name": "HD", "width": 1280, "height": 720, "tier_required": "free"},
        {"id": "480p", "name": "SD", "width": 854, "height": 480, "tier_required": "free"},
        {"id": "360p", "name": "Low", "width": 640, "height": 360, "tier_required": "free"},
    ]
    
    frame_rates = [
        {"id": 24, "name": "24 fps", "description": "Film/Cinema standard"},
        {"id": 25, "name": "25 fps", "description": "PAL (European TV)"},
        {"id": 30, "name": "30 fps", "description": "NTSC (US TV/Web)"},
        {"id": 48, "name": "48 fps", "description": "High Frame Rate (HFR)"},
        {"id": 60, "name": "60 fps", "description": "Smooth video/Gaming"},
    ]
    
    return jsonify({
        "success": True,
        "resolutions": resolutions,
        "frame_rates": frame_rates
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
        
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        thumbnail_url = f"https://res.cloudinary.com/{cloud_name}/video/upload/so_{timestamp},c_fill,w_320,h_180/f_jpg/{public_id}"
        
        return jsonify({
            "success": True,
            "thumbnail_url": thumbnail_url
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Thumbnail generation failed: {str(e)}"}), 500


@video_editor_bp.route('/api/video-editor/health', methods=['GET'])
def health_check():
    """Health check for video editor API"""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    
    return jsonify({
        "status": "healthy",
        "service": "video-editor",
        "cloudinary_configured": bool(cloud_name),
        "supported_frame_rates": [24, 25, 30, 48, 60],
        "features": [
            "project_management",
            "markers",
            "clip_operations",
            "track_management",
            "cloudinary_transforms",
            "export"
        ],
        "timestamp": datetime.utcnow().isoformat()
    }), 200