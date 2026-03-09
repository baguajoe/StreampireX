import React, { useContext, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import injectContext, { Context } from "./store/appContext";
import { initializeAdvancedPWAFeatures } from './component/AdvancedPWAFeatures';

import { Toaster } from "react-hot-toast";


import Home from "./pages/home";
import Login from "./pages/Login";
import SignupForm from "./component/SignupForm";

import SellerDashboard from "./pages/SellerDashboard";
import PodcastDashboard from "./pages/PodcastDashboard";
import PodcastCreate from "./pages/PodcastCreate";
import PodcastPage from "./pages/PodcastDetailPage";
import BrowsePodcastCategories from "./pages/BrowsePodcastCategories";
import PodcastEpisodePage from "./pages/PodcastEpisodePage";
import PodcastProfile from "./pages/PodcastProfile";
import PodcastCategoryPage from "./pages/PodcastCategoryPage";
import BrowseVideosPage from "./pages/BrowseVideosPage";
import HomeFeed from "./pages/HomeFeed";
import RadioStationDetailPage from "./component/RadioStationDetailPage";
import GamerProfilePage from "./pages/GamerProfilePage";
import GamersChatroomPage from "./pages/GamersChatroomPage";
// Add these imports at the top of your layout.js
import EditArtistProfilePage from "./pages/EditArtistProfilePage";
import AlbumDetailPage from "./pages/AlbumDetailPage";
import VideoChannelDashboard from "./pages/VideoChannelDashboard";
import VideoChannelProfile from "./pages/VideoChannelProfile";
import MyVideoChannel from "./pages/MyVideoChannel";
import RadioSchedule from "./pages/RadioSchedule";
import DiscoverUsersPage from "./pages/DiscoverUsersPage";
import GoLivePage from './pages/GoLivePage';
import CreateClipPage from './pages/CreateClipPage';
import FloatingVideoCall from "./component/FloatingVideoCall";
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import AIMasteringPage from "./pages/AIMasteringPage";       // ✅ correct
import AIRadioDJPage from "./pages/AIRadioDJPage";
import AIRadioDJ from "./component/AIRadioDJ";
import AIContentWriter from "./pages/AIContentWriter";
import AIStemSeparation from "./pages/AIStemSeparation";
import AIVideoStudio from "./pages/AIVideoStudio";
import EPKCollabHub from "./pages/EPKCollabHub";
import { PublicEPKPage } from "./pages/PublicEPK";
import VoiceCloneServices from './pages/VoiceCloneServices';
import PluginRackDemo from './pages/PluginRackDemo.js';
import PodcastStudio from "./pages/PodcastStudio";
import PodcastGuestJoin from "./pages/PodcastGuestJoin";
// Phase 2: Async guest recording page (standalone, no auth)
import { AsyncGuestRecordPage } from "./pages/PodcastStudioPhase2";
import PodcastCollabRoom from "./component/PodcastCollabRoom";
import WAMPluginStore from './pages/WAMPluginStore';
import AITextToSong from './pages/AITextToSong';
import AddVocalsToTrack from './pages/AddVocalsToTrack';
import AddBeatToVocals from './pages/AddBeatToVocals';
import SongExtender from './pages/SongExtender';
import HumToSong from './pages/HumToSong';
import CreatorSampleMarketplace from './pages/CreatorSampleMarketplace';
import CreatorAcademy from './pages/CreatorAcademy';
import CollabMarketplace from './pages/CollabMarketplace';
import JamTrackLibrary from './pages/JamTrackLibrary';
import QuickCaptureMode from './pages/QuickCaptureMode';
import AIThumbnailMaker from './pages/AIThumbnailMaker';
import AIEPKWriter from './pages/AIEPKWriter';
import AIPromoGenerator from './pages/AIPromoGenerator';


import VideoUpload from "./pages/VideoUpload";
import VideoDetails from "./component/VideoDetails";
import ReelsFeed from './pages/ReelsFeed';
import MyReels from './pages/MyReels';
import UploadReel from './pages/UploadReel';
import RadioStationDashboard from "./pages/RadioStationDashboard";
import RadioStationPage from "./pages/RadioStations";
import CreateRadioStation from "./pages/CreateRadioStation";
import BrowseRadioStations from "./pages/BrowseRadioStations";
import ArtistRadioStation from "./pages/ArtistRadioStation";
import CreatorDashboard from "./pages/CreatorDashboard";
import FavoritesPage from "./pages/FavoritesPage";
import TeamRoomPage from "./pages/TeamRoomPage";
import PricingPlans from "./pages/PricingPlans";
import TipJarPage from "./pages/TipJarPage";

import ArtistDashboard from "./pages/ArtistDashboard";
import UploadMusic from "./pages/UploadMusic";
import UserSearchProfilePage from "./pages/UserSearchProfilePage";

import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import { Footer } from "./component/footer";
import Navbar from "./component/navbar";
import Sidebar from "./component/sidebar";
import { BackendURL } from "./component/backendURL";
import CreateReleasePage from "./pages/CreateReleasePage";
import LyricsUploadPage from "./pages/LyricsUploadPage";
import PodcastDetailPage from "./pages/PodcastDetailPage";
import SquadFinderPage from "./pages/SquadFinderPage";
import MusicDistribution from "./pages/MusicDistribution";
// Store/Marketplace Components
import ProductDetailPage from "./pages/ProductDetailPage";
import ShoppingCart from "./pages/ShoppingCart";
import CheckoutPage from "./pages/CheckoutPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import SalesDashboard from "./pages/SalesDashboard";
import Marketplace from "./pages/Marketplace";
import StorefrontPage from "./pages/StorefrontPage";
import BeatStorePage from "./pages/BeatStorePage";
import BeatDetailPage from "./pages/BeatDetailPage";
import ProducerProfilePage from "./pages/ProducerProfilePage";
import BrowseProducersPage from "./pages/BrowseProducersPage";
import SellBeatsPage from "./pages/SellBeatsPage";
import TechSupportPage from "./pages/TechSupportPage";

import LiveStreamPage from "./pages/LiveStreams";
import LiveConcerts from "./pages/LiveConcerts";
import LiveShowPage from "./pages/LiveShowPage";
import LiveStreamViewer from './pages/LiveStreamViewer';
import ReleaseList from "./pages/ReleaseList";

import UserVideoChannelPage from "./pages/UserVideoChannelPage";
import ArtistProfilePage from "./pages/ArtistProfilePage";
import CollaboratorSplitPage from "./pages/CollaboratorSplitPage";
import VideoEditor from "./pages/VideoEditor";
import RecordingStudio from "./pages/RecordingStudio";

import EditGamerProfilePage from "./pages/EditGamerProfilePage";
import CreateTeamRoomPage from "./pages/CreateTeamRoomPage";
import ContentLibrary from "./pages/ContentLibrary";
import StoryViewer from "./pages/StoryViewer";
import StoryUpload from "./pages/StoryUpload";
import VideoSeriesBuilder from "./pages/VideoSeriesBuilder";
import { CreatorMembershipManager, FanMembershipPage } from "./pages/FanMembership";
import { CollabBrowsePage, CollabInbox } from "./pages/CollabRequests";
import PayoutDashboard from "./pages/PayoutDashboard";
import { SearchPage, ExplorePage } from "./pages/GlobalSearch";
import { BrowseStemsPage, SellStemsPage } from "./pages/StemsStore";

// ✨ NEW: Unified Dashboard
import { Dashboard } from "./pages/Dashboard";

const Layout = () => {
  const basename = process.env.BASENAME || "";

  // Pull user from context
  const { store } = useContext(Context);
  const user = store.user;

  useEffect(() => {
    initializeAdvancedPWAFeatures();
  }, []);

  // if (!process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL === "")
  // return <BackendURL />;

  // rest of your component...

  return (
    <Router basename={basename}>
      {/* 🔥 TOAST NOTIFICATIONS - Add this right after Router */}
      <Toaster />

      <ScrollToTop>
        <Navbar />
        <div className="app-layout">
          <Sidebar user={user} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignupForm />} />

              {/* 💰 Pricing Routes - Both paths for compatibility */}
              <Route path="/pricing" element={<PricingPlans />} />
              <Route path="/pricing/plans" element={<PricingPlans />} />
              <Route path="/pricing-plans" element={<PricingPlans />} />

              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/storefront" element={<StorefrontPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrderHistoryPage />} />
              <Route path="/cart" element={<ShoppingCart />} />
              <Route path="/support/:username" element={<TipJarPage />} />
              <Route path="/tip/:username" element={<TipJarPage />} />

              {/* ✨ NEW: Unified Dashboard with nested routes */}
              <Route path="/dashboard/*" element={<Dashboard />} />

              {/* 🔄 Redirects from old dashboard routes to new unified dashboard */}
              <Route path="/creator-dashboard" element={<Navigate to="/dashboard" replace />} />
              <Route path="/artist-dashboard" element={<Navigate to="/dashboard/music" replace />} />
              <Route path="/podcast-dashboard" element={<Navigate to="/dashboard/podcasts" replace />} />
              <Route path="/radio-dashboard" element={<Navigate to="/dashboard/radio" replace />} />
              <Route path="/video-dashboard" element={<Navigate to="/dashboard/videos" replace />} />
              <Route path="/sales-dashboard" element={<Navigate to="/dashboard/store" replace />} />
              <Route path="/ai-mastering" element={<AIMasteringPage />} />
              <Route path="/ai-radio-dj" element={<AIRadioDJPage />} />
              <Route path="/ai-radio-dj/:stationId" element={<AIRadioDJ />} />
              <Route path="/ai-writer" element={<AIContentWriter />} />
              <Route path="/recording-studio" element={<RecordingStudio />} />
              <Route path="/ai-stems" element={<AIStemSeparation />} />
              <Route path="/ai-video-studio" element={<AIVideoStudio />} />
              <Route path="/plugin-demo" element={<PluginRackDemo />} />
              <Route path="/beats/:beatId" element={<BeatDetailPage />} />
              <Route path="/producer/:id" element={<ProducerProfilePage />} />
              <Route path="/producers" element={<BrowseProducersPage />} />
              <Route path="/sell-beats" element={<SellBeatsPage />} />
              <Route path="/podcast-studio" element={<PodcastStudio />} />
              <Route path="/podcast-join/:sessionId" element={<PodcastGuestJoin />} />
              <Route path="/podcast-async/:linkId" element={<AsyncGuestRecordPage />} />
              <Route path="/support" element={<TechSupportPage />} />
              <Route path="/video-series/new" element={<VideoSeriesBuilder />} />
              <Route path="/video-series/:id/edit" element={<VideoSeriesBuilder />} />
              <Route path="/creator/membership" element={<CreatorMembershipManager />} />
              <Route path="/fan/membership/:creatorId" element={<FanMembershipPage />} />
              <Route path="/collab/browse" element={<Navigate to="/collab-marketplace" replace />} />
              <Route path="/collab/inbox" element={<Navigate to="/collab-marketplace" replace />} />
              <Route path="/payouts" element={<PayoutDashboard />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/stems" element={<BrowseStemsPage />} />
              <Route path="/stems/sell" element={<SellStemsPage />} />
              <Route path="/plugin-store" element={<WAMPluginStore />} />
              <Route path="/ai-song" element={<AITextToSong />} />
              <Route path="/ai-add-vocals" element={<AddVocalsToTrack />} />
              <Route path="/ai-add-beat" element={<AddBeatToVocals />} />
              <Route path="/ai-extend-song" element={<SongExtender />} />
              <Route path="/hum-to-song" element={<HumToSong />} />
              <Route path="/sample-marketplace" element={<CreatorSampleMarketplace />} />
              <Route path="/academy" element={<CreatorAcademy />} />
              <Route path="/collab-marketplace" element={<CollabMarketplace />} />
              <Route path="/jam-tracks" element={<JamTrackLibrary />} />
              <Route path="/quick-record" element={<QuickCaptureMode />} />
              <Route path="/ai-thumbnail" element={<AIThumbnailMaker />} />
              <Route path="/ai-epk-writer" element={<AIEPKWriter />} />
              <Route path="/ai-promo" element={<AIPromoGenerator />} />


              {/* Video Channel Routes */}
              <Route path="/profile/video" element={<VideoChannelProfile />} />
              <Route path="/my-channel" element={<MyVideoChannel />} />
              <Route path="/upload-video" element={<VideoUpload />} />
              <Route path="/video-editor" element={<VideoEditor />} />
              <Route path="/video-details/:id" element={<VideoDetails />} />
              <Route path="/live-streams/:id" element={<LiveStreamViewer />} />

              {/* 🔍 Discover Users - Main route + redirects from old routes */}
              <Route path="/discover-users" element={<DiscoverUsersPage />} />
              <Route path="/search-artists" element={<Navigate to="/discover-users" replace />} />
              <Route path="/browse-users" element={<Navigate to="/discover-users" replace />} />

              {/* 📊 Radio Schedule */}
              <Route path="/radio/:id/schedule" element={<RadioSchedule />} />

              {/* 🎧 Podcasts */}
              <Route path="/podcast-create" element={<PodcastCreate />} />
              <Route path="/podcasts" element={<PodcastPage />} />
              <Route path="/browse-podcast-categories" element={<BrowsePodcastCategories />} />
              <Route path="/podcast/episode/:id" element={<PodcastEpisodePage />} />
              <Route path="/podcast/profile/:username/:podcastId" element={<PodcastProfile />} />
              <Route path="/podcast-category/:category" element={<PodcastCategoryPage />} />
              <Route path="/podcast/:id" element={<PodcastDetailPage />} />
              <Route path="/user/:userId/videos" element={<UserVideoChannelPage />} />


              {/* 📻 Radio Stations */}
              <Route path="/radio-stations" element={<RadioStationPage />} />
              <Route path="/create-radio" element={<CreateRadioStation />} />
              <Route path="/browse-radio-stations" element={<BrowseRadioStations />} />
              <Route path="/radio/:type/:id" element={<RadioStationDetailPage />} />

              {/* 🎬 Videos & Stories */}
              <Route path="/videos" element={<BrowseVideosPage />} />
              <Route path="/go-live" element={<GoLivePage />} />
              <Route path="/create-clip" element={<CreateClipPage />} />
              <Route path="/stories/create" element={<StoryUpload />} />
              <Route path="/stories/:userId" element={<StoryViewer />} />
              <Route path="/my-reels" element={<MyReels />} />
              <Route path="/reels" element={<ReelsFeed />} />
              <Route path="/reels/:id" element={<ReelsFeed />} />
              <Route path="/upload-reel" element={<UploadReel />} />
              <Route path="/voice-services" element={<VoiceCloneServices />} />

              {/* 💿 Releases */}
              <Route path="/create-release" element={<CreateReleasePage />} />
              <Route path="/releases" element={<ReleaseList />} />
              <Route path="/upload-lyrics" element={<LyricsUploadPage />} />
              <Route path="/album/:albumId" element={<AlbumDetailPage />} />
              <Route path="/collaborator-splits" element={<CollaboratorSplitPage />} />
              <Route path="/epk-hub" element={<EPKCollabHub />} />
              <Route path="/epk/:slug" element={<PublicEPKPage />} />

              {/* 🎤 Indie Artists */}
              <Route path="/upload-music" element={<UploadMusic />} />
              <Route path="/music-distribution" element={<MusicDistribution />} />

              {/* 👤 Public User Profile (for viewing other users) */}
              <Route path="/user/:userId" element={<ProfilePage />} />
              <Route path="/user/u/:username" element={<UserSearchProfilePage />} />
              <Route path="/artist/:id" element={<ArtistProfilePage />} />
              <Route path="/artist-profile/:id" element={<ArtistProfilePage />} />

              <Route path="/beats" element={<BeatStorePage />} />

              {/* 📺 Live Streaming */}
              <Route path="/live-streams" element={<LiveStreamPage />} />
              <Route path="/live-concerts" element={<LiveConcerts />} />
              <Route path="/live-show/:id" element={<LiveShowPage />} />

              {/* 👤 User - ALL PROFILE TYPES */}
              <Route path="/home-feed" element={<HomeFeed />} />
              <Route path="/content-library" element={<ContentLibrary />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/artist" element={<ArtistProfilePage />} />
              <Route path="/profile/artist/edit" element={<EditArtistProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />

              {/* 🎮 Gamers */}
              <Route path="/gamers/chat" element={<GamersChatroomPage />} />
              <Route path="/profile/gamer" element={<GamerProfilePage />} />
              <Route path="/profile/gamer/edit" element={<EditGamerProfilePage />} />
              <Route path="/team-room" element={<TeamRoomPage />} />
              <Route path="/squad-finder" element={<SquadFinderPage />} />
              <Route path="/create-team-room" element={<CreateTeamRoomPage />} />

              {/* 🎵 Additional Artist Routes (Optional) */}
              <Route path="/artist/upload" element={<UploadMusic />} />
              <Route path="/artist/analytics" element={<Navigate to="/dashboard/music" replace />} />

              <Route path="/seller-dashboard" element={<SellerDashboard />} />

              {/* 🔔 Notifications */}
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* 💳 Subscription */}
              <Route path="/subscription/success" element={<SubscriptionSuccess />} />

              {/* 404 Fallback */}
                            <Route path="/plugin-store" element={<WAMPluginStore />} />
              <Route path="*" element={<h1>Not found!</h1>} />

            </Routes>
            <FloatingVideoCall currentUser={user} />
          </main>
        </div>
        <Footer />
      </ScrollToTop>
    </Router>
  );
};

export default injectContext(Layout);