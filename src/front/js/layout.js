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
// import  FavoritesPage  from "./pages/Favorites";
import ProfilePage from "./pages/ProfilePage";
import BrowseByCategory from "./pages/BrowseByCategory";
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
import LicensingMarketplace from "./pages/LicensingMarketplace";
import PremiumContent from "./pages/PremiumContent";
import RevenueDashboard from "./pages/RevenueDashboard";
import MerchStore from "./pages/MerchStore";
// import  PaymentProcessing  from "./pages/PaymentProcessing";
// import  FreeTrial  from "./pages/FreeTrial";
import MembersPage from "./pages/MembersPage";
// import  DigitalProducts  from "./pages/DigitalProducts";
import ProductPage from "./pages/ProductPage";
import AdminDashboard from "./pages/AdminDashboard";
// import  RefundProcessing  from "./pages/RefundProcessing";
// import  RevenueAnalytics  from "./pages/RevenueAnalytics";
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
                            <Route path="/licenses" element={<LicensingMarketplace />} />
                            <Route path="/premium-content" element={<PremiumContent />} />
                            <Route path="/revenue" element={<RevenueDashboard />} />
                            <Route path="/merch" element={<MerchStore />} />


                            <Route path="/radio-stations" element={<RadioStationPage />} />
                            <Route path="/live-streams" element={<LiveStreamPage />} />
                            <Route path="/dashboard" element={<CreatorDashboard />} />
                            {/* <Route path="/favorites" element={<FavoritesPage />} /> */}
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/category/:category" element={<BrowseByCategory />} />
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
                            <Route path="/create-avatar" element={<CreateAvatar />} />
                            
                            <Route path="/avatar-creator" element={<AvatarCreation />} />

                            {/* <Route path="/payment-processing" element={<PaymentProcessing />} /> */}
                            {/* <Route path="/free-trial" element={<FreeTrial />} /> */}
                            <Route path="/members" element={<MembersPage />} />
                            {/* <Route path="/digital-products" element={<DigitalProducts />} /> */}
                            <Route path="/marketplace" element={<ProductPage />} />
                            <Route path="/admin-dashboard" element={<AdminDashboard />} />
                            {/* <Route path="/refund-processing" element={<RefundProcessing />} /> */}
                            {/* <Route path="/revenue-analytics" element={<RevenueAnalytics />} /> */}
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
