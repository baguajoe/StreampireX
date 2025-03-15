import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";

const EpisodesContainer = styled.div`
  background: #222;
  padding: 20px;
  border-radius: 10px;
`;

const Episode = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid #444;
`;

const RecentEpisodes = () => {
  const [episodes, setEpisodes] = useState([]);

  useEffect(() => {
    axios.get("/api/podcasts/episodes").then((response) => {
      setEpisodes(response.data);
    });
  }, []);

  return (
    <EpisodesContainer>
      <h3>Recent Episodes</h3>
      {episodes.map((ep) => (
        <Episode key={ep.id}>
          <span>{ep.title}</span>
          <span>{ep.duration}</span>
        </Episode>
      ))}
    </EpisodesContainer>
  );
};

export default RecentEpisodes;
