import React, { useContext } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import injectContext from "./store/appContext";
import { Context } from "./store/appContext";

import Home from "./pages/home";

import Navbar from "./component/navbar";
import Sidebar from "./component/sidebar";

// FIXED: Using named import for Footer to match its export const Footer
import { Footer } from "./component/footer";

const Layout = () => {
    const { store } = useContext(Context);
    const basename = process.env.BASENAME || "";

    return (
        <div style={{ backgroundColor: "#050a12", minHeight: "100vh", width: "100%" }}>
            <BrowserRouter basename={basename}>
                <ScrollToTop>
                    <Navbar />
                    <div className="d-flex" style={{ backgroundColor: "#050a12" }}>
                        {window.location.search.includes("secret=dev") && <Sidebar user={store.user} />}
                        <div className="flex-grow-1 w-100">
                            <Routes>
                                <Route element={<Home />} path="/" />
                                <Route element={<h1>Not found!</h1>} path="*" />
                            </Routes>
                        </div>
                    </div>
                    <Footer />
                </ScrollToTop>
            </BrowserRouter>
        </div>
    );
};

export default injectContext(Layout);