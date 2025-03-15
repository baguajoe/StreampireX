import React from "react";
import styled from "styled-components";

const OverviewContainer = styled.div`
  background: #222;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

const PodcastOverview = () => {
  return (
    <OverviewContainer>
      <h2>Podcast Name</h2>
      <p>🔥 100K Plays | 🎧 20 Episodes | ⭐ 4.8 Rating</p>
    </OverviewContainer>
  );
};

export default PodcastOverview;
