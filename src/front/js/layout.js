import React, { useState, useEffect, useContext } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation,
    Link
} from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import injectContext, { Context } from "./store/appContext";
import { initializeAdvancedPWAFeatures } from "./component/AdvancedPWAFeatures";
import { Toaster } from "react-hot-toast";

// --- Page Imports (Ensure these exist in your /pages folder) ---
import Home from "./pages/home";
import Login from "./pages/Login";
import SignupForm from "./component/SignupForm";
import CreatorDashboard from "./pages/CreatorDashboard";
import { Dashboard } from "./pages/Dashboard";
import ComparePage from "./pages/ComparePage";

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
import EditArtistProfilePage from "./pages/EditArtistProfilePage";
import AlbumDetailPage from "./pages/AlbumDetailPage";
import VideoChannelDashboard from "./pages/VideoChannelDashboard";
import VideoChannelProfile from "./pages/VideoChannelProfile";
import MyVideoChannel from "./pages/MyVideoChannel";
import RadioSchedule from "./pages/RadioSchedule";
import DiscoverUsersPage from "./pages/DiscoverUsersPage";
import GoLivePage from "./pages/GoLivePage";
import CreateClipPage from "./pages/CreateClipPage";
import FloatingVideoCall from "./component/FloatingVideoCall";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import AIMasteringPage from "./pages/AIMasteringPage";
import AIRadioDJPage from "./pages/AIRadioDJPage";
import AIRadioDJ from "./component/AIRadioDJ";
import AIContentWriter from "./pages/AIContentWriter";
import AIStemSeparation from "./pages/AIStemSeparation";
import AIVideoStudio from "./pages/AIVideoStudio";
import EPKCollabHub from "./pages/EPKCollabHub";
import PublicEPKPage from "./pages/PublicEPK";
import Contact from "./pages/Contact";
import VoiceCloneServices from "./pages/VoiceCloneServices";
import PluginRackDemo from "./pages/PluginRackDemo.js";
import PodcastStudio from "./pages/PodcastStudio";
import PodcastGuestJoin from "./pages/PodcastGuestJoin";
import { AsyncGuestRecordPage } from "./pages/PodcastStudioPhase2";
import PodcastCollabRoom from "./component/PodcastCollabRoom";
import WAMPluginStore from "./pages/WAMPluginStore";
import AITextToSong from "./pages/AITextToSong";
import AddVocalsToTrack from "./pages/AddVocalsToTrack";
import AddBeatToVocals from "./pages/AddBeatToVocals";
import SongExtender from "./pages/SongExtender";
import HumToSong from "./pages/HumToSong";
import CreatorSampleMarketplace from "./pages/CreatorSampleMarketplace";
import CreatorAcademy from "./pages/CreatorAcademy";
import CollabMarketplace from "./pages/CollabMarketplace";
import JamTrackLibrary from "./pages/JamTrackLibrary";
import QuickCaptureMode from "./pages/QuickCaptureMode";
import AIThumbnailMaker from "./pages/AIThumbnailMaker";
import AIEPKWriter from "./pages/AIEPKWriter";
import AIPromoGenerator from "./pages/AIPromoGenerator";

import VideoUpload from "./pages/VideoUpload";
import VideoDetails from "./component/VideoDetails";
import ReelsFeed from "./pages/ReelsFeed";
import MyReels from "./pages/MyReels";
import UploadReel from "./pages/UploadReel";
import RadioStationDashboard from "./pages/RadioStationDashboard";
import RadioStationPage from "./pages/RadioStations";
import CreateRadioStation from "./pages/CreateRadioStation";
import BrowseRadioStations from "./pages/BrowseRadioStations";
import ArtistRadioStation from "./pages/ArtistRadioStation";
import FavoritesPage from "./pages/FavoritesPage";
import TeamRoomPage from "./pages/TeamRoomPage";
import SonosuiteRedirect from "./pages/SonosuiteRedirect";
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
import DiscoverCreators from "./pages/DiscoverCreators";
import MerchStore from "./pages/MerchStore";
import AnnouncementBar from "./component/AnnouncementBar";
import Sidebar from "./component/sidebar";
import { BackendURL } from "./component/backendURL";
import CreateReleasePage from "./pages/CreateReleasePage";
import LyricsUploadPage from "./pages/LyricsUploadPage";
import PodcastDetailPage from "./pages/PodcastDetailPage";
import SquadFinderPage from "./pages/SquadFinderPage";
import MusicDistribution from "./pages/MusicDistribution";
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
import LiveStreamViewer from "./pages/LiveStreamViewer";
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

import CollabFeed from "./pages/CollabFeed";
import EmbeddablePlayer from "./pages/EmbeddablePlayer";
import ClipView from "./pages/ClipView";

/* ──────────────────────────────────────────────────────────────
   Ghost navbar only for homepage
────────────────────────────────────────────────────────────── */

const HomeGhostNavbar = () => {
    return (
        <div
            style={{
                position: "sticky",
                top: 0,
                zIndex: 1050,
                backgroundColor: "rgba(5, 10, 18, 0.92)",
                borderBottom: "1px solid rgba(255,255,255,0.08)"
            }}
        >
            <div className="container-fluid d-flex justify-content-between align-items-center py-3 px-4">
                <Link
                    to="/"
                    style={{
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 700,
                        fontSize: "1.1rem"
                    }}
                >
                    StreamPireX
                </Link>

                <div className="d-flex gap-2">
                    <Link to="/login" className="btn btn-outline-light btn-sm">Login</Link>
                    <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
                </div>
            </div>
        </div>
    );
};

/* 
   Preserved from your original file.
   Wrapped in a component so the file remains valid instead of having hooks/return at top level.
*/
const PreservedGhostNavbarOnlyForHomepageBlock = ({ user, pathname, navMode }) => {
    // --- Dev Mode Logic ---
    const isDevUser = user?.role === "admin" || user?.is_dev === true;
    const [isDevMode, setIsDevMode] = React.useState(true); // FIXED: Single React.useState
    const exitDevMode = () => setIsDevMode(false);

    // Determines if we are on Login, Signup, or Dev-Login
    const isAuthPage = ["/login", "/signup", "/dev-login"].includes(pathname);

    // Explicit check for the comparison page
    const isComparePage = pathname === "/compare";

    // Hide footer on Auth pages and Comparison page
    const hideFooter = isAuthPage || isComparePage;

    // Use p-0 (no padding) for the Ghost (Homepage) and None (Compare) modes
    const containerClass = (navMode === "ghost" || navMode === "none")
        ? "container-fluid p-0"
        : "container-fluid";

    // Navbar/Sidebar visibility logic
    const showGhostNavbar = navMode === "ghost";
    const showOriginalNavbar = navMode === "default";
    const showAnnouncementBar = navMode === "default";

    // Sidebar only shows on default routes if user is an admin or in dev mode
    const showSidebar = navMode === "default" && (isDevUser || isDevMode);

    // Ensure there is NO "}" here!
    return (
        <div style={{ backgroundColor: "#050a12", minHeight: "100vh" }}>
            <Toaster />

            {/* 1. Renders ONLY on Homepage (/) */}
            {showGhostNavbar && <HomeGhostNavbar />}

            <ScrollToTop>
                {/* 2. Renders ONLY on standard app routes */}
                {showAnnouncementBar && <AnnouncementBar />}
                {showOriginalNavbar && <Navbar />}

                <div className="app-layout">
                    {/* Sidebar with the user and exit function */}
                    {showSidebar && <Sidebar user={user} onExitDevMode={exitDevMode} />}

                    <main className={`main-content${showSidebar ? "" : " no-sidebar"}`}>
                        <div className={containerClass}>
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/compare" element={<ComparePage />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/dev-login" element={<Login />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/creator-dashboard" element={<CreatorDashboard />} />
                                {/* Add any other critical routes here */}
                            </Routes>
                        </div>

                        {/* 3. Floating Video Call hidden on Compare Page */}
                        {!isComparePage && <FloatingVideoCall currentUser={user} />}
                    </main>
                </div>

                {/* 4. Standard Footer hidden on Compare Page */}
                {!hideFooter && <Footer />}
            </ScrollToTop>
        </div>
    );
};

const getNavMode = (pathname) => {
    if (pathname === "/") return "ghost";
    if (pathname === "/compare") return "none";
    if (pathname === "/login" || pathname === "/dev-login") return "none";
    if (pathname === "/signup") return "none";
    
    // This ensures Dashboard and all other pages get the Navbar/Sidebar
    return "default"; 
};

const AppShell = ({ user }) => {
    const location = useLocation();
    const pathname = location.pathname;
    const navMode = getNavMode(pathname);
    const isDevUser = user?.role === "admin" || user?.is_dev === true;
    const [isDevMode, setIsDevMode] = useState(true);
    const exitDevMode = () => setIsDevMode(false);

    // Determines if we are on Login, Signup, or Dev-Login
    const isAuthPage = ["/login", "/signup", "/dev-login"].includes(pathname);

    // Explicit check for the comparison page
    const isComparePage = pathname === "/compare";

    // Hide footer on Auth pages and Comparison page
    const hideFooter = isAuthPage || isComparePage;

    // Use p-0 (no padding) for the Ghost (Homepage) and None (Compare) modes
    const containerClass = (navMode === "ghost" || navMode === "none")
        ? "container-fluid p-0"
        : "container-fluid";

    /* ... dev mode logic remains the same ... */

    const showGhostNavbar = navMode === "ghost";
    const showOriginalNavbar = navMode === "default";
    const showAnnouncementBar = navMode === "default";

    const showSidebar = navMode === "default";

    return (
        <div style={{ backgroundColor: "#050a12", minHeight: "100vh" }}>
            <Toaster />

            {/* 1. Renders ONLY on Homepage (/) */}
            {showGhostNavbar && <HomeGhostNavbar />}

            <ScrollToTop>
                {/* 2. Renders ONLY on standard app routes */}
                {showAnnouncementBar && <AnnouncementBar />}
                {showOriginalNavbar && <Navbar />}

                <div className="app-layout">
                    {showSidebar && <Sidebar user={user} onExitDevMode={exitDevMode} />}

                    <main className={`main-content${showSidebar ? "" : " no-sidebar"}`}>
                        <div className={containerClass}>
                            <Routes>
                                {/* All your Routes here... */}
                                <Route path="/" element={<Home />} />
                                <Route path="/compare" element={<ComparePage />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/dev-login" element={<Login />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/creator-dashboard" element={<CreatorDashboard />} />
                                {/* ... rest of routes ... */}
                            </Routes>
                        </div>

                        {/* 3. Floating Video Call hidden on Compare Page */}
                        {!isComparePage && <FloatingVideoCall currentUser={user} />}
                    </main>
                </div>

                {/* 4. Standard Footer hidden on Compare Page */}
                {!hideFooter && <Footer />}
            </ScrollToTop>
        </div>
    );
};

const Layout = () => {
    const basename = process.env.BASENAME || "";
    const { store } = useContext(Context);
    const user = store.user;

    useEffect(() => {
        initializeAdvancedPWAFeatures();
    }, []);

    return (
        <div style={{ backgroundColor: "#050a12", minHeight: "100vh" }}>
            <Router basename={basename}>
                <AppShell user={user} />
            </Router>
        </div>
    );
};

export default injectContext(Layout);