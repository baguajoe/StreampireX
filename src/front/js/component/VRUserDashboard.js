

import React, { useState, useEffect } from 'react';
// import VRCreateEvent from './VRCreateEvent';  // Import the new VR event component

const VRUserDashboard = () => {
  const [events, setEvents] = useState([]);

  const handleCreateEvent = (newEvent) => {
    setEvents([...events, newEvent]); // For simplicity, we'll just add the event locally
  };

  useEffect(() => {
    // Fetch VR events from API
    fetch('/api/vr-events')
      .then((response) => response.json())
      .then((data) => setEvents(data));
  }, []);

  return (
    <div className="user-dashboard">
      <h2>Upcoming VR Events</h2>
      {/* <VRCreateEvent onCreate={handleCreateEvent} /> */}
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <h3>{event.title}</h3>
            <p>{event.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VRUserDashboard;
