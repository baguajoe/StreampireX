// src/components/VREventList.js

import React, { useEffect, useState } from 'react';

const VREventList = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch('/api/vr-events')  // API endpoint to fetch VR events
      .then((response) => response.json())
      .then((data) => setEvents(data));
  }, []);

  return (
    <div className="event-list">
      <h2>All VR Events</h2>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <h3>{event.title}</h3>
            <p>{event.description}</p>
            <p>{event.date}</p>
            <button onClick={() => joinEvent(event.id)}>Join Event</button>
          </li>
        ))}
      </ul>
    </div>
  );

  function joinEvent(eventId) {
    // Implement the logic to join the event
    console.log('Joining event', eventId);
  }
};

export default VREventList;
