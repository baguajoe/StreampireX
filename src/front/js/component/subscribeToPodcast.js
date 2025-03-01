const subscribeToPodcast = async (podcastId) => {
    const response = await fetch("http://127.0.0.1:5000/api/podcast/subscribe", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ podcast_id: podcastId })
    });
  
    const data = await response.json();
    alert(data.message);
  };
  