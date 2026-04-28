// src/pages/PaymentProcessing.js
import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// SP-7: env-var-ified. Set REACT_APP_STRIPE_PUBLISHABLE_KEY in .env (local)
// AND in Vercel project env vars (deployed). Swap pk_test_ for pk_live_ when
// taking real payments.
const _stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
if (!_stripeKey) {
  console.error("[Stripe] REACT_APP_STRIPE_PUBLISHABLE_KEY is not set — payments will fail");
}
const stripePromise = loadStripe(_stripeKey);

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
