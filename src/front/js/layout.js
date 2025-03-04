import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import injectContext from "./store/appContext";

import { Home } from "./pages/home";
import  PodcastPage  from "./pages/Podcasts";
import  RadioStationPage  from "./pages/radioStations";
import  LiveStreamPage  from "./pages/liveStreams";
import  CreatorDashboard  from "./pages/creatorDashboard";
// import  FavoritesPage  from "./pages/Favorites";
import  ProfilePage  from "./pages/ProfilePage";
import  BrowseByCategory  from "./pages/BrowseByCategory";
import  PricingPlans  from "./pages/PricingPlans";
// import  PaymentProcessing  from "./pages/PaymentProcessing";
// import  FreeTrial  from "./pages/FreeTrial";
import  MembersPage  from "./pages/MembersPage";
// import  DigitalProducts  from "./pages/DigitalProducts";
import  ProductPage  from "./pages/ProductPage";
import  AdminDashboard  from "./pages/AdminDashboard";
// import  RefundProcessing  from "./pages/RefundProcessing";
// import  RevenueAnalytics  from "./pages/RevenueAnalytics";
import  RoleManagement  from "./pages/RoleManagement";  // ✅ Add Role Management Page
import { Demo } from "./pages/demo";
import { Single } from "./pages/single";
import { BackendURL } from "./component/backendURL";

import Navbar from "./component/navbar";
import Sidebar from "./component/sidebar";
import {Footer} from "./component/footer";

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
                            <Route path="/podcasts" element={<PodcastPage />} />
                            <Route path="/radio-stations" element={<RadioStationPage />} />
                            <Route path="/live-streams" element={<LiveStreamPage />} />
                            <Route path="/dashboard" element={<CreatorDashboard />} />
                            {/* <Route path="/favorites" element={<FavoritesPage />} /> */}
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/category/:category" element={<BrowseByCategory />} />
                            <Route path="/pricing" element={<PricingPlans />} />
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
