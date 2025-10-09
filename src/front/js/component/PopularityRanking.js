import React, { useState, useEffect } from 'react';

const PopularityRanking = ({ type }) => {
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/popularity/${podcastId}`)
      .then(res => res.json())
      .then(data => setRanking(data))
      .catch(err => console.error("Error fetching popularity ranking:", err));
  }, [type]);

  return (
    <div>
      <h3>{type === 'podcast' ? 'Podcast' : 'Radio Station'} Popularity</h3>
      <ul>
        {ranking.map((item, idx) => (
          <li key={item.id}>
            {idx + 1}. {item.name} - {item.engagement_score} points
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PopularityRanking;
