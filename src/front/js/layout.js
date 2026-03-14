import React, { useEffect, useContext } from "react";
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

// --- Core Pages ---
import Home from "./pages/home";
import Login from "./pages/Login";
import SignupForm from "./component/SignupForm";
import CreatorDashboard from "./pages/CreatorDashboard";
import { Dashboard } from "./pages/Dashboard";
import ComparePage from "./pages/ComparePage";

// --- App / Feature Pages ---
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
import DJMixer from "./pages/DJMixer";
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
import CourseBuilder from "./pages/CourseBuilder";
import CoursePlayer from "./pages/CoursePlayer";
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
import MerchDesigner from "./pages/MerchDesigner";
import MusicStore from "./pages/MusicStore";
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

/* -------------------------------------------------------------------------- */
/* Public landing navbar for Home + Compare + Dev Login + Waitlist            */
/* -------------------------------------------------------------------------- */
const PublicNavbar = () => {
    const baseLinkStyle = {
        color: "#fff",
        textDecoration: "none",
        fontSize: "14px",
        padding: "8px 16px",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "8px",
        transition: "all 0.2s ease"
    };

    return (
        <header
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                zIndex: 2000,
                background: "rgba(5, 10, 18, 0.95)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                padding: "15px 0"
            }}
        >
            <div
                style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 20px",
                    gap: "16px",
                    flexWrap: "wrap"
                }}
            >
                <Link
                    to="/"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        textDecoration: "none"
                    }}
                >
                    <span
                        style={{
                            fontSize: "22px",
                            fontWeight: "800",
                            color: "#00ffc8",
                            letterSpacing: "-0.5px"
                        }}
                    >
                        StreamPire<span style={{ color: "#fff" }}>X</span>
                    </span>
                </Link>

                <div
                    style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                        flexWrap: "wrap"
                    }}
                >
                    <Link to="/" style={baseLinkStyle}>
                        Home
                    </Link>

                    <Link to="/compare" style={baseLinkStyle}>
                        Compare
                    </Link>

                    <button
                        onClick={() => {
                            const code = prompt("Enter Developer Access Code:");
                            if (code === "777") {
                                window.location.href = "/dev-login";
                            } else {
                                alert("Unauthorized access.");
                            }
                        }}
                        style={{
                            ...baseLinkStyle,
                            background: "none",
                            cursor: "pointer",
                            outline: "none",
                            display: "inline-block"
                        }}
                    >
                        Dev Login
                    </button>

                    <Link
                        to="/signup"
                        style={{
                            background: "linear-gradient(45deg, #6a11cb 0%, #2575fc 100%)",
                            color: "#fff",
                            textDecoration: "none",
                            fontSize: "14px",
                            fontWeight: "600",
                            padding: "8px 20px",
                            borderRadius: "8px",
                            boxShadow: "0 4px 15px rgba(106, 17, 203, 0.35)"
                        }}
                    >
                        Waitlist
                    </Link>
                </div>
            </div>
        </header>
    );
};


const WaitlistForm = () => {
    const [email, setEmail] = React.useState("");
    const [name, setName] = React.useState("");
    const [interest, setInterest] = React.useState("Creator");

    const handleSubmit = async (e) => {
        e.preventDefault();

        const backendUrl = process.env.BACKEND_URL || "";

        try {
            const response = await fetch(`${backendUrl}/api/waitlist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    interest: interest
                })
            });

            if (response.ok) {
                alert("Success! You've been added to the waitlist and an email is being sent.");
            } else {
                alert("The server received the data but couldn't send the email. Check your Python logs.");
            }
        } catch (error) {
            console.error("Connection error:", error);
            alert("Could not connect to the backend. Is your Python server running?");
        }
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", padding: "100px 20px" }}>
            <form onSubmit={handleSubmit} style={{
                background: "rgba(255,255,255,0.03)",
                padding: "40px", borderRadius: "15px",
                border: "1px solid rgba(255,255,255,0.1)",
                width: "100%", maxWidth: "450px"
            }}>
                <h2 style={{ color: "#00ffc8", marginBottom: "10px" }}>Join the Waitlist</h2>
                <p style={{ color: "#888", marginBottom: "30px" }}>Only Name, Email, and Interest required.</p>
                <input
                    type="text" placeholder="Full Name" required
                    style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", background: "#111", border: "1px solid #333", color: "#fff" }}
                    onChange={e => setName(e.target.value)}
                />
                <input
                    type="email" placeholder="Email Address" required
                    style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", background: "#111", border: "1px solid #333", color: "#fff" }}
                    onChange={e => setEmail(e.target.value)}
                />
                <select
                    style={{ width: "100%", padding: "12px", marginBottom: "25px", borderRadius: "8px", background: "#111", border: "1px solid #333", color: "#fff" }}
                    onChange={e => setInterest(e.target.value)}
                >
                    <option value="Creator">I'm a Creator</option>
                    <option value="Fan">I'm a Fan</option>
                    <option value="Developer">I'm a Developer</option>
                </select>
                <button type="submit" style={{
                    width: "100%", padding: "14px", borderRadius: "8px", border: "none",
                    background: "linear-gradient(45deg, #6a11cb 0%, #2575fc 100%)",
                    color: "#fff", fontWeight: "700", cursor: "pointer"
                }}>
                    Get Early Access
                </button>
            </form>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* Layout Mode Logic                                                           */
/* -------------------------------------------------------------------------- */
const getLayoutMode = (pathname) => {
    const cleanPath = pathname?.split("?")[0] || "/";

    if (cleanPath === "/" || cleanPath === "/compare") return "public";

    if (
        cleanPath === "/login" ||
        cleanPath === "/signup" ||
        cleanPath === "/dev-login"
    ) {
        return "auth";
    }

    return "app";
};

/* -------------------------------------------------------------------------- */
/* App Shell                                                                   */
/* -------------------------------------------------------------------------- */
const AppShell = ({ user }) => {
    const location = useLocation();
    const pathname = location.pathname;
    const layoutMode = getLayoutMode(pathname);

    const isPublicPage = layoutMode === "public";
    const isAuthPage = layoutMode === "auth";
    const isAppPage = layoutMode === "app";
    const isComparePage = pathname === "/compare";

    const hideFooter = isAuthPage || isComparePage;
    const containerClass =
        isPublicPage || isAuthPage ? "container-fluid p-0" : "container-fluid";
    const handleDevAccess = (e) => {
        const secretCode = "777";
        const input = prompt("Enter Developer Access Code:");

        if (input === secretCode) {
            window.location.href = "/dev-login";
        } else {
            alert("Access Denied.");
        }
    };
    return (
        <div style={{ backgroundColor: "#050a12", minHeight: "100vh" }}>
            <Toaster />

            {isPublicPage && <PublicNavbar />}

            <ScrollToTop>
                {isAppPage && <AnnouncementBar />}
                {isAppPage && <Navbar />}

                <div className="app-layout">
                    {isAppPage && <Sidebar user={user} />}

                    <main className={`main-content${isAppPage ? "" : " no-sidebar"}`}>
                        <div
                            className={containerClass}
                            style={{
                                paddingTop: isPublicPage ? "84px" : undefined
                            }}
                        >
                            <Routes>
                                {/* ---------------- Public ---------------- */}
                                <Route path="/" element={<Home />} />
                                <Route path="/compare" element={<ComparePage />} />
                                <Route path="/signup" element={<WaitlistForm />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/dev-login" element={<Login />} />

                                {/* ---------------- Core App ---------------- */}
                                <Route path="/dashboard/*" element={<Dashboard />} />
                                <Route path="/creator-dashboard" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/seller-dashboard" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/artist-dashboard" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/podcast-dashboard" element={<PodcastDashboard />} />
                                <Route path="/radio-station-dashboard" element={<RadioStationDashboard />} />
                                <Route path="/video-channel-dashboard" element={<VideoChannelDashboard />} />
                                <Route path="/sales-dashboard" element={<SalesDashboard />} />
                                <Route path="/payout-dashboard" element={<PayoutDashboard />} />
                                <Route path="/notifications" element={<NotificationsPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                                <Route path="/home-feed" element={<HomeFeed />} />
                                <Route path="/discover-creators" element={<DiscoverCreators />} />
                                <Route path="/discover-users" element={<DiscoverUsersPage />} />
                                <Route path="/search" element={<SearchPage />} />
                                <Route path="/explore" element={<ExplorePage />} />
                                <Route path="/favorites" element={<FavoritesPage />} />
                                <Route path="/contact" element={<Contact />} />
                                <Route path="/pricing" element={<PricingPlans />} />
                                <Route path="/tech-support" element={<TechSupportPage />} />

                                {/* ---------------- Music / Artist ---------------- */}
                                <Route path="/upload-music" element={<UploadMusic />} />
                                <Route path="/create-release" element={<CreateReleasePage />} />
                                <Route path="/releases" element={<ReleaseList />} />
                                <Route path="/music-distribution" element={<MusicDistribution />} />
                                <Route path="/lyrics-upload" element={<LyricsUploadPage />} />
                                <Route path="/artist-profile/:id" element={<ArtistProfilePage />} />
                                <Route path="/edit-artist-profile" element={<EditArtistProfilePage />} />
                                <Route path="/user-profile/:id" element={<UserSearchProfilePage />} />
                                <Route path="/album/:id" element={<AlbumDetailPage />} />
                                <Route path="/collaborator-splits" element={<CollaboratorSplitPage />} />
                                <Route path="/squad-finder" element={<SquadFinderPage />} />
                                <Route path="/collab-feed" element={<CollabFeed />} />
                                <Route path="/collab-marketplace" element={<CollabMarketplace />} />
                                <Route path="/collab-browse" element={<CollabBrowsePage />} />
                                <Route path="/collab-inbox" element={<CollabInbox />} />

                                {/* ---------------- Beat / Producer ---------------- */}
                                <Route path="/beat-store" element={<BeatStorePage />} />
                                <Route path="/beat/:id" element={<BeatDetailPage />} />
                                <Route path="/producer/:id" element={<ProducerProfilePage />} />
                                <Route path="/browse-producers" element={<BrowseProducersPage />} />
                                <Route path="/sell-beats" element={<SellBeatsPage />} />
                                <Route path="/browse-stems" element={<BrowseStemsPage />} />
                                <Route path="/sell-stems" element={<SellStemsPage />} />
                                <Route path="/creator-sample-marketplace" element={<CreatorSampleMarketplace />} />
                                <Route path="/jam-track-library" element={<JamTrackLibrary />} />

                                {/* ---------------- Music Store ---------------- */}
                                <Route path="/music-store" element={<MusicStore />} />

                                {/* ---------------- Marketplace / Merch ---------------- */}
                                <Route path="/marketplace" element={<Marketplace />} />
                                <Route path="/storefront" element={<StorefrontPage />} />
                                <Route path="/merch-designer" element={<MerchDesigner />} />
                                <Route path="/merch-store" element={<MerchStore />} />
                                <Route path="/store/:username" element={<MerchStore />} />
                                <Route path="/product/:id" element={<ProductDetailPage />} />
                                <Route path="/cart" element={<ShoppingCart />} />
                                <Route path="/checkout" element={<CheckoutPage />} />
                                <Route path="/orders" element={<OrderHistoryPage />} />

                                {/* ---------------- Radio / Podcast ---------------- */}
                                <Route path="/podcast-create" element={<PodcastCreate />} />
                                <Route path="/podcast-studio" element={<PodcastStudio />} />
                                <Route path="/podcast-guest-join" element={<PodcastGuestJoin />} />
                                <Route path="/podcast-guest-record" element={<AsyncGuestRecordPage />} />
                                <Route path="/podcast-collab-room" element={<PodcastCollabRoom />} />
                                <Route path="/podcast/:id" element={<PodcastPage />} />
                                <Route path="/podcast-detail/:id" element={<PodcastDetailPage />} />
                                <Route path="/podcast-episode/:id" element={<PodcastEpisodePage />} />
                                <Route path="/podcast-profile/:id" element={<PodcastProfile />} />
                                <Route path="/podcast-category/:category" element={<PodcastCategoryPage />} />
                                <Route path="/browse-podcast-categories" element={<BrowsePodcastCategories />} />
                                <Route path="/radio-stations" element={<RadioStationPage />} />
                                <Route path="/create-radio-station" element={<CreateRadioStation />} />
                                <Route path="/browse-radio-stations" element={<BrowseRadioStations />} />
                                <Route path="/artist-radio-station" element={<ArtistRadioStation />} />
                                <Route path="/radio-station/:id" element={<RadioStationDetailPage />} />
                                <Route path="/radio-schedule" element={<RadioSchedule />} />
                                <Route path="/airadio-dj-page" element={<AIRadioDJPage />} />
                                <Route path="/airadio-dj" element={<AIRadioDJ />} />
                                <Route path="/dj-mixer" element={<DJMixer />} />

                                {/* ---------------- Video / Reels / Live ---------------- */}
                                <Route path="/browse-videos" element={<BrowseVideosPage />} />
                                <Route path="/video-upload" element={<VideoUpload />} />
                                <Route path="/video/:id" element={<VideoDetails />} />
                                <Route path="/video-editor" element={<VideoEditor />} />
                                <Route path="/video-channel/:id" element={<VideoChannelProfile />} />
                                <Route path="/my-video-channel" element={<MyVideoChannel />} />
                                <Route path="/user-video-channel/:id" element={<UserVideoChannelPage />} />
                                <Route path="/reels" element={<ReelsFeed />} />
                                <Route path="/my-reels" element={<MyReels />} />
                                <Route path="/upload-reel" element={<UploadReel />} />
                                <Route path="/go-live" element={<GoLivePage />} />
                                <Route path="/create-clip" element={<CreateClipPage />} />
                                <Route path="/clip/:token" element={<ClipView />} />
                                <Route path="/live-streams" element={<LiveStreamPage />} />
                                <Route path="/live-concerts" element={<LiveConcerts />} />
                                <Route path="/live-show/:id" element={<LiveShowPage />} />
                                <Route path="/live-stream/:id" element={<LiveStreamViewer />} />
                                <Route path="/subscription-success" element={<SubscriptionSuccess />} />

                                {/* ---------------- Studio / AI ---------------- */}
                                <Route path="/recording-studio" element={<RecordingStudio />} />
                                <Route path="/plugin-rack-demo" element={<PluginRackDemo />} />
                                <Route path="/wam-plugin-store" element={<WAMPluginStore />} />
                                <Route path="/ai-mastering" element={<AIMasteringPage />} />
                                <Route path="/ai-content-writer" element={<AIContentWriter />} />
                                <Route path="/ai-stem-separation" element={<AIStemSeparation />} />
                                <Route path="/ai-video-studio" element={<AIVideoStudio />} />
                                <Route path="/ai-text-to-song" element={<AITextToSong />} />
                                <Route path="/add-vocals-to-track" element={<AddVocalsToTrack />} />
                                <Route path="/add-beat-to-vocals" element={<AddBeatToVocals />} />
                                <Route path="/song-extender" element={<SongExtender />} />
                                <Route path="/hum-to-song" element={<HumToSong />} />
                                <Route path="/ai-thumbnail-maker" element={<AIThumbnailMaker />} />
                                <Route path="/ai-epk-writer" element={<AIEPKWriter />} />
                                <Route path="/ai-promo-generator" element={<AIPromoGenerator />} />
                                <Route path="/quick-capture-mode" element={<QuickCaptureMode />} />
                                <Route path="/voice-clone-services" element={<VoiceCloneServices />} />

                                {/* ---------------- EPK / Promo ---------------- */}
                                <Route path="/epk-collab-hub" element={<EPKCollabHub />} />
                                <Route path="/public-epk/:slug" element={<PublicEPKPage />} />

                                {/* ---------------- Community / Membership ---------------- */}
                                <Route path="/course-builder" element={<CourseBuilder />} />
                                <Route path="/course-builder/:courseId" element={<CourseBuilder />} />
                                <Route path="/course/:courseId" element={<CoursePlayer />} />
                                <Route path="/my-learning" element={<CreatorAcademy />} />
                                <Route path="/creator-academy" element={<CreatorAcademy />} />
                                <Route path="/checkout/course/:courseId" element={<CoursePlayer />} />
                                <Route path="/creator-memberships" element={<CreatorMembershipManager />} />
                                <Route path="/creator/membership" element={<CreatorMembershipManager />} />
                                <Route path="/fan-memberships" element={<FanMembershipPage />} />
                                <Route path="/fan-membership/:creatorId" element={<FanMembershipPage />} />
                                <Route path="/team-room/:id" element={<TeamRoomPage />} />
                                <Route path="/create-team-room" element={<CreateTeamRoomPage />} />
                                <Route path="/gamer-profile/:id" element={<GamerProfilePage />} />
                                <Route path="/edit-gamer-profile" element={<EditGamerProfilePage />} />
                                <Route path="/gamers-chatroom" element={<GamersChatroomPage />} />

                                {/* ---------------- Content / Stories ---------------- */}
                                <Route path="/content-library" element={<ContentLibrary />} />
                                <Route path="/story/:id" element={<StoryViewer />} />
                                <Route path="/story-upload" element={<StoryUpload />} />
                                <Route path="/video-series-builder" element={<VideoSeriesBuilder />} />
                                <Route path="/embeddable-player/:id" element={<EmbeddablePlayer />} />

                                {/* ---------------- Misc ---------------- */}
                                <Route path="/tip-jar" element={<TipJarPage />} />
                                <Route path="/sonosuite-redirect" element={<SonosuiteRedirect />} />

                                {/* ---------------- Fallback ---------------- */}
                                <Route path="*" element={<Home />} />
                            </Routes>
                        </div>

                        {!isComparePage && !isAuthPage && (
                            <FloatingVideoCall currentUser={user} />
                        )}
                    </main>
                </div>

                {!hideFooter && <Footer />}
            </ScrollToTop>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */
const Layout = () => {
    const { store } = useContext(Context);
    const user = store.user;

    useEffect(() => {
        initializeAdvancedPWAFeatures();
    }, []);

    useEffect(() => {
        BackendURL();
    }, []);

    return (
        <div style={{ backgroundColor: "#050a12", minHeight: "100vh" }}>
            <Router basename="">
                <AppShell user={user} />
            </Router>
        </div>
    );
};

export default injectContext(Layout);