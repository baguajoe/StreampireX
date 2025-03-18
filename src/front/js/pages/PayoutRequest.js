import React, { useState } from "react";

const PayoutRequest = () => {
  const [amount, setAmount] = useState("");

  const handleRequestPayout = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/payout/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ amount }),
    })
      .then((res) => res.json())
      .then((data) => alert(data.message))
      .catch((err) => console.error("Payout request failed:", err));
  };

  return (
    <div>
      <h3>💵 Request a Payout</h3>
      <input
        type="number"
        placeholder="Enter amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={handleRequestPayout}>Request Payout</button>
    </div>
  );
};

export default PayoutRequest;
