const getState = ({ getStore, getActions, setStore }) => {
    return {
        store: {
            message: null,
            token: localStorage.getItem("token") || null,
            user: JSON.parse(localStorage.getItem("user")) || null,
            error: null
        },
        actions: {
            signup: async (formData) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/signup`, {
                        method: "POST",
                        body: formData // Use FormData to support file uploads
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        setStore({ error: data.error || "An error occurred during signup" });
                        return data;
                    }

                    setStore({ error: null });
                    return data;
                } catch (error) {
                    console.error("Error during signup:", error);
                    setStore({ error: "Network error during signup" });
                    return { error: "Network error during signup" };
                }
            },

            login: async (email, password) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/login`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ email, password })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        setStore({ error: data.error || "Invalid email or password" });
                        return data;
                    }

                    // Save token to localStorage and store
                    localStorage.setItem("token", data.access_token);
                    localStorage.setItem("user", JSON.stringify(data.user));

                    setStore({
                        token: data.access_token,
                        user: data.user,
                        error: null
                    });

                    getActions().fetchUserProfile();
                    return data;
                } catch (error) {
                    console.error("Error during login:", error);
                    setStore({ error: "Network error during login" });
                    return { error: "Network error during login" };
                }
            },

            logout: () => {
                // Remove token from localStorage and store
                localStorage.removeItem("token");
                localStorage.removeItem("user");

                setStore({
                    token: null,
                    user: null
                });
            },

            // Check if token is valid and fetch user profile
            checkToken: async () => {
                const token = localStorage.getItem("token");

                if (!token) {
                    setStore({ token: null, user: null });
                    return false;
                }

                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/user/profile`, {
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        setStore({ token: null, user: null });
                        return false;
                    }

                    const data = await response.json();
                    setStore({ user: data });
                    return true;
                } catch (error) {
                    console.error("Error validating token:", error);
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    setStore({ token: null, user: null });
                    return false;
                }
            },

            fetchUserProfile: async () => {
                console.log("starting fetchUserProfile action");
                const store = getStore();
                const token = store.token || localStorage.getItem("token");

                if (!token) {
                    return { error: "No authentication token available" };
                }

                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/profile`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        setStore({ error: data.error || "Failed to fetch user profile" });
                        return data;
                    }

                    // Update user data in store and localStorage
                    localStorage.setItem("user", JSON.stringify(data));
                    setStore({
                        user: data,
                        error: null
                    });

                    return data;
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    setStore({ error: "Network error while fetching profile" });
                    return { error: "Network error while fetching profile" };
                }
            },


        }
    };
};

export default getState;
