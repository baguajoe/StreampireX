  
import os
from flask_admin import Admin
from api.models import db, User, PodcastEpisode, PodcastSubscription, StreamingHistory, RadioPlaylist, RadioStation, LiveStream, LiveChat, CreatorMembershipTier, CreatorDonation, AdRevenue, SubscriptionPlan, UserSubscription, Video, VideoPlaylist, VideoPlaylistVideo, Audio, PlaylistAudio, PricingPlan, Subscription, FavoritePage 
from flask_admin.contrib.sqla import ModelView

def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
    admin = Admin(app, name='4Geeks Admin', template_mode='bootstrap3')

    
    # Add your models here, for example this is how we add a the User model to the admin
    # Register models in Flask-Admin
    admin.add_view(ModelView(User, db.session))
    admin.add_view(ModelView(PodcastEpisode, db.session))
    admin.add_view(ModelView(PodcastSubscription, db.session))
    admin.add_view(ModelView(StreamingHistory, db.session))
    admin.add_view(ModelView(RadioPlaylist, db.session))
    admin.add_view(ModelView(RadioStation, db.session))
    admin.add_view(ModelView(LiveStream, db.session))
    admin.add_view(ModelView(LiveChat, db.session))
    admin.add_view(ModelView(CreatorMembershipTier, db.session))
    admin.add_view(ModelView(CreatorDonation, db.session))
    admin.add_view(ModelView(AdRevenue, db.session))
    admin.add_view(ModelView(SubscriptionPlan, db.session))
    admin.add_view(ModelView(UserSubscription, db.session))
    admin.add_view(ModelView(Video, db.session))
    admin.add_view(ModelView(VideoPlaylist, db.session))
    admin.add_view(ModelView(VideoPlaylistVideo, db.session))
    admin.add_view(ModelView(Audio, db.session))
    admin.add_view(ModelView(PlaylistAudio, db.session))
    admin.add_view(ModelView(PricingPlan, db.session))
    admin.add_view(ModelView(Subscription, db.session))
    admin.add_view(ModelView(FavoritePage, db.session))



    # You can duplicate that line to add mew models
    # admin.add_view(ModelView(YourModelName, db.session))