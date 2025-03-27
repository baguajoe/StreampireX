import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import injectContext from "./store/appContext";

import { Home } from "./pages/home";
import Login from "./pages/Login";
import { Signup } from "./pages/Signup";
import RadioStationPage from "./pages/RadioStations";
import LiveStreamPage from "./pages/LiveStreams";
import CreatorDashboard from "./pages/creatorDashboard";
import FavoritePage from "./pages/FavoritePage";
import ProfilePage from "./pages/ProfilePage";
import BrowseRadioGenres from "./pages/BrowseRadioGenres";
import BrowsePodcastCategories from "./pages/BrowsePodcastCategories";
import PricingPlans from "./pages/PricingPlans";
import ArtistDashboard from "./pages/ArtistDashboard";  // ✅ Import
import ArtistRadioStation from "./pages/ArtistRadioStation"; // ✅ Import
import IndieArtistUpload from "./pages/IndieArtistUpload";
import MusicLicensing from "./pages/MusicLicensing"; // ✅ Import
import Music from "./pages/Music"; // ✅ Import
import LiveConcerts from "./pages/LiveConcerts"; // ✅ Import
import PodcastCreate from "./pages/PodcastCreate";
import PodcastPage from "./pages/PodcastPage";
import PodcastDashboard from "./pages/PodcastDashboard";
import CreateRadioStation from "./pages/CreateRadioStation";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import Marketplace from "./pages/Marketplace";  // Correct import for Marketplace.js
import LicensingMarketplace from "./pages/LicensingMarketplace";
import PremiumContent from "./pages/PremiumContent";
import RevenueDashboard from "./pages/RevenueDashboard";
import MerchStore from "./pages/MerchStore";
import AvatarCreation from './component/AvatarCreation';
import PaymentProcessing from "./pages/PaymentProcessing";
import FreeTrial from "./pages/FreeTrial";
import MembersPage from "./pages/MembersPage";
import DigitalProducts from "./pages/DigitalProducts";
import ProductPage from "./pages/ProductPage";
import AdminDashboard from "./pages/AdminDashboard";
import RefundProcessing from "./pages/RefundProcessing";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import CreatorAnalytics from "./pages/CreatorAnalytics"; // Adjust the path if necessary
import SettingsPage from "./pages/SettingsPage";
import ArtistProfile from "./pages/ArtistProfile";
import Chat from "./pages/Chat";
import ChatModal from "./component/ChatModal";
import Checkout from "./pages/Checkout";
import CollaborationMarketPlace from "./pages/CollaborationMarketPlace";
import CreateAvatarPage from "./pages/CreateAvatarPage";
import EpisodePage from "./pages/EpisodePage";
import LandingPage from "./pages/LandingPage";
import LiveShowPage from "./pages/LiveShowPage";
import LiveStudio from "./pages/LiveStudio";
import PodcastEpisodePage from "./pages/PodcastEpisodePage";
import PodcastProfile from "./pages/PodcastProfile";
import ProductCheckout from "./pages/ProductCheckout";
import StorefrontPage from "./pages/StorefrontPage";
import UploadMusic from "./pages/UploadMusic";
import Voting from "./pages/Voting";
import VRDashboard from "./pages/VRDashboard";
import WebRTCPage from "./pages/WebRTCPage";


import RoleManagement from "./pages/RoleManagement";  // ✅ Add Role Management Page
import { Demo } from "./pages/demo";
import { Single } from "./pages/single";
import { BackendURL } from "./component/backendURL";

import Navbar from "./component/navbar";
import Sidebar from "./component/sidebar";
import { Footer } from "./component/footer";

// ✅ New Imports for Missing Pages
import BrowseProfiles from "./pages/BrowseProfile";
import BrowsePodcasts from "./pages/BrowsePodcasts";
import BrowseRadioStations from "./pages/BrowseRadioStations";
import TrendingPage from "./pages/TrendingPage";
import CommentsPage from "./pages/CommentsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ChartPage from "./component/chart";

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
                            <Route path="/podcast-dashboard" element={<PodcastDashboard />} />
                            <Route path="/create-radio" element={<CreateRadioStation />} />
                            <Route path="/indie-artist-upload" element={<IndieArtistUpload />} />
                            <Route path="/analytics" element={<AnalyticsDashboard />} />
                            <Route path="/marketplace" element={<Marketplace />} />
                            <Route path="/licenses" element={<LicensingMarketplace />} />
                            <Route path="/premium-content" element={<PremiumContent />} />
                            <Route path="/revenue" element={<RevenueDashboard />} />
                            <Route path="/merch" element={<MerchStore />} />
                            <Route path="/creator/analytics/:creatorId" element={<CreatorAnalytics />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/artist-profile/:id" element={<ArtistProfile />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/checkout" element={<Checkout />} />
                            <Route path="/collaboration" element={<CollaborationMarketPlace />} />
                            <Route path="/create-avatar" element={<CreateAvatarPage />} />
                            <Route path="/episode/:id" element={<EpisodePage />} />
                            <Route path="/landing" element={<LandingPage />} />
                            <Route path="/live-show/:id" element={<LiveShowPage />} />
                            <Route path="/studio" element={<LiveStudio />} />
                            <Route path="/podcast/episode/:id" element={<PodcastEpisodePage />} />
                            <Route path="/podcast/profile/:id" element={<PodcastProfile />} />
                            <Route path="/product-checkout" element={<ProductCheckout />} />
                            <Route path="/storefront" element={<StorefrontPage />} />
                            <Route path="/upload-music" element={<UploadMusic />} />
                            <Route path="/voting" element={<Voting />} />
                            <Route path="/vr-dashboard" element={<VRDashboard />} />
                            <Route path="/webrtc" element={<WebRTCPage />} />
                            <Route path="/chatmodal" element={<ChatModal />} />



                            <Route path="/radio-stations" element={<RadioStationPage />} />
                            <Route path="/live-streams" element={<LiveStreamPage />} />
                            <Route path="/dashboard" element={<CreatorDashboard />} />
                            <Route path="/favorite-page" element={<FavoritePage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/browse-podcasts" element={<BrowsePodcastCategories />} />
                            <Route path="/radio/genres" element={<BrowseRadioGenres />} />
                            <Route path="/artist-dashboard" element={<ArtistDashboard />} />
                            <Route path="/artist-radio" element={<ArtistRadioStation />} />
                            <Route path="/music-licensing" element={<MusicLicensing />} />
                            <Route path="/music" element={<Music />} />
                            <Route path="/podcast/create" element={<PodcastCreate />} />
                            <Route path="/podcasts" element={<PodcastPage />} />
                            <Route path="/live-concerts" element={<LiveConcerts />} />
                            <Route path="/pricing" element={<PricingPlans />} />
                            <Route path="/avatar-creation" element={<AvatarCreation />} />
                            <Route path="/payment-processing" element={<PaymentProcessing />} />
                            <Route path="/free-trial" element={<FreeTrial />} />
                            <Route path="/members" element={<MembersPage />} />
                            <Route path="/digital-products" element={<DigitalProducts />} />
                            <Route path="/marketplace" element={<ProductPage />} />
                            <Route path="/admin-dashboard" element={<AdminDashboard />} />
                            <Route path="/refund-processing" element={<RefundProcessing />} />
                            <Route path="/revenue-analytics" element={<RevenueAnalytics />} />
                            <Route path="/role-management" element={<RoleManagement />} />  {/* ✅ Add Role Management route */}
                            <Route path="/demo" element={<Demo />} />
                            <Route path="/single/:theid" element={<Single />} />

                            {/* ✅ Added Missing Routes */}
                            <Route path="/browse-profiles" element={<BrowseProfiles />} />
                            <Route path="/browse-podcasts" element={<BrowsePodcasts />} />
                            <Route path="/browse-radio-stations" element={<BrowseRadioStations />} />
                            <Route path="/trending" element={<TrendingPage />} />
                            <Route path="/comments" element={<CommentsPage />} />
                            <Route path="/notifications" element={<NotificationsPage />} />
                            <Route path="/chart" element={<ChartPage />} />

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
