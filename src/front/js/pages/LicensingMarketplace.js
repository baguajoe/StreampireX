// LicensingMarketplace.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const LicensingMarketplace = () => {
  const [licenses, setLicenses] = useState([]);

  useEffect(() => {
    axios.get("/api/licenses")
      .then((res) => setLicenses(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h2>Licensing & Sync Marketplace</h2>
      {licenses.map((license) => (
        <div key={license.id}>
          <h3>{license.title}</h3>
          <p>Price: ${license.price}</p>
        </div>
      ))}
    </div>
  );
};

export default LicensingMarketplace;