import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import injectContext, { Context } from "./store/appContext";

import Home from "./pages/home";
import Login from "./pages/Login";
import { Signup } from "./pages/Signup";

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
import PodcastDetailPage from "./pages/PodcastDetailPage";

import LiveStreamPage from "./pages/LiveStreams";
import LiveConcerts from "./pages/LiveConcerts";
import LiveShowPage from "./pages/LiveShowPage";
import LabelDashboard from "./pages/LabelDashboard";
import ReleaseList from "./pages/ReleaseList";

// ✅ Temporary placeholders
const CollaboratorSplitPage = () => (
  <div className="page-container">
    <h1>Collaborator Split Management</h1>
    <p>This page is under development.</p>
  </div>
);

const AlbumDetailPage = () => (
  <div className="page-container">
    <h1>Album Details</h1>
    <p>This page is under development.</p>
  </div>
);

// ✅ Gamer placeholders
// const GamersChatroomPage = () => (
//   <div className="page-container">
//     <h1>🎮 Gamers Chatroom</h1>
//     <p>Chat with other players by game type.</p>
//   </div>
// );


const EditGamerProfilePage = () => (
  <div className="page-container">
    <h1>✏️ Edit Gamer Profile</h1>
    <p>Edit your gamer identity.</p>
  </div>
);

const TeamRoomPage = () => (
  <div className="page-container">
    <h1>🧑‍🤝‍🧑 Team Room</h1>
    <p>Private squad room with stream sharing and chat.</p>
  </div>
);

const SquadFinderPage = () => (
  <div className="page-container">
    <h1>🔍 Squad Finder</h1>
    <p>Search for active squads by game and platform.</p>
  </div>
);

const CreateTeamRoomPage = () => (
  <div className="page-container">
    <h1>➕ Create Team Room</h1>
    <p>Set up a new squad with invite-only access.</p>
  </div>
);

const Layout = () => {
  const basename = process.env.BASENAME || "";

  // ✅ Pull user from context
  const { store } = useContext(Context);
  const user = store.user;

  if (!process.env.BACKEND_URL || process.env.BACKEND_URL === "")
    return <BackendURL />;

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
              <Route path="/register" element={<Signup />} />

              {/* 🎧 Podcasts */}
              <Route path="/podcast-dashboard" element={<PodcastDashboard />} />
              <Route path="/podcast-create" element={<PodcastCreate />} />
              <Route path="/podcasts" element={<PodcastPage />} />
              <Route path="/browse-podcast-categories" element={<BrowsePodcastCategories />} />
              <Route path="/podcast/episode/:id" element={<PodcastEpisodePage />} />
              <Route path="/podcast/profile/:username/:podcastId" element={<PodcastProfile />} />
              <Route path="/podcast-category/:category" element={<PodcastCategoryPage />} />
              <Route path="/podcast/:podcast_id" element={<PodcastDetailPage />} />

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
              <Route path="/search" element={<SearchArtists />} />
              <Route path="/artist-profile/:id" element={<ArtistProfile />} />

              {/* 📺 Live Streaming */}
              <Route path="/live-streams" element={<LiveStreamPage />} />
              <Route path="/live-concerts" element={<LiveConcerts />} />
              <Route path="/live-show/:id" element={<LiveShowPage />} />
              <Route path="/label-dashboard" element={<LabelDashboard />} />

              {/* 👤 User */}
              <Route path="/home-feed" element={<HomeFeed />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />

              {/* 🎮 Gamers */}
              <Route path="/gamers/chat" element={<GamersChatroomPage />} />
              <Route path="/profile/gamer" element={<GamerProfilePage />} />
              <Route path="/profile/gamer/edit" element={<EditGamerProfilePage />} />
              <Route path="/team-room" element={<TeamRoomPage />} />
              <Route path="/squad-finder" element={<SquadFinderPage />} />
              <Route path="/create-team-room" element={<CreateTeamRoomPage />} />

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
