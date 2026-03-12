const Layout = () => {
    const basename = process.env.BASENAME || "";
    const { store } = useContext(Context);
    const user = store.user;
    const location = useLocation();

    useEffect(() => {
        initializeAdvancedPWAFeatures();
    }, []);

    // Helper to determine if we are on a landing/public page
    const isPublicRoute = ["/", "/login", "/signup"].includes(location.pathname);
    const isDev = location.search.includes("secret=dev");

    return (
        <div style={{ backgroundColor: "#050a12", minHeight: "100vh", width: "100%" }}>
            <BrowserRouter basename={basename}>
                <ScrollToTop>
                    <Navbar />
                    <div className="d-flex">
                        {(isDev || (!isPublicRoute && user)) && <Sidebar user={user} />}
                        <div className="flex-grow-1 w-100">
                            <Routes>
                                <Route element={<Home />} path="/" />
                                <Route element={<h1>Not found!</h1>} />
                            </Routes>
                        </div>
                    </div>
                    <Footer />
                </ScrollToTop>
            </BrowserRouter>
        </div>
    );
};
