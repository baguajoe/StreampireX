import React from "react";
import StripeCheckout from "react-stripe-checkout";

const EpisodePage = ({ episode }) => {
    const handlePurchase = (token) => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/podcast/${episode.podcast_id}/purchase`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify({ episode_id: episode.id, stripe_token: token.id }),
        })
        .then(res => res.json())
        .then(data => alert(data.message));
    };

    return (
        <div>
            <h1>{episode.title}</h1>
            {episode.is_premium && (
                <StripeCheckout
                    stripeKey="your_stripe_public_key"
                    token={handlePurchase}
                    amount={episode.price_per_episode * 100}
                    name="Buy Episode"
                    description={episode.title}
                />
            )}
        </div>
    );
};

export default EpisodePage;
