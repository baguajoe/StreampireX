from datetime import datetime
from collections import defaultdict
from api.models import db, MusicInteraction  # Import db and MusicInteraction

def generate_monthly_report():
    # Aggregate the music usage data for the past month
    start_date = datetime.now().replace(day=1)  # First day of the current month
    end_date = datetime.now()  # Current date

    interactions = db.session.query(
        MusicInteraction.music_id,
        db.func.sum(MusicInteraction.play_count).label('total_plays'),
        db.func.sum(MusicInteraction.download_count).label('total_downloads')
    ).filter(MusicInteraction.timestamp.between(start_date, end_date))\
     .group_by(MusicInteraction.music_id).all()

    report_data = defaultdict(lambda: {"plays": 0, "downloads": 0})

    for interaction in interactions:
        report_data[interaction.music_id]["plays"] = interaction.total_plays
        report_data[interaction.music_id]["downloads"] = interaction.total_downloads

    # Print or log the report data
    print(f"Music Usage Report for {start_date.strftime('%B %Y')}:")
    for music_id, data in report_data.items():
        print(f"Music ID: {music_id} | Plays: {data['plays']} | Downloads: {data['downloads']}")

    # You could save this to a file or database
    # Example: Save as CSV or JSON format for exporting to BMI/ASCAP
    return report_data
