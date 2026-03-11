import os, io, uuid
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from .models import db, User
from src.api.beat_store_models import BeatLicense

beat_license_bp = Blueprint('beat_licensing', __name__)

@beat_license_bp.route('/api/beat-license/terms', methods=['GET'])
def get_terms():
    return jsonify(LICENSE_TERMS), 200

# POST /api/beat-license/purchase
@beat_license_bp.route('/api/beat-license/purchase', methods=['POST'])
@jwt_required()
def purchase_license():
    buyer_id = get_jwt_identity()
    data     = request.get_json()
    beat_id      = data.get('beat_id')
    beat_title   = data.get('beat_title', 'Untitled Beat')
    producer_id  = data.get('producer_id')
    license_type = data.get('license_type', 'basic')
    price_paid   = float(data.get('price_paid', 0))

    if license_type not in LICENSE_TERMS:
        return jsonify({'error': 'Invalid license type'}), 400

    # Block double exclusive
    if license_type == 'exclusive':
        existing_exclusive = BeatLicense.query.filter_by(
            beat_id=beat_id, is_exclusive=True).first()
        if existing_exclusive:
            return jsonify({'error': 'This beat has already been sold exclusively'}), 400

    license_number = generate_license_number()
    terms = LICENSE_TERMS[license_type]

    lic = BeatLicense(
        beat_id=beat_id, beat_title=beat_title,
        producer_id=producer_id, buyer_id=buyer_id,
        license_type=license_type, price_paid=price_paid,
        license_number=license_number,
        terms=terms['description'],
        is_exclusive=(license_type == 'exclusive'),
    )
    db.session.add(lic)
    db.session.commit()

    return jsonify({
        'success': True,
        'license_number': license_number,
        'license_type': license_type,
        'terms': terms,
        'message': f'{license_type.capitalize()} license purchased successfully!',
    }), 201

# GET /api/beat-license/download/<license_number>  — generate PDF license
@beat_license_bp.route('/api/beat-license/download/<license_number>', methods=['GET'])
@jwt_required()
def download_license(license_number):
    buyer_id = get_jwt_identity()
    lic = BeatLicense.query.filter_by(license_number=license_number).first_or_404()
    if lic.buyer_id != buyer_id:
        return jsonify({'error': 'Unauthorized'}), 403

    buyer    = User.query.get(lic.buyer_id)
    producer = User.query.get(lic.producer_id)
    terms    = LICENSE_TERMS.get(lic.license_type, {})

    # Generate PDF using reportlab if available, else plain text fallback
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.units import inch

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=letter,
                                topMargin=0.75*inch, bottomMargin=0.75*inch)
        styles = getSampleStyleSheet()
        story  = []

        # Header
        header_style = ParagraphStyle('header', fontSize=22, fontName='Helvetica-Bold',
                                       textColor=colors.HexColor('#00ffc8'), spaceAfter=6)
        story.append(Paragraph('STREAMPIREX', header_style))
        story.append(Paragraph('BEAT LICENSE AGREEMENT', styles['Heading1']))
        story.append(Spacer(1, 0.2*inch))

        # License number box
        story.append(Paragraph(f'License #: <b>{lic.license_number}</b>', styles['Normal']))
        story.append(Paragraph(f'License Type: <b>{lic.license_type.upper()}</b>', styles['Normal']))
        story.append(Paragraph(f'Date: <b>{lic.purchased_at.strftime("%B %d, %Y")}</b>', styles['Normal']))
        story.append(Spacer(1, 0.2*inch))

        # Parties
        story.append(Paragraph('PARTIES', styles['Heading2']))
        data = [
            ['Producer (Licensor):', producer.username if producer else str(lic.producer_id)],
            ['Buyer (Licensee):', buyer.username if buyer else str(lic.buyer_id)],
            ['Beat Title:', lic.beat_title],
            ['Amount Paid:', f'${lic.price_paid:.2f}'],
        ]
        t = Table(data, colWidths=[2.5*inch, 4*inch])
        t.setStyle(TableStyle([
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.white, colors.HexColor('#f5f5f5')]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.2*inch))

        # Rights
        story.append(Paragraph('RIGHTS GRANTED', styles['Heading2']))
        rights_data = [
            ['Streams Allowed:', terms.get('streams', 'N/A')],
            ['Distribution:', terms.get('distribution', 'N/A')],
            ['Radio Broadcasting:', 'Yes' if terms.get('radio') else 'No'],
            ['Video/Film Use:', 'Yes' if terms.get('video') else 'No'],
            ['Exclusive Rights:', 'Yes' if terms.get('exclusive') else 'No'],
        ]
        t2 = Table(rights_data, colWidths=[2.5*inch, 4*inch])
        t2.setStyle(TableStyle([
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.white, colors.HexColor('#f5f5f5')]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t2)
        story.append(Spacer(1, 0.2*inch))

        story.append(Paragraph('TERMS', styles['Heading2']))
        story.append(Paragraph(terms.get('description', ''), styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph(
            'This license is issued by StreamPireX. The licensee may use the beat '
            'in accordance with the rights granted above. Unauthorized use beyond '
            'these terms constitutes copyright infringement.',
            styles['Normal']))

        doc.build(story)
        buf.seek(0)
        return send_file(buf, mimetype='application/pdf',
                         as_attachment=True,
                         download_name=f'license_{license_number}.pdf')

    except ImportError:
        # Fallback: plain text license
        text = f"""STREAMPIREX BEAT LICENSE AGREEMENT
=====================================
License #: {lic.license_number}
License Type: {lic.license_type.upper()}
Date: {lic.purchased_at.strftime('%B %d, %Y')}

PRODUCER: {producer.username if producer else lic.producer_id}
BUYER: {buyer.username if buyer else lic.buyer_id}
BEAT: {lic.beat_title}
AMOUNT PAID: ${lic.price_paid:.2f}

RIGHTS GRANTED:
- Streams: {terms.get('streams','N/A')}
- Distribution: {terms.get('distribution','N/A')}
- Radio: {'Yes' if terms.get('radio') else 'No'}
- Video: {'Yes' if terms.get('video') else 'No'}
- Exclusive: {'Yes' if terms.get('exclusive') else 'No'}

TERMS: {terms.get('description','')}

This license is issued by StreamPireX.
"""
        buf = io.BytesIO(text.encode('utf-8'))
        return send_file(buf, mimetype='text/plain',
                         as_attachment=True,
                         download_name=f'license_{license_number}.txt')

# GET /api/beat-license/my-licenses
@beat_license_bp.route('/api/beat-license/my-licenses', methods=['GET'])
@jwt_required()
def my_licenses():
    buyer_id = get_jwt_identity()
    lics = BeatLicense.query.filter_by(buyer_id=buyer_id).order_by(
        BeatLicense.purchased_at.desc()).all()
    return jsonify([{
        'id': l.id, 'beat_title': l.beat_title,
        'license_type': l.license_type, 'license_number': l.license_number,
        'price_paid': l.price_paid, 'purchased_at': l.purchased_at.isoformat(),
        'is_exclusive': l.is_exclusive,
    } for l in lics]), 200
