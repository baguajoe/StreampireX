// src/components/VRUserDashboard.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const VRUserDashboard = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch VR events from API
    fetch('/api/vr-events') // Your backend API route for events
      .then((response) => response.json())
      .then((data) => setEvents(data));
  }, []);

  return (
    <div className="user-dashboard">
      <h2>Upcoming VR Events</h2>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <h3>{event.title}</h3>
            <p>{event.description}</p>
            <p>Event Date: {event.date}</p>
            <Link to={`/vr-events/${event.id}`}>Join Event</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VRUserDashboard;
