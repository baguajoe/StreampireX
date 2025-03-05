import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const BrowsePodcastCategories = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/podcasts/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  return (
    <div>
      <h1>🎧 Podcast Categories</h1>
      <ul>
        {categories.length > 0 ? (
          categories.map((category, index) => (
            <li key={index}>
              <Link to={`/category/${category}`}>{category}</Link>
            </li>
          ))
        ) : (
          <p>Loading categories...</p>
        )}
      </ul>
    </div>
  );
};

export default BrowsePodcastCategories;
