import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import injectContext from "./store/appContext";

import  Home  from "./pages/home";
import Login from "./pages/Login";
import { Signup } from "./pages/Signup";

import PodcastDashboard from "./pages/PodcastDashboard";
import PodcastCreate from "./pages/PodcastCreate";
import PodcastPage from "./pages/PodcastPage";
import BrowsePodcastCategories from "./pages/BrowsePodcastCategories";
import PodcastEpisodePage from "./pages/PodcastEpisodePage";
import PodcastProfile from "./pages/PodcastProfile";
import PodcastCategoryPage from "./pages/PodcastCategoryPage";
import BrowseVideosPage from "./pages/BrowseVideosPage";

import RadioStationDashboard from "./pages/RadioStationDashboard";
import RadioStationPage from "./pages/RadioStations";
import CreateRadioStation from "./pages/CreateRadioStation";
import BrowseRadioStations from "./pages/BrowseRadioStations";
import ArtistRadioStation from "./pages/ArtistRadioStation";
import CreatorDashboard from "./pages/CreatorDashboard";
import FavoritesPage from "./pages/FavoritesPage";

import ArtistDashboard from "./pages/ArtistDashboard";
import UploadMusic from "./pages/UploadMusic";
import SearchArtists from "./pages/BrowseProfile";
import ArtistProfile from "./pages/ArtistProfile";

import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import { Footer } from "./component/footer";
import Navbar from "./component/navbar";
import Sidebar from "./component/sidebar";
import { BackendURL } from "./component/backendURL";
import CreateReleasePage from "./pages/CreateReleasePage";
import LyricsUploadPage from "./pages/LyricsUploadPage";

// ✅ Live Streaming Pages
import LiveStreamPage from "./pages/LiveStreams";
import LiveConcerts from "./pages/LiveConcerts";
import LiveShowPage from "./pages/LiveShowPage";

// ✅ FIXED: Add missing component imports
import ReleaseList from "./pages/ReleaseList";

// ✅ TEMPORARY: Create placeholder components for missing pages
// You can create these actual components later
const CollaboratorSplitPage = () => (
  <div className="page-container">
    <h1>Collaborator Split Management</h1>
    <p>This page is under development. You can manage collaborator revenue splits here.</p>
  </div>
);

const AlbumDetailPage = () => (
  <div className="page-container">
    <h1>Album Details</h1>
    <p>This page is under development. Album details will be displayed here.</p>
  </div>
);

const Layout = () => {
  const basename = process.env.BASENAME || "";

  if (!process.env.BACKEND_URL || process.env.BACKEND_URL === "") return <BackendURL />;

  return (
    <Router basename={basename}>
      <ScrollToTop>
        <Navbar />
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Signup />} />

              {/* 🎧 Podcasts */}
              <Route path="/podcast-dashboard" element={<PodcastDashboard />} />
              <Route path="/podcast-create" element={<PodcastCreate />} />
              <Route path="/podcasts" element={<PodcastPage />} />
              <Route path="/browse-podcast-categories" element={<BrowsePodcastCategories />} />
              <Route path="/podcast/episode/:id" element={<PodcastEpisodePage />} />
              <Route path="/podcast/profile/:username/:podcastId" element={<PodcastProfile />} />
              <Route path="/podcast-category/:category" element={<PodcastCategoryPage />} />
              <Route path="/creator-dashboard" element={<CreatorDashboard />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/videos" element={<BrowseVideosPage />} />
              <Route path="/create-release" element={<CreateReleasePage />} />
              
              {/* ✅ FIXED: Now ReleaseList is properly imported */}
              <Route path="/releases" element={<ReleaseList />} />
              
              <Route path="/upload-lyrics" element={<LyricsUploadPage />} />
              
              {/* ✅ FIXED: Added placeholder components */}
              <Route path="/collaborator-splits" element={<CollaboratorSplitPage />} />
              <Route path="/album/:albumId" element={<AlbumDetailPage />} />

              {/* 📻 Radio Stations */}
              <Route path="/radio-dashboard" element={<RadioStationDashboard />} />
              <Route path="/radio-stations" element={<RadioStationPage />} />
              <Route path="/create-radio" element={<CreateRadioStation />} />
              <Route path="/browse-radio-stations" element={<BrowseRadioStations />} />

              {/* 🎤 Indie Artists */}
              <Route path="/artist-dashboard" element={<ArtistDashboard />} />
              <Route path="/upload-music" element={<UploadMusic />} />
              <Route path="/search" element={<SearchArtists />} />
              <Route path="/artist-profile/:id" element={<ArtistProfile />} />

              {/* 📺 Live Streaming */}
              <Route path="/live-streams" element={<LiveStreamPage />} />
              <Route path="/live-concerts" element={<LiveConcerts />} />
              <Route path="/live-show/:id" element={<LiveShowPage />} />

              {/* 👤 User */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* 💰 Monetization */}

              {/* 404 */}
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