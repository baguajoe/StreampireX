# =============================================================================
# SUPPORT TICKET ROUTES — Add to src/api/routes.py or create src/api/support_routes.py
# =============================================================================
# Register blueprint: from api.support_routes import support_bp
#                     app.register_blueprint(support_bp)
# =============================================================================

import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from api.models import db, User, SupportTicket, SupportTicketReply
from src.api.email_service import send_email

support_bp = Blueprint('support', __name__)

SUPPORT_EMAIL = "support@eyeforgestudios.com"


# =============================================================================
# EMAIL NOTIFICATIONS
# =============================================================================
def send_new_ticket_admin_email(ticket, user):
    """Notify support team of new ticket"""
    html = f"""
    <html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
    <div style="background:white;padding:30px;border-radius:8px;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#0a1628,#001220);color:#00ffc8;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
            <h1>🎫 New Support Ticket</h1>
        </div>
        <div style="padding:20px;">
            <p><strong>Ticket:</strong> {ticket.ticket_number}</p>
            <p><strong>From:</strong> {user.username} ({user.email})</p>
            <p><strong>Tier:</strong> {ticket.user_tier}</p>
            <p><strong>Category:</strong> {ticket.category}</p>
            <p><strong>Priority:</strong> {ticket.priority.upper()}</p>
            <p><strong>Subject:</strong> {ticket.subject}</p>
            <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #00ffc8;">
                <p style="margin:0;white-space:pre-wrap;">{ticket.description}</p>
            </div>
        </div>
    </div></body></html>
    """
    try:
        send_email(SUPPORT_EMAIL, f"[{ticket.ticket_number}] {ticket.subject}", html)
    except Exception as e:
        print(f"⚠️ Failed to send admin notification email: {e}")


def send_ticket_confirmation_email(ticket, user):
    """Confirm to user their ticket was received"""
    frontend_url = os.getenv('FRONTEND_URL', 'https://streampirex.com')
    html = f"""
    <html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
    <div style="background:white;padding:30px;border-radius:8px;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#0a1628,#001220);color:#00ffc8;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
            <h1>✅ Ticket Received</h1>
        </div>
        <div style="padding:20px;">
            <p>Hi {user.username},</p>
            <p>We received your support request and will get back to you within <strong>24-48 hours</strong>.</p>
            <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:15px 0;">
                <p><strong>Ticket #:</strong> {ticket.ticket_number}</p>
                <p><strong>Subject:</strong> {ticket.subject}</p>
                <p><strong>Category:</strong> {ticket.category}</p>
            </div>
            <p>You can check the status of your ticket anytime from your <a href="{frontend_url}/support">Support page</a>.</p>
            <p>— StreamPireX Support Team</p>
        </div>
    </div></body></html>
    """
    try:
        send_email(user.email, f"[{ticket.ticket_number}] We received your request", html)
    except Exception as e:
        print(f"⚠️ Failed to send confirmation email: {e}")


def send_reply_notification_email(ticket, user, reply_message, is_admin_reply):
    """Notify user when admin replies, or notify admin when user replies"""
    if is_admin_reply:
        # Notify the ticket owner
        recipient = User.query.get(ticket.user_id)
        if not recipient:
            return
        frontend_url = os.getenv('FRONTEND_URL', 'https://streampirex.com')
        html = f"""
        <html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
        <div style="background:white;padding:30px;border-radius:8px;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#0a1628,#001220);color:#00ffc8;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
                <h1>💬 New Reply on Your Ticket</h1>
            </div>
            <div style="padding:20px;">
                <p>Hi {recipient.username},</p>
                <p>Our support team has responded to your ticket <strong>{ticket.ticket_number}</strong>:</p>
                <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #FF6600;">
                    <p style="margin:0;white-space:pre-wrap;">{reply_message}</p>
                </div>
                <p><a href="{frontend_url}/support">View Full Ticket</a></p>
                <p>— StreamPireX Support Team</p>
            </div>
        </div></body></html>
        """
        try:
            send_email(recipient.email, f"[{ticket.ticket_number}] Support Reply: {ticket.subject}", html)
        except Exception as e:
            print(f"⚠️ Failed to send reply notification: {e}")
    else:
        # Notify admin that user replied
        html = f"""
        <html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
        <div style="background:white;padding:30px;border-radius:8px;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#0a1628,#001220);color:#00ffc8;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
                <h1>💬 User Reply on {ticket.ticket_number}</h1>
            </div>
            <div style="padding:20px;">
                <p><strong>From:</strong> {user.username} ({user.email})</p>
                <p><strong>Ticket:</strong> {ticket.ticket_number} — {ticket.subject}</p>
                <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #00ffc8;">
                    <p style="margin:0;white-space:pre-wrap;">{reply_message}</p>
                </div>
            </div>
        </div></body></html>
        """
        try:
            send_email(SUPPORT_EMAIL, f"[{ticket.ticket_number}] User Reply: {ticket.subject}", html)
        except Exception as e:
            print(f"⚠️ Failed to send admin reply notification: {e}")


# =============================================================================
# HELPER: Generate unique ticket number
# =============================================================================
def generate_ticket_number():
    """Generate SPX-00001 style ticket number"""
    last_ticket = SupportTicket.query.order_by(SupportTicket.id.desc()).first()
    next_num = (last_ticket.id + 1) if last_ticket else 1
    return f"SPX-{next_num:05d}"


# =============================================================================
# CREATE TICKET
# =============================================================================
@support_bp.route('/api/support/tickets', methods=['POST'])
@jwt_required()
def create_support_ticket():
    """Create a new support ticket"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.json
        
        # Validate required fields
        subject = data.get('subject', '').strip()
        description = data.get('description', '').strip()
        category = data.get('category', 'general')
        
        if not subject:
            return jsonify({"error": "Subject is required"}), 400
        if not description:
            return jsonify({"error": "Description is required"}), 400
        if len(subject) > 255:
            return jsonify({"error": "Subject must be under 255 characters"}), 400
        if len(description) > 5000:
            return jsonify({"error": "Description must be under 5000 characters"}), 400
        
        # Validate category
        valid_categories = [
            'general', 'billing', 'streaming', 'recording-studio', 'video-editor',
            'podcasting', 'radio', 'gaming', 'distribution', 'account', 
            'bug-report', 'feature-request'
        ]
        if category not in valid_categories:
            category = 'general'
        
        # Validate priority
        priority = data.get('priority', 'normal')
        if priority not in ['low', 'normal', 'high', 'urgent']:
            priority = 'normal'
        
        # Determine user tier
        user_tier = 'free'
        if hasattr(user, 'subscription') and user.subscription:
            user_tier = getattr(user.subscription, 'plan_name', 'free').lower()
        elif hasattr(user, 'tier'):
            user_tier = user.tier or 'free'
        
        # Create ticket
        ticket = SupportTicket(
            user_id=user_id,
            ticket_number=generate_ticket_number(),
            subject=subject,
            description=description,
            category=category,
            priority=priority,
            status='open',
            browser_info=data.get('browser_info', request.headers.get('User-Agent', '')[:255]),
            platform_info=data.get('platform_info', 'web'),
            user_tier=user_tier,
            screenshot_url=data.get('screenshot_url'),
            attachment_url=data.get('attachment_url'),
            attachment_name=data.get('attachment_name'),
        )
        
        db.session.add(ticket)
        db.session.commit()
        
        print(f"📩 New support ticket {ticket.ticket_number} from {user.username}: {subject}")
        
        # Send email notifications
        send_new_ticket_admin_email(ticket, user)
        send_ticket_confirmation_email(ticket, user)
        
        return jsonify({
            "message": "Support ticket created successfully! We'll get back to you within 24-48 hours.",
            "ticket": ticket.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Support ticket creation error: {str(e)}")
        return jsonify({"error": f"Failed to create ticket: {str(e)}"}), 500


# =============================================================================
# GET USER'S TICKETS
# =============================================================================
@support_bp.route('/api/support/tickets', methods=['GET'])
@jwt_required()
def get_user_tickets():
    """Get all tickets for the logged-in user"""
    try:
        user_id = get_jwt_identity()
        
        status_filter = request.args.get('status')  # open, in-progress, resolved, closed
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        query = SupportTicket.query.filter_by(user_id=user_id)
        
        if status_filter and status_filter != 'all':
            query = query.filter_by(status=status_filter)
        
        query = query.order_by(SupportTicket.created_at.desc())
        
        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            "tickets": [t.serialize() for t in paginated.items],
            "total": paginated.total,
            "pages": paginated.pages,
            "current_page": paginated.page,
            "has_next": paginated.has_next,
            "has_prev": paginated.has_prev,
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch tickets: {str(e)}"}), 500


# =============================================================================
# GET SINGLE TICKET (with replies)
# =============================================================================
@support_bp.route('/api/support/tickets/<int:ticket_id>', methods=['GET'])
@jwt_required()
def get_ticket_detail(ticket_id):
    """Get a single ticket with all replies"""
    try:
        user_id = get_jwt_identity()
        ticket = SupportTicket.query.get(ticket_id)
        
        if not ticket:
            return jsonify({"error": "Ticket not found"}), 404
        
        # Only allow the ticket owner or admins to view
        if ticket.user_id != user_id:
            user = User.query.get(user_id)
            if not user or not getattr(user, 'is_admin', False):
                return jsonify({"error": "Unauthorized"}), 403
        
        return jsonify({"ticket": ticket.serialize()}), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch ticket: {str(e)}"}), 500


# =============================================================================
# ADD REPLY TO TICKET
# =============================================================================
@support_bp.route('/api/support/tickets/<int:ticket_id>/reply', methods=['POST'])
@jwt_required()
def reply_to_ticket(ticket_id):
    """Add a reply to an existing ticket"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        ticket = SupportTicket.query.get(ticket_id)
        
        if not ticket:
            return jsonify({"error": "Ticket not found"}), 404
        
        # Check ownership or admin
        is_admin = getattr(user, 'is_admin', False)
        if ticket.user_id != user_id and not is_admin:
            return jsonify({"error": "Unauthorized"}), 403
        
        data = request.json
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
        if len(message) > 5000:
            return jsonify({"error": "Message must be under 5000 characters"}), 400
        
        reply = SupportTicketReply(
            ticket_id=ticket_id,
            user_id=user_id,
            message=message,
            is_admin=is_admin,
            attachment_url=data.get('attachment_url'),
        )
        
        db.session.add(reply)
        
        # Update ticket status
        if is_admin:
            ticket.status = 'awaiting-reply'
            ticket.admin_response = message
            ticket.admin_id = user_id
            ticket.responded_at = datetime.utcnow()
        else:
            if ticket.status == 'awaiting-reply':
                ticket.status = 'in-progress'
        
        ticket.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Send email notification
        send_reply_notification_email(ticket, user, message, is_admin)
        
        return jsonify({
            "message": "Reply added successfully",
            "reply": reply.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to add reply: {str(e)}"}), 500


# =============================================================================
# CLOSE TICKET (user can close their own ticket)
# =============================================================================
@support_bp.route('/api/support/tickets/<int:ticket_id>/close', methods=['PUT'])
@jwt_required()
def close_ticket(ticket_id):
    """Close a ticket"""
    try:
        user_id = get_jwt_identity()
        ticket = SupportTicket.query.get(ticket_id)
        
        if not ticket:
            return jsonify({"error": "Ticket not found"}), 404
        
        if ticket.user_id != user_id:
            user = User.query.get(user_id)
            if not user or not getattr(user, 'is_admin', False):
                return jsonify({"error": "Unauthorized"}), 403
        
        ticket.status = 'closed'
        ticket.resolved_at = datetime.utcnow()
        ticket.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({"message": "Ticket closed", "ticket": ticket.serialize()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to close ticket: {str(e)}"}), 500


# =============================================================================
# REOPEN TICKET
# =============================================================================
@support_bp.route('/api/support/tickets/<int:ticket_id>/reopen', methods=['PUT'])
@jwt_required()
def reopen_ticket(ticket_id):
    """Reopen a closed ticket"""
    try:
        user_id = get_jwt_identity()
        ticket = SupportTicket.query.get(ticket_id)
        
        if not ticket:
            return jsonify({"error": "Ticket not found"}), 404
        
        if ticket.user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        if ticket.status != 'closed':
            return jsonify({"error": "Only closed tickets can be reopened"}), 400
        
        ticket.status = 'open'
        ticket.resolved_at = None
        ticket.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({"message": "Ticket reopened", "ticket": ticket.serialize()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to reopen ticket: {str(e)}"}), 500


# =============================================================================
# ADMIN: GET ALL TICKETS (for admin dashboard)
# =============================================================================
@support_bp.route('/api/admin/support/tickets', methods=['GET'])
@jwt_required()
def admin_get_all_tickets():
    """Admin endpoint: get all tickets with filters"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({"error": "Admin access required"}), 403
        
        status_filter = request.args.get('status')
        category_filter = request.args.get('category')
        priority_filter = request.args.get('priority')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = SupportTicket.query
        
        if status_filter and status_filter != 'all':
            query = query.filter_by(status=status_filter)
        if category_filter and category_filter != 'all':
            query = query.filter_by(category=category_filter)
        if priority_filter and priority_filter != 'all':
            query = query.filter_by(priority=priority_filter)
        
        query = query.order_by(
            # Urgent first, then by date
            db.case(
                (SupportTicket.priority == 'urgent', 0),
                (SupportTicket.priority == 'high', 1),
                (SupportTicket.priority == 'normal', 2),
                (SupportTicket.priority == 'low', 3),
            ),
            SupportTicket.created_at.desc()
        )
        
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Stats
        total_open = SupportTicket.query.filter_by(status='open').count()
        total_in_progress = SupportTicket.query.filter_by(status='in-progress').count()
        total_awaiting = SupportTicket.query.filter_by(status='awaiting-reply').count()
        
        return jsonify({
            "tickets": [t.serialize() for t in paginated.items],
            "total": paginated.total,
            "pages": paginated.pages,
            "current_page": paginated.page,
            "stats": {
                "open": total_open,
                "in_progress": total_in_progress,
                "awaiting_reply": total_awaiting,
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch tickets: {str(e)}"}), 500


# =============================================================================
# ADMIN: UPDATE TICKET STATUS
# =============================================================================
@support_bp.route('/api/admin/support/tickets/<int:ticket_id>/status', methods=['PUT'])
@jwt_required()
def admin_update_ticket_status(ticket_id):
    """Admin: update ticket status"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({"error": "Admin access required"}), 403
        
        ticket = SupportTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({"error": "Ticket not found"}), 404
        
        data = request.json
        new_status = data.get('status')
        
        valid_statuses = ['open', 'in-progress', 'awaiting-reply', 'resolved', 'closed']
        if new_status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {valid_statuses}"}), 400
        
        ticket.status = new_status
        ticket.updated_at = datetime.utcnow()
        
        if new_status in ['resolved', 'closed']:
            ticket.resolved_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({"message": "Status updated", "ticket": ticket.serialize()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update status: {str(e)}"}), 500