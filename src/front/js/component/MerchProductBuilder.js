import React, { useState } from "react";

export const MerchProductBuilder = () => {
    const [step, setStep] = useState(1);
    const [artUrl, setArtUrl] = useState("");

    return (
        <div className="card bg-dark text-white p-4">
            {step === 1 && (
                <div>
                    <h3>Step 1: Upload Artwork</h3>
                    <input 
                        type="text" 
                        className="form-control mb-3" 
                        placeholder="Paste Artwork URL (PNG/JPG)"
                        onChange={(e) => setArtUrl(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={() => setStep(2)}>Next</button>
                </div>
            )}
            {step === 2 && (
                <div>
                    <h3>Step 2: Preview & Pricing</h3>
                    <img src={artUrl} style={{width: "100px"}} alt="preview" />
                    <div className="mt-3">
                        <label>Retail Price ($)</label>
                        <input type="number" className="form-control" defaultValue="25.00" />
                    </div>
                    <button className="btn btn-success mt-3">Publish to My Store</button>
                </div>
            )}
        </div>
    );
};
