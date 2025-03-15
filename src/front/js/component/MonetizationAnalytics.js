import React from "react";
import styled from "styled-components";

const MonetizationContainer = styled.div`
  background: #222;
  padding: 20px;
  border-radius: 10px;
  margin-top: 20px;
`;

const MonetizationAnalytics = () => {
  return (
    <MonetizationContainer>
      <h3>💰 Monetization</h3>
      <p>Earnings: $5,230 | Subscribers: 12,450</p>
    </MonetizationContainer>
  );
};

export default MonetizationAnalytics;
