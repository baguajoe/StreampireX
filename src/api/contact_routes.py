# src/api/contact_routes.py
from flask import Blueprint, request, jsonify
from .email_service import send_email
from .models import db, User, WaitlistEntry
import os
from datetime import datetime

contact_bp = Blueprint('contact', __name__)

@contact_bp.route('/api/contact', methods=['POST'])
def submit_contact():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    subject = data.get('subject', 'General Inquiry').strip()
    message = data.get('message', '').strip()

    if not all([name, email, message]):
        return jsonify({'error': 'Name, email, and message are required'}), 400

    # Email to you (admin notification)
    admin_html = f"""
    <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0d1117;color:#e6edf3;padding:20px;">
    <div style="max-width:600px;margin:0 auto;background:#161b22;border-radius:8px;padding:30px;border:1px solid #30363d;">
        <h2 style="color:#00ffc8;">📬 New Contact Form Submission</h2>
        <p><strong>From:</strong> {name} &lt;{email}&gt;</p>
        <p><strong>Subject:</strong> {subject}</p>
        <p><strong>Time:</strong> {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}</p>
        <hr style="border-color:#30363d;"/>
        <p><strong>Message:</strong></p>
        <p style="background:#0d1117;padding:15px;border-radius:6px;border-left:4px solid #00ffc8;">{message}</p>
        <p style="margin-top:20px;"><a href="mailto:{email}" style="background:#00ffc8;color:#0d1117;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">Reply to {name}</a></p>
    </div>
    </body></html>
    """

    # Auto-reply to sender
    reply_html = f"""
    <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0d1117;color:#e6edf3;padding:20px;">
    <div style="max-width:600px;margin:0 auto;background:#161b22;border-radius:8px;padding:30px;border:1px solid #30363d;">
        <h2 style="color:#00ffc8;">Thanks for reaching out, {name}! 🎵</h2>
        <p>We received your message and will get back to you within 1-2 business days.</p>
        <div style="background:#0d1117;padding:15px;border-radius:6px;border-left:4px solid #00ffc8;margin:20px 0;">
            <p><strong>Your message:</strong></p>
            <p>{message}</p>
        </div>
        <p>In the meantime, explore StreamPireX at <a href="{os.getenv('FRONTEND_URL', 'https://streampirex.sonosuite.com')}" style="color:#00ffc8;">streampirex.sonosuite.com</a></p>
        <p style="color:#5a7088;font-size:12px;margin-top:30px;">© {datetime.now().year} StreamPireX. All rights reserved.</p>
    </div>
    </body></html>
    """

    admin_email = os.getenv('MAIL_USERNAME', 'your-email@gmail.com')
    send_email(admin_email, f"📬 Contact: {subject} — from {name}", admin_html)
    send_email(email, "We got your message! — StreamPireX", reply_html)

    return jsonify({'message': 'Message sent successfully!'}), 200


@contact_bp.route('/api/mass-email', methods=['POST'])
def send_mass_email():
    """Admin-only mass email blast to all users"""
    from flask_jwt_extended import jwt_required, get_jwt_identity
    # Simple admin check — add proper admin flag to User model later
    data = request.get_json()
    admin_secret = data.get('admin_secret')
    if admin_secret != os.getenv('ADMIN_SECRET', ''):
        return jsonify({'error': 'Unauthorized'}), 403

    subject = data.get('subject', '').strip()
    message_body = data.get('message', '').strip()
    preview_only = data.get('preview_only', False)

    if not subject or not message_body:
        return jsonify({'error': 'Subject and message are required'}), 400

    users = User.query.filter(User.email.isnot(None)).all()
    emails = [u.email for u in users if u.email]

    if preview_only:
        return jsonify({'total_recipients': len(emails), 'sample': emails[:5]}), 200

    html = f"""
    <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0d1117;color:#e6edf3;padding:20px;">
    <div style="max-width:600px;margin:0 auto;background:#161b22;border-radius:8px;padding:30px;border:1px solid #30363d;">
        <div style="text-align:center;margin-bottom:30px;">
            <h1 style="color:#00ffc8;font-size:28px;">StreamPireX</h1>
            <p style="color:#FF6600;font-size:14px;">The Creator's All-In-One Platform</p>
        </div>
        <div style="font-size:16px;line-height:1.6;">
            {message_body}
        </div>
        <div style="text-align:center;margin-top:30px;">
            <a href="{os.getenv('FRONTEND_URL', 'https://streampirex.sonosuite.com')}" 
               style="background:#00ffc8;color:#0d1117;padding:14px 30px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
               Visit StreamPireX 🚀
            </a>
        </div>
        <p style="color:#5a7088;font-size:11px;text-align:center;margin-top:30px;">
            © {datetime.now().year} StreamPireX · Eye Forge Studios LLC<br>
            <a href="{os.getenv('FRONTEND_URL')}/unsubscribe" style="color:#5a7088;">Unsubscribe</a>
        </p>
    </div>
    </body></html>
    """

    sent = 0
    failed = 0
    for email in emails:
        success = send_email(email, subject, html)
        if success:
            sent += 1
        else:
            failed += 1

    return jsonify({'sent': sent, 'failed': failed, 'total': len(emails)}), 200


# ── WAITLIST ──────────────────────────────────────────────────────────────────

@contact_bp.route('/api/waitlist', methods=['POST'])
def join_waitlist():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    name = data.get('name', '').strip()
    source = data.get('source', 'landing_page')

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    existing = WaitlistEntry.query.filter_by(email=email).first()
    if existing:
        return jsonify({'message': 'You are already on the list!'}), 200

    entry = WaitlistEntry(name=name, email=email, source=source)
    db.session.add(entry)
    db.session.commit()

    # Confirmation email to user
    confirm_html = f"""
    <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0d1117;color:#e6edf3;padding:20px;">
    <div style="max-width:600px;margin:0 auto;background:#161b22;border-radius:8px;padding:40px;border:1px solid #30363d;">
        <h1 style="color:#00ffc8;text-align:center;">You're on the list! 🎉</h1>
        <p>Hey {name or 'Creator'},</p>
        <p>You're officially on the StreamPireX early access list. We'll hit you first when we launch — with an exclusive offer just for early supporters.</p>
        <div style="background:#0d1117;border-left:4px solid #00ffc8;padding:20px;border-radius:6px;margin:24px 0;">
            <p style="margin:0;font-size:16px;"><strong>What's coming:</strong></p>
            <p>🎵 Music distribution to 150+ platforms<br>
            🎙️ Professional DAW & recording studio<br>
            🤖 AI beat maker, voice clone, video gen<br>
            📻 Live radio stations & podcast studio<br>
            💰 90% revenue share — keep what you earn</p>
        </div>
        <p>Stay tuned. This is going to be big.</p>
        <p style="color:#FF6600;font-weight:bold;">— The StreamPireX Team</p>
        <p style="color:#5a7088;font-size:11px;margin-top:30px;">© {dt.now().year} StreamPireX · Eye Forge Studios LLC</p>
    </div>
    </body></html>
    """
    send_email(email, "You're on the StreamPireX early access list! 🎵", confirm_html)

    return jsonify({'message': 'You are on the list!'}), 201

@contact_bp.route('/api/waitlist/count', methods=['GET'])
def waitlist_count():
    count = WaitlistEntry.query.filter_by(subscribed=True).count()
    return jsonify({'count': count}), 200
