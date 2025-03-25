// ProductCheckout.js
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';

export default function ProductCheckout() {
  const { productId } = useParams();
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState(null);

  useEffect(() => {
    axios.post(`/api/products/${productId}/checkout`)
      .then(res => setClientSecret(res.data.clientSecret))
      .catch(err => console.error(err));
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) }
    });

    if (result.error) {
      alert("Payment failed: " + result.error.message);
    } else {
      alert("✅ Payment successful!");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe || !clientSecret}>
        Pay Now
      </button>
    </form>
  );
}
