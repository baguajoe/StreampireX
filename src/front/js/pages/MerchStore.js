import React, { useState, useEffect } from "react";
import { MerchProductBuilder } from "../component/MerchProductBuilder";

export const MerchStore = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [showBuilder, setShowBuilder] = useState(false);

    const startMerchStore = () => {
        const token = localStorage.getItem("token");
        window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/printful/connect?token=${token}`;
    };

    return (
        <div className="container mt-5">
            <h1 className="text-white mb-4">Merch Manager</h1>
            
            {!isConnected ? (
                <div className="jumbotron bg-dark text-white p-5 rounded">
                    <h2>Sell Custom Merch</h2>
                    <p>StreampireX handles printing, shipping, and customer service automatically.</p>
                    <button onClick={startMerchStore} className="btn btn-success btn-lg">
                        Start Merch Store
                    </button>
                </div>
            ) : (
                <div>
                    <button className="btn btn-outline-primary mb-4" onClick={() => setShowBuilder(!showBuilder)}>
                        {showBuilder ? "View Products" : "+ Create New Product"}
                    </button>
                    {showBuilder ? <MerchProductBuilder /> : <div className="text-white">Your active products will appear here.</div>}
                </div>
            )}
        </div>
    );
};
