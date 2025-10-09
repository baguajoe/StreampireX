// src/pages/PaymentProcessing.js
import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_test_51S56461wmbXT13hC7rZon6rQF6jYWxdXZ1mlwUut3vVYPn651N8skwxCb94fA8qsbyIt13O03HdHf4ZzDmACgPK00R0UznpnG");

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setStatus("Processing payment...");

    const res = await fetch(process.env.REACT_APP_BACKEND_URL + "/api/create-payment-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({ amount: 999 }), // $9.99 = 999 cents
    });

    const { clientSecret } = await res.json();

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
      },
    });

    if (result.error) {
      setStatus("❌ " + result.error.message);
    } else if (result.paymentIntent.status === "succeeded") {
      setStatus("✅ Payment successful!");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <h2>Enter your payment info</h2>
      <CardElement />
      <button type="submit" disabled={!stripe}>Pay</button>
      <p>{status}</p>
    </form>
  );
};

const PaymentProcessing = () => {
  return (
    <div className="p-4">
      <h1>💳 Payment Processing</h1>
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  );
};

export default PaymentProcessing;
