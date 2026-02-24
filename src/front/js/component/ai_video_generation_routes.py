# =============================================================================
# AI VIDEO GENERATION ROUTES - Text-to-Video & Image-to-Video
# =============================================================================
# Save as: src/api/ai_video_generation_routes.py
# Register in app.py: from api.ai_video_generation_routes import ai_video_gen_bp
#                      app.register_blueprint(ai_video_gen_bp)
#
# Required env vars:
#   REPLICATE_API_TOKEN - Your Replicate API token
#   R2_ENDPOINT_URL, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME - R2 config
#
# Install: pip install replicate --break-system-packages
# =============================================================================

import os
import uuid
import time
import requests
import traceback
from io import BytesIO
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from .models import (
    db, User, AIVideoGeneration, VideoCredit
)
from .ai_video_credits_routes import (
    deduct_user_credits, refund_user_credits, get_or_create_credits,
    get_user_tier, check_and_reset_monthly_credits
)

ai_video_gen_bp = Blueprint('ai_video_gen', __name__)


# =============================================================================
# CONFIG
# =============================================================================

# Replicate models — competition-level quality
# Kling 1.6 matches Runway Gen-3 quality at lower cost
# These can be swapped as newer models drop on Replicate
REPLICATE_MODELS = {
    'text_to_video': {
        # Kling v1.6 — excellent quality, fast, cost-effective
        'model': 'kwaivgi/kling-v1.6-standard:45d3267b5e8a92e42e5b24218e0e053cafc9a7f1eee7bdf6ea3b8fe72ef7bd63',
        'name': 'Kling v1.6 Standard',
        'max_duration': 5,
        'cost_estimate': 0.10,
    },
    'image_to_video': {
        # Kling v1.6 image-to-video — smooth motion, high fidelity
        'model': 'kwaivgi/kling-v1.6-standard:45d3267b5e8a92e42e5b24218e0e053cafc9a7f1eee7bdf6ea3b8fe72ef7bd63',
        'name': 'Kling v1.6 Standard',
        'max_duration': 5,
        'cost_estimate': 0.10,
    },
}

# Premium models — top-tier quality for users who want the best
PREMIUM_MODELS = {
    'text_to_video': {
        # Kling v1.6 Pro — highest quality, cinematic output
        'model': 'kwaivgi/kling-v1.6-pro:1081e794ddb6e4fd184631fcdab3e26cf9e3b6e79a2528e5a2f15aebd1ad4106',
        'name': 'Kling v1.6 Pro',
        'max_duration': 5,
        'cost_estimate': 0.25,
    },
    'image_to_video': {
        # Kling v1.6 Pro — best image animation available
        'model': 'kwaivgi/kling-v1.6-pro:1081e794ddb6e4fd184631fcdab3e26cf9e3b6e79a2528e5a2f15aebd1ad4106',
        'name': 'Kling v1.6 Pro',
        'max_duration': 5,
        'cost_estimate': 0.25,
    },
}

# Daily generation limits (safety cap even with credits)
DAILY_LIMITS = {
    'free': 0,
    'starter': 10,
    'creator': 25,
    'pro': 50,
}

# R2 upload helper
def upload_to_r2(file_bytes, filename, content_type='video/mp4'):
    """Upload a file to Cloudflare R2 and return the public URL"""
    try:
        import boto3
        
        r2 = boto3.client(
            's3',
            endpoint_url=os.environ.get('R2_ENDPOINT_URL'),
            aws_access_key_id=os.environ.get('R2_ACCESS_KEY'),
            aws_secret_access_key=os.environ.get('R2_SECRET_KEY'),
            region_name='auto',
        )
        
        bucket = os.environ.get('R2_BUCKET_NAME', 'streampirex')
        key = f'ai-videos/{filename}'
        
        r2.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        
        # Build public URL
        r2_public_url = os.environ.get('R2_PUBLIC_URL', '').rstrip('/')
        if r2_public_url:
            return f'{r2_public_url}/{key}'
        
        # Fallback to endpoint URL
        endpoint = os.environ.get('R2_ENDPOINT_URL', '').rstrip('/')
        return f'{endpoint}/{bucket}/{key}'
        
    except Exception as e:
        print(f"R2 upload error: {e}")
        traceback.print_exc()
        return None


# =============================================================================
# TEXT-TO-VIDEO GENERATION
# =============================================================================

@ai_video_gen_bp.route('/api/ai-video/generate/text', methods=['POST'])
@jwt_required()
def generate_text_to_video():
    """Generate a video from a text prompt"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        prompt = data.get('prompt', '').strip()
        aspect_ratio = data.get('aspect_ratio', '16:9')
        quality = data.get('quality', 'standard')  # 'standard' or 'premium'
        
        # Validate
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
        
        if len(prompt) > 500:
            return jsonify({'error': 'Prompt must be under 500 characters'}), 400
        
        # Check daily limit
        tier = get_user_tier(user_id)
        if tier == 'free':
            return jsonify({
                'error': 'AI Video generation requires a paid subscription',
                'upgrade_required': True
            }), 403
        
        daily_limit = DAILY_LIMITS.get(tier, 10)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = AIVideoGeneration.query.filter(
            AIVideoGeneration.user_id == user_id,
            AIVideoGeneration.created_at >= today_start,
            AIVideoGeneration.status.in_(['pending', 'processing', 'completed']),
        ).count()
        
        if today_count >= daily_limit:
            return jsonify({
                'error': f'Daily limit reached ({daily_limit} videos/day on {tier} plan)',
                'daily_limit': daily_limit,
                'used_today': today_count,
            }), 429
        
        # Deduct credit
        success, credit, error = deduct_user_credits(user_id, 1)
        if not success:
            return jsonify(error), 402
        
        # Select model
        model_config = PREMIUM_MODELS['text_to_video'] if quality == 'premium' else REPLICATE_MODELS['text_to_video']
        
        # Create generation record
        generation = AIVideoGeneration(
            user_id=user_id,
            generation_type='text_to_video',
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            api_provider='replicate',
            api_model=model_config['model'],
            api_cost=model_config['cost_estimate'],
            status='processing',
            started_at=datetime.utcnow(),
        )
        db.session.add(generation)
        db.session.commit()
        
        # Call Replicate API
        try:
            import replicate
            
            replicate_client = replicate.Client(api_token=os.environ.get('REPLICATE_API_TOKEN'))
            
            # Run the model
            output = replicate_client.run(
                model_config['model'],
                input={
                    'prompt': prompt,
                    'duration': 5,
                    'aspect_ratio': aspect_ratio,
                }
            )
            
            # Output is usually a URL to the generated video
            video_url = None
            if isinstance(output, str):
                video_url = output
            elif isinstance(output, list) and len(output) > 0:
                video_url = output[0]
            elif hasattr(output, 'url'):
                video_url = output.url
            
            if not video_url:
                raise Exception('No video URL returned from API')
            
            # Download the video
            video_response = requests.get(video_url, timeout=120)
            if video_response.status_code != 200:
                raise Exception(f'Failed to download video: HTTP {video_response.status_code}')
            
            video_bytes = video_response.content
            file_size = len(video_bytes)
            
            # Upload to R2
            uid = uuid.uuid4().hex[:12]
            r2_filename = f'{user_id}_{uid}_text2vid.mp4'
            r2_url = upload_to_r2(video_bytes, r2_filename, 'video/mp4')
            
            if not r2_url:
                raise Exception('Failed to upload to R2')
            
            # Update generation record
            generation.video_url = r2_url
            generation.file_size = file_size
            generation.status = 'completed'
            generation.completed_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'success': True,
                'generation': generation.serialize(),
                'video_url': r2_url,
                'credits_remaining': credit.balance,
                'message': '🎬 Video generated successfully!',
            }), 200
            
        except Exception as api_error:
            # Refund credit on failure
            refund_user_credits(user_id, 1)
            generation.status = 'failed'
            generation.error_message = str(api_error)
            generation.credits_refunded = True
            db.session.commit()
            
            print(f"AI Video generation error: {api_error}")
            traceback.print_exc()
            
            return jsonify({
                'error': f'Generation failed: {str(api_error)}',
                'credits_refunded': True,
                'credits_remaining': credit.balance + 1,  # After refund
            }), 500
            
    except Exception as e:
        print(f"Text-to-video error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# =============================================================================
# IMAGE-TO-VIDEO GENERATION
# =============================================================================

@ai_video_gen_bp.route('/api/ai-video/generate/image', methods=['POST'])
@jwt_required()
def generate_image_to_video():
    """Generate a video from an uploaded image"""
    try:
        user_id = get_jwt_identity()
        
        # Handle both JSON (with image URL) and form data (with file upload)
        if request.is_json:
            data = request.get_json()
            image_url = data.get('image_url')
            prompt = data.get('prompt', '')
            aspect_ratio = data.get('aspect_ratio', '16:9')
            quality = data.get('quality', 'standard')
        else:
            image_url = request.form.get('image_url')
            prompt = request.form.get('prompt', '')
            aspect_ratio = request.form.get('aspect_ratio', '16:9')
            quality = request.form.get('quality', 'standard')
            
            # Handle file upload
            if 'image' in request.files:
                image_file = request.files['image']
                if image_file.filename:
                    # Upload image to R2 first
                    uid = uuid.uuid4().hex[:8]
                    img_filename = f'{user_id}_{uid}_source.{image_file.filename.rsplit(".", 1)[-1]}'
                    img_bytes = image_file.read()
                    content_type = image_file.content_type or 'image/png'
                    image_url = upload_to_r2(img_bytes, f'ai-video-sources/{img_filename}', content_type)
        
        if not image_url:
            return jsonify({'error': 'Image is required (provide image_url or upload a file)'}), 400
        
        # Check tier
        tier = get_user_tier(user_id)
        if tier == 'free':
            return jsonify({
                'error': 'AI Video generation requires a paid subscription',
                'upgrade_required': True
            }), 403
        
        # Check daily limit
        daily_limit = DAILY_LIMITS.get(tier, 10)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = AIVideoGeneration.query.filter(
            AIVideoGeneration.user_id == user_id,
            AIVideoGeneration.created_at >= today_start,
            AIVideoGeneration.status.in_(['pending', 'processing', 'completed']),
        ).count()
        
        if today_count >= daily_limit:
            return jsonify({
                'error': f'Daily limit reached ({daily_limit} videos/day on {tier} plan)',
                'daily_limit': daily_limit,
                'used_today': today_count,
            }), 429
        
        # Deduct credit
        success, credit, error = deduct_user_credits(user_id, 1)
        if not success:
            return jsonify(error), 402
        
        # Select model
        model_config = PREMIUM_MODELS['image_to_video'] if quality == 'premium' else REPLICATE_MODELS['image_to_video']
        
        # Create generation record
        generation = AIVideoGeneration(
            user_id=user_id,
            generation_type='image_to_video',
            prompt=prompt,
            source_image_url=image_url,
            aspect_ratio=aspect_ratio,
            api_provider='replicate',
            api_model=model_config['model'],
            api_cost=model_config['cost_estimate'],
            status='processing',
            started_at=datetime.utcnow(),
        )
        db.session.add(generation)
        db.session.commit()
        
        # Call Replicate API
        try:
            import replicate
            
            replicate_client = replicate.Client(api_token=os.environ.get('REPLICATE_API_TOKEN'))
            
            # Build input based on model
            model_input = {
                'input_image': image_url,
                'duration': 5,
                'aspect_ratio': aspect_ratio,
            }
            
            # Add motion prompt if provided
            if prompt:
                model_input['prompt'] = prompt
            
            output = replicate_client.run(
                model_config['model'],
                input=model_input,
            )
            
            # Get video URL from output
            video_url = None
            if isinstance(output, str):
                video_url = output
            elif isinstance(output, list) and len(output) > 0:
                video_url = output[0]
            elif hasattr(output, 'url'):
                video_url = output.url
            
            if not video_url:
                raise Exception('No video URL returned from API')
            
            # Download and upload to R2
            video_response = requests.get(video_url, timeout=120)
            if video_response.status_code != 200:
                raise Exception(f'Failed to download: HTTP {video_response.status_code}')
            
            video_bytes = video_response.content
            file_size = len(video_bytes)
            
            uid = uuid.uuid4().hex[:12]
            r2_filename = f'{user_id}_{uid}_img2vid.mp4'
            r2_url = upload_to_r2(video_bytes, r2_filename, 'video/mp4')
            
            if not r2_url:
                raise Exception('Failed to upload to R2')
            
            # Update record
            generation.video_url = r2_url
            generation.file_size = file_size
            generation.status = 'completed'
            generation.completed_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'success': True,
                'generation': generation.serialize(),
                'video_url': r2_url,
                'credits_remaining': credit.balance,
                'message': '🎬 Video generated from image!',
            }), 200
            
        except Exception as api_error:
            refund_user_credits(user_id, 1)
            generation.status = 'failed'
            generation.error_message = str(api_error)
            generation.credits_refunded = True
            db.session.commit()
            
            print(f"Image-to-video error: {api_error}")
            traceback.print_exc()
            
            return jsonify({
                'error': f'Generation failed: {str(api_error)}',
                'credits_refunded': True,
                'credits_remaining': credit.balance + 1,
            }), 500
            
    except Exception as e:
        print(f"Image-to-video error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# =============================================================================
# GET USER'S GENERATED VIDEOS (Gallery)
# =============================================================================

@ai_video_gen_bp.route('/api/ai-video/my-videos', methods=['GET'])
@jwt_required()
def get_my_generated_videos():
    """Get user's AI generated video gallery"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status_filter = request.args.get('status', None)
        
        query = AIVideoGeneration.query.filter_by(user_id=user_id)
        
        if status_filter:
            query = query.filter_by(status=status_filter)
        
        videos = query.order_by(
            AIVideoGeneration.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'videos': [v.serialize() for v in videos.items],
            'total': videos.total,
            'page': page,
            'pages': videos.pages,
            'has_next': videos.has_next,
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# GET SINGLE GENERATION STATUS (For polling during generation)
# =============================================================================

@ai_video_gen_bp.route('/api/ai-video/status/<int:generation_id>', methods=['GET'])
@jwt_required()
def get_generation_status(generation_id):
    """Check status of a video generation"""
    try:
        user_id = get_jwt_identity()
        
        generation = AIVideoGeneration.query.filter_by(
            id=generation_id, user_id=user_id
        ).first()
        
        if not generation:
            return jsonify({'error': 'Generation not found'}), 404
        
        return jsonify({
            'success': True,
            'generation': generation.serialize(),
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# DELETE GENERATED VIDEO
# =============================================================================

@ai_video_gen_bp.route('/api/ai-video/delete/<int:generation_id>', methods=['DELETE'])
@jwt_required()
def delete_generated_video(generation_id):
    """Delete a generated video"""
    try:
        user_id = get_jwt_identity()
        
        generation = AIVideoGeneration.query.filter_by(
            id=generation_id, user_id=user_id
        ).first()
        
        if not generation:
            return jsonify({'error': 'Generation not found'}), 404
        
        # Optionally delete from R2
        # For now just mark as deleted
        generation.status = 'deleted'
        generation.video_url = None
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Video deleted',
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# AI VIDEO STUDIO STATUS
# =============================================================================

@ai_video_gen_bp.route('/api/ai-video/studio-status', methods=['GET'])
@jwt_required()
def get_studio_status():
    """Get comprehensive AI video studio status"""
    try:
        user_id = get_jwt_identity()
        tier = get_user_tier(user_id)
        credit = get_or_create_credits(user_id)
        credit = check_and_reset_monthly_credits(credit, user_id)
        
        # Today's usage
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = AIVideoGeneration.query.filter(
            AIVideoGeneration.user_id == user_id,
            AIVideoGeneration.created_at >= today_start,
            AIVideoGeneration.status.in_(['pending', 'processing', 'completed']),
        ).count()
        
        # Total videos generated
        total_videos = AIVideoGeneration.query.filter_by(
            user_id=user_id, status='completed'
        ).count()
        
        daily_limit = DAILY_LIMITS.get(tier, 10)
        
        return jsonify({
            'success': True,
            'tier': tier,
            'credits': credit.serialize(),
            'daily_limit': daily_limit,
            'used_today': today_count,
            'remaining_today': max(0, daily_limit - today_count),
            'total_videos_generated': total_videos,
            'can_generate': tier != 'free' and credit.balance > 0 and today_count < daily_limit,
            'replicate_configured': bool(os.environ.get('REPLICATE_API_TOKEN')),
            'r2_configured': bool(os.environ.get('R2_ENDPOINT_URL')),
            'models': {
                'text_to_video': {
                    'standard': REPLICATE_MODELS['text_to_video']['name'],
                    'premium': PREMIUM_MODELS['text_to_video']['name'],
                },
                'image_to_video': {
                    'standard': REPLICATE_MODELS['image_to_video']['name'],
                    'premium': PREMIUM_MODELS['image_to_video']['name'],
                },
            },
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500