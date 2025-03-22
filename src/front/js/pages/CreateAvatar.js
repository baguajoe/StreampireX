import React, { useEffect } from "react";

const CreateAvatar = () => {
  useEffect(() => {
    const receiveMessage = (event) => {
      if (event.origin !== "https://readyplayer.me") return;
      const avatarUrl = event.data?.avatarUrl;
      if (avatarUrl) {
        console.log("Avatar URL:", avatarUrl);
        // Send to backend to save in user profile
        fetch("http://localhost:5000/api/save-avatar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({ avatar_url: avatarUrl })
        })
          .then((res) => res.json())
          .then((data) => console.log("Avatar saved", data))
          .catch((err) => console.error("Error saving avatar", err));
      }
    };

    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  return (
    <div style={{ height: "90vh" }}>
      <iframe
        title="Create Your Avatar"
        src="https://readyplayer.me/avatar?frameApi"
        style={{ width: "100%", height: "100%", border: "none" }}
        allow="camera *; microphone *; clipboard-write"
      ></iframe>
    </div>
  );
};

export default CreateAvatar;