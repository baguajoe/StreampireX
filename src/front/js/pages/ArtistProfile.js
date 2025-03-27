// src/front/js/pages/ArtistProfile.js

import React, { useContext, useEffect, useState } from "react";
import { Context } from "../store/appContext";

const ArtistProfile = () => {
  const {store}=useContext(Context)
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/artist/profile", {
          headers: {
            Authorization: `Bearer ${store.token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch profile");

        const data = await res.json();
        setProfile(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching artist profile", error);
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <div>Loading profile...</div>;
  if (!profile) return <div>No profile found.</div>;

  return (
    <div className="p-6 max-w-xl mx-auto bg-white shadow-md rounded-lg text-center">
      <h2 className="text-2xl font-semibold mb-4">{profile.username}'s Profile</h2>
      
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt="Artist Avatar"
          className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
        />
      ) : (
        <div className="w-32 h-32 rounded-full mx-auto bg-gray-200 mb-4 flex items-center justify-center">
          <span className="text-gray-500">No Avatar</span>
        </div>
      )}

      <p className="text-gray-600">More profile info coming soon...</p>
    </div>
  );
};

export default ArtistProfile;
