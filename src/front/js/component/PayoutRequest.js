import React, { useState } from "react";

const PayoutRequest = ({ balance, method }) => {
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState('');
  const [recipientId, setRecipientId] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  const handleSendPayment = () => {
    if (!amount || parseFloat(amount) <= 0) {
      return setStatus("Please enter a valid amount.");
    }

    if (!recipientId && !recipientEmail) {
      return setStatus("Enter a recipient user ID or email.");
    }

    const payload = {
      amount,
      method,
      ...(recipientId && { recipient_id: recipientId }),
      ...(recipientEmail && { recipient_email: recipientEmail }),
    };

    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/send-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => setStatus(data.message))
      .catch((err) => console.error("Payment failed:", err));
  };

  return (
    <div className="payout-request">
      <h3>💸 Send Payment</h3>

      <input
        type="text"
        placeholder="Recipient User ID (optional)"
        value={recipientId}
        onChange={(e) => setRecipientId(e.target.value)}
      />

      <input
        type="email"
        placeholder="Recipient Email (optional)"
        value={recipientEmail}
        onChange={(e) => setRecipientEmail(e.target.value)}
      />

      <input
        type="number"
        placeholder={`Amount (Max: $${balance?.toFixed(2) || "..."})`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button
        onClick={handleSendPayment}
        disabled={
          (!recipientId && !recipientEmail) ||
          !amount ||
          parseFloat(amount) <= 0 ||
          (balance && parseFloat(amount) > balance)
        }
      >
        Send Payment
      </button>
    </div>
  );
};

export default PayoutRequest;
