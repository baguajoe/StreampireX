import React, { useState } from "react";

const MerchCheckout = () => {
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US"
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Checkout flow starter page ready. Next step: connect Stripe + backend fulfillment.");
  };

  return (
    <div className="container py-5 text-light">
      <h1 className="mb-4">Merch Checkout</h1>

      <form className="card bg-dark text-light border-secondary p-4" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Full Name</label>
          <input className="form-control" value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="form-label">Address</label>
          <input className="form-control" value={form.address} onChange={(e) => update("address", e.target.value)} />
        </div>

        <div className="row">
          <div className="col-md-4 mb-3">
            <label className="form-label">City</label>
            <input className="form-control" value={form.city} onChange={(e) => update("city", e.target.value)} />
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">State</label>
            <input className="form-control" value={form.state} onChange={(e) => update("state", e.target.value)} />
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">ZIP</label>
            <input className="form-control" value={form.zip} onChange={(e) => update("zip", e.target.value)} />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Country</label>
          <input className="form-control" value={form.country} onChange={(e) => update("country", e.target.value)} />
        </div>

        <button className="btn btn-primary" type="submit">Continue to Payment</button>
      </form>
    </div>
  );
};

export default MerchCheckout;
