import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/CategoriesBar.css"; // ✅ Make sure this file exists!

const BrowsePodcastCategories = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/podcasts/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  return (
    <div className="categories-wrapper">
      <h1 className="categories-heading">🎧 Podcast Categories</h1>
      <div className="categories-scroll">
        {categories.length > 0 ? (
          categories.map((category, index) => (
            <Link key={index} to={`/category/${category}`} className="category-pill">
              {category}
            </Link>
          ))
        ) : (
          <p>Loading categories...</p>
        )}
      </div>
    </div>
  );
};

export default BrowsePodcastCategories;
