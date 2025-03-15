import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";

const InteractionContainer = styled.div`
  background: #222;
  padding: 20px;
  border-radius: 10px;
  margin-top: 20px;
`;

const Comment = styled.div`
  background: #333;
  padding: 10px;
  margin-bottom: 5px;
  border-radius: 5px;
`;

const AudienceInteraction = () => {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    axios.get("/api/podcasts/comments").then((response) => {
      setComments(response.data);
    });
  }, []);

  return (
    <InteractionContainer>
      <h3>💬 Audience Interaction</h3>
      {comments.map((c) => (
        <Comment key={c.id}>{c.text}</Comment>
      ))}
    </InteractionContainer>
  );
};

export default AudienceInteraction;
