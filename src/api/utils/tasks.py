# tasks.py
from api.utils.revelator_api import submit_release_to_revelator
from api.extensions import db
from api.models import db, Release


def send_release_to_revelator(release_id, payload):
    from app import create_app
    app = create_app()
    with app.app_context():
        external_id = submit_release_to_revelator(payload)
        release = Release.query.get(release_id)
        if external_id:
            release.external_id = external_id
            db.session.commit()
