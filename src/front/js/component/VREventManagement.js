// src/components/VREventManagement.js

import React, { useState } from 'react';

const VREventManagement = () => {
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [isLive, setIsLive] = useState(false);

  const handleCreateEvent = () => {
    // Implement API call to create VR event
    console.log("Creating VR event:", { eventTitle, eventDescription, eventDate, isLive });
    // Here, you would make an API call to your backend to create the event.
  };

  return (
    <div className="event-management">
      <h2>Manage Your VR Event</h2>
      <form onSubmit={handleCreateEvent}>
        <div>
          <label>Event Title:</label>
          <input 
            type="text" 
            value={eventTitle} 
            onChange={(e) => setEventTitle(e.target.value)} 
          />
        </div>
        <div>
          <label>Event Description:</label>
          <textarea 
            value={eventDescription} 
            onChange={(e) => setEventDescription(e.target.value)} 
          />
        </div>
        <div>
          <label>Event Date:</label>
          <input 
            type="datetime-local" 
            value={eventDate} 
            onChange={(e) => setEventDate(e.target.value)} 
          />
        </div>
        <div>
          <label>Is Live:</label>
          <input 
            type="checkbox" 
            checked={isLive} 
            onChange={(e) => setIsLive(e.target.checked)} 
          />
        </div>
        <button type="submit">Create Event</button>
      </form>
    </div>
  );
};

export default VREventManagement;
