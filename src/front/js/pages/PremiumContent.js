// PremiumContent.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const PremiumContent = () => {
  const [content, setContent] = useState([]);

  useEffect(() => {
    axios.get("/api/premium-content")
      .then((res) => setContent(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h2>Premium Content</h2>
      {content.map((item) => (
        <div key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  );
};

export default PremiumContent;