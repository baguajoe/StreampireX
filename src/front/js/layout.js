import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import injectContext, { Context } from "./store/appContext";

import Home from "./pages/home";
import Login from "./pages/Login";
import SignupForm from "./component/SignupForm";

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
import VideoUpload from "./pages/VideoUpload";

import RadioStationDashboard from "./pages/RadioStationDashboard";
import RadioStationPage from "./pages/RadioStations";
import CreateRadioStation from "./pages/CreateRadioStation";
import BrowseRadioStations from "./pages/BrowseRadioStations";
import ArtistRadioStation from "./pages/ArtistRadioStation";
import CreatorDashboard from "./pages/CreatorDashboard";
import FavoritesPage from "./pages/FavoritesPage";
import TeamRoomPage from "./pages/TeamRoomPage";
import PricingPlans from "./pages/PricingPlans";

import ArtistDashboard from "./pages/ArtistDashboard";
import UploadMusic from "./pages/UploadMusic";
import SearchArtists from "./pages/BrowseProfile";

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

import LiveStreamPage from "./pages/LiveStreams";
import LiveConcerts from "./pages/LiveConcerts";
import LiveShowPage from "./pages/LiveShowPage";
import LabelDashboard from "./pages/LabelDashboard";
import ReleaseList from "./pages/ReleaseList";

import UserVideoChannelPage from "./pages/UserVideoChannelPage";
import ArtistProfilePage from "./pages/ArtistProfilePage";
import CollaboratorSplitPage from "./pages/CollaboratorSplitPage";

import EditGamerProfilePage from "./pages/EditGamerProfilePage";
import CreateTeamRoomPage from "./pages/CreateTeamRoomPage";

const Layout = () => {
  const basename = process.env.BASENAME || "";

  // Pull user from context
  const { store } = useContext(Context);
  const user = store.user;

  if (!process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL === "")
    return <BackendURL />;

  // rest of your component...

  return (
    <Router basename={basename}>
      <ScrollToTop>
        <Navbar />
        <div className="app-layout">
          <Sidebar user={user} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<SignupForm />} />

              {/* 💰 Pricing Routes - Both paths for compatibility */}
              <Route path="/pricing" element={<PricingPlans />} />
              <Route path="/pricing/plans" element={<PricingPlans />} />
              <Route path="/pricing-plans" element={<PricingPlans />} />

              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/storefront" element={<StorefrontPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrderHistoryPage />} />
              <Route path="/sales-dashboard" element={<SalesDashboard />} />
              <Route path="/cart" element={<ShoppingCart />} />
              // Video Channel Routes
              <Route path="/video-dashboard" element={<VideoChannelDashboard />} />
              <Route path="/profile/video" element={<VideoChannelProfile />} />
              <Route path="/my-channel" element={<MyVideoChannel />} />
              <Route path="/upload-video" element={<VideoUpload />} />


              {/* 📊 Dashboards */}
              <Route path="/creator-dashboard" element={<CreatorDashboard />} />

              {/* 🎧 Podcasts */}
              <Route path="/podcast-dashboard" element={<PodcastDashboard />} />
              <Route path="/podcast-create" element={<PodcastCreate />} />
              <Route path="/podcasts" element={<PodcastPage />} />
              <Route path="/browse-podcast-categories" element={<BrowsePodcastCategories />} />
              <Route path="/podcast/episode/:id" element={<PodcastEpisodePage />} />
              <Route path="/podcast/profile/:username/:podcastId" element={<PodcastProfile />} />
              <Route path="/podcast-category/:category" element={<PodcastCategoryPage />} />
              <Route path="/podcast/:podcast_id" element={<PodcastDetailPage />} />
              <Route path="/user/:userId/videos" element={<UserVideoChannelPage />} />


              {/* 📻 Radio Stations */}
              <Route path="/radio-dashboard" element={<RadioStationDashboard />} />
              <Route path="/radio-stations" element={<RadioStationPage />} />
              <Route path="/create-radio" element={<CreateRadioStation />} />
              <Route path="/browse-radio-stations" element={<BrowseRadioStations />} />
              <Route path="/radio/station/:id/:type" element={<RadioStationDetailPage />} />

              {/* 🎬 Videos */}
              <Route path="/videos" element={<BrowseVideosPage />} />

              {/* 💿 Releases */}
              <Route path="/create-release" element={<CreateReleasePage />} />
              <Route path="/releases" element={<ReleaseList />} />
              <Route path="/upload-lyrics" element={<LyricsUploadPage />} />
              <Route path="/album/:albumId" element={<AlbumDetailPage />} />
              <Route path="/collaborator-splits" element={<CollaboratorSplitPage />} />

              {/* 🎤 Indie Artists */}
              <Route path="/artist-dashboard" element={<ArtistDashboard />} />
              <Route path="/upload-music" element={<UploadMusic />} />
              <Route path="/music-distribution" element={<MusicDistribution />} />
              <Route path="/search" element={<SearchArtists />} />
              <Route path="/artist-profile/:id" element={<ArtistProfilePage />} />

              {/* 📺 Live Streaming */}
              <Route path="/live-streams" element={<LiveStreamPage />} />
              <Route path="/live-concerts" element={<LiveConcerts />} />
              <Route path="/live-show/:id" element={<LiveShowPage />} />
              <Route path="/label-dashboard" element={<LabelDashboard />} />

              {/* 👤 User - ALL PROFILE TYPES */}
              <Route path="/home-feed" element={<HomeFeed />} />
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
              <Route path="/artist/analytics" element={<ArtistDashboard />} />

              {/* 🔔 Notifications */}
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* 404 Fallback */}
              <Route path="*" element={<h1>Not found!</h1>} />
            </Routes>
          </main>
        </div>
        <Footer />
      </ScrollToTop>
    </Router>
  );
};

export default injectContext(Layout);