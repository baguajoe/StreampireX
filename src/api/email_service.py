# src/api/email_service.py
from flask import current_app, render_template_string
from flask_mail import Mail, Message
import os
from datetime import datetime

mail = Mail()

def init_mail(app):
    """Initialize mail with app"""
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'StreamPireX <noreply@streampirex.com>')
    mail.init_app(app)

def send_email(to, subject, html_body, text_body=None):
    """Send email with error handling"""
    try:
        msg = Message(
            subject=subject,
            recipients=[to] if isinstance(to, str) else to,
            html=html_body,
            body=text_body or strip_html_tags(html_body)
        )
        mail.send(msg)
        current_app.logger.info(f"✅ Email sent to {to}: {subject}")
        return True
    except Exception as e:
        current_app.logger.error(f"❌ Failed to send email to {to}: {str(e)}")
        return False

def strip_html_tags(html):
    """Simple HTML tag stripper for text fallback"""
    import re
    return re.sub('<[^<]+?>', '', html)

# Email Templates
def get_order_fulfillment_email(order, tracking_number, carrier):
    """Order fulfillment email template"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }}
            .container {{ background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
            .content {{ padding: 20px; }}
            .order-details {{ background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }}
            .tracking-box {{ background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }}
            .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📦 Your Order Has Shipped!</h1>
            </div>
            <div class="content">
                <p>Hi there!</p>
                <p>Great news! Your order from StreamPireX has been shipped and is on its way to you.</p>
                
                <div class="order-details">
                    <h3>Order Details</h3>
                    <p><strong>Order ID:</strong> #{order.id}</p>
                    <p><strong>Product:</strong> {order.product.name if hasattr(order, 'product') else 'N/A'}</p>
                    <p><strong>Order Total:</strong> ${order.total_amount:.2f}</p>
                    <p><strong>Shipped Date:</strong> {order.shipped_at.strftime('%B %d, %Y') if order.shipped_at else 'N/A'}</p>
                </div>
                
                <div class="tracking-box">
                    <h3>📍 Tracking Information</h3>
                    <p><strong>Carrier:</strong> {carrier}</p>
                    <p><strong>Tracking Number:</strong> {tracking_number}</p>
                    <a href="https://www.{carrier.lower()}.com/track?tracknum={tracking_number}" class="button" target="_blank">
                        Track Your Package
                    </a>
                </div>
                
                <p>Your order should arrive within 3-7 business days. If you have any questions, feel free to contact our support team.</p>
                
                <p>Thank you for shopping with StreamPireX!</p>
            </div>
            <div class="footer">
                <p>© {datetime.now().year} StreamPireX. All rights reserved.</p>
                <p>This email was sent to you because you placed an order on our platform.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html

def get_subscription_update_email(user, subscription, event_type):
    """Subscription update email template"""
    
    event_messages = {
        'activated': {
            'subject': '🎉 Your StreamPireX Subscription is Active!',
            'title': 'Subscription Activated',
            'message': f'Welcome to StreamPireX {subscription.plan.name if hasattr(subscription, "plan") else "Premium"}! Your subscription is now active and you have full access to all features.'
        },
        'renewed': {
            'subject': '✅ Your StreamPireX Subscription Has Been Renewed',
            'title': 'Subscription Renewed',
            'message': 'Your subscription has been successfully renewed. Thank you for continuing with us!'
        },
        'canceled': {
            'subject': '😢 Your StreamPireX Subscription Has Been Canceled',
            'title': 'Subscription Canceled',
            'message': f'Your subscription has been canceled and will end on {subscription.end_date.strftime("%B %d, %Y") if subscription.end_date else "N/A"}. You\'ll continue to have access until then.'
        },
        'payment_failed': {
            'subject': '⚠️ Payment Failed for Your StreamPireX Subscription',
            'title': 'Payment Issue',
            'message': f'We couldn\'t process your payment. Your subscription is now in a grace period until {subscription.grace_period_end.strftime("%B %d, %Y") if subscription.grace_period_end else "N/A"}. Please update your payment method to avoid service interruption.'
        },
        'expiring_soon': {
            'subject': '⏰ Your StreamPireX Subscription is Expiring Soon',
            'title': 'Subscription Expiring',
            'message': f'Your subscription will expire on {subscription.end_date.strftime("%B %d, %Y") if subscription.end_date else "N/A"}. Renew now to continue enjoying all features!'
        }
    }
    
    event_info = event_messages.get(event_type, event_messages['activated'])
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }}
            .container {{ background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
            .content {{ padding: 20px; }}
            .subscription-box {{ background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }}
            .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            .alert {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{event_info['title']}</h1>
            </div>
            <div class="content">
                <p>Hi {user.username}!</p>
                <p>{event_info['message']}</p>
                
                <div class="subscription-box">
                    <h3>Subscription Details</h3>
                    <p><strong>Plan:</strong> {subscription.plan.name if hasattr(subscription, 'plan') else 'Premium'}</p>
                    <p><strong>Status:</strong> {subscription.status.title()}</p>
                    <p><strong>Billing Cycle:</strong> {subscription.billing_cycle.title() if subscription.billing_cycle else 'Monthly'}</p>
                    {'<p><strong>Next Billing Date:</strong> ' + subscription.end_date.strftime("%B %d, %Y") + '</p>' if subscription.end_date and event_type not in ['canceled', 'payment_failed'] else ''}
                </div>
                
                {f'<div class="alert"><strong>Action Required:</strong> Please update your payment method to continue your subscription.</div>' if event_type == 'payment_failed' else ''}
                
                <a href="{os.getenv('FRONTEND_URL')}/subscription" class="button">Manage Subscription</a>
                
                <p>If you have any questions, our support team is here to help!</p>
            </div>
            <div class="footer">
                <p>© {datetime.now().year} StreamPireX. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return event_info['subject'], html

def send_order_fulfillment_notification(order, buyer_email, tracking_number, carrier):
    """Send order fulfillment notification"""
    subject = f"📦 Your StreamPireX Order #{order.id} Has Shipped!"
    html_body = get_order_fulfillment_email(order, tracking_number, carrier)
    return send_email(buyer_email, subject, html_body)

def send_subscription_notification(user, subscription, event_type):
    """Send subscription update notification"""
    subject, html_body = get_subscription_update_email(user, subscription, event_type)
    return send_email(user.email, subject, html_body)

def send_distribution_notification(user_email, track_title, status, platforms=None):
    """Send music distribution status notification"""
    status_messages = {
        'submitted': '🎵 Your music has been submitted for distribution!',
        'live': '🎉 Your music is now live on streaming platforms!',
        'rejected': '❌ Your music distribution was rejected'
    }
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }}
            .container {{ background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
            .content {{ padding: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{status_messages.get(status, 'Distribution Update')}</h1>
            </div>
            <div class="content">
                <p><strong>Track:</strong> {track_title}</p>
                {f'<p><strong>Available on:</strong> {", ".join(platforms)}</p>' if platforms else ''}
                <p>Check your dashboard for more details.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    subject = f"Distribution Update: {track_title}"
    return send_email(user_email, subject, html)