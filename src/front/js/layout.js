import React, { useEffect, useContext } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { Context } from "./store/appContext";
import AppShell from "./component/AppShell";
import injectContext from "./store/appContext";

const Layout = () => {
    const { store } = useContext(Context);
    return (
        <div style={{ backgroundColor: "#050a12", minHeight: "100vh", width: "100%" }}>
            <Router basename={process.env.BASENAME || ""}>
                <AppShell user={store.user} />
            </Router>
        </div>
    );
};

export default injectContext(Layout);
