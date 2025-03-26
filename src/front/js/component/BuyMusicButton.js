// Example: BuyMusicButton.js
import React from "react";

const BuyMusicButton = ({ musicId, price }) => {
  const handleBuy = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.BACKEND_URL}/api/music/${musicId}/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ amount: price })
    });

    const data = await res.json();
    if (res.ok) {
      alert("✅ Purchase Successful!");
    } else {
      alert("❌ Error: " + data.error);
    }
  };

  return <button onClick={handleBuy}>Buy for ${price}</button>;
};

export default BuyMusicButton;
