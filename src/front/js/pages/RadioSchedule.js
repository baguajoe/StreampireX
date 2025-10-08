import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../styles/RadioSchedule.css';

const RadioSchedule = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [schedule, setSchedule] = useState([]);
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({
    day: 'Monday',
    start_time: '09:00',
    end_time: '11:00',
    show_name: '',
    dj_name: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchStation();
    fetchSchedule();
  }, [id]);

  const fetchStation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStation(data.station);
      }
    } catch (error) {
      console.error('Error fetching station:', error);
    }
  };

  const fetchSchedule = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio/${id}/schedule`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSchedule(data.schedule || []);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const addScheduleSlot = async () => {
    if (!newSlot.show_name || !newSlot.dj_name) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio/${id}/schedule/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSlot)
      });
      
      if (response.ok) {
        alert('✅ Schedule slot added!');
        fetchSchedule();
        setNewSlot({
          day: 'Monday',
          start_time: '09:00',
          end_time: '11:00',
          show_name: '',
          dj_name: ''
        });
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding schedule slot:', error);
      alert('Failed to add schedule slot');
    }
  };

  const deleteScheduleSlot = async (slotIndex) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio/${id}/schedule/${slotIndex}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        alert('✅ Schedule slot deleted');
        fetchSchedule();
      }
    } catch (error) {
      console.error('Error deleting schedule slot:', error);
      alert('Failed to delete schedule slot');
    }
  };

  if (loading) {
    return (
      <div className="radio-schedule-container">
        <div className="loading">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="radio-schedule-container">
      {/* Header */}
      <div className="schedule-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <h1>📅 Broadcast Schedule</h1>
        {station && <h2>{station.name}</h2>}
      </div>

      {/* Schedule Grid */}
      <div className="schedule-grid">
        {daysOfWeek.map(day => (
          <div key={day} className="day-column">
            <h3 className="day-header">{day}</h3>
            <div className="time-slots">
              {schedule
                .filter(slot => slot.day === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((slot, index) => (
                  <div key={index} className="time-slot">
                    <div className="slot-time">
                      {slot.start_time} - {slot.end_time}
                    </div>
                    <div className="slot-show">{slot.show_name}</div>
                    <div className="slot-dj">DJ: {slot.dj_name}</div>
                    <button 
                      className="delete-slot-btn"
                      onClick={() => deleteScheduleSlot(index)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              {schedule.filter(slot => slot.day === day).length === 0 && (
                <div className="empty-day">No shows scheduled</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Slot Form */}
      <div className="add-slot-section">
        <h3>➕ Add Time Slot</h3>
        <div className="add-slot-form">
          <select 
            value={newSlot.day} 
            onChange={(e) => setNewSlot({...newSlot, day: e.target.value})}
            className="form-select"
          >
            {daysOfWeek.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>

          <input
            type="time"
            value={newSlot.start_time}
            onChange={(e) => setNewSlot({...newSlot, start_time: e.target.value})}
            className="form-input"
          />

          <input
            type="time"
            value={newSlot.end_time}
            onChange={(e) => setNewSlot({...newSlot, end_time: e.target.value})}
            className="form-input"
          />

          <input
            type="text"
            placeholder="Show Name"
            value={newSlot.show_name}
            onChange={(e) => setNewSlot({...newSlot, show_name: e.target.value})}
            className="form-input"
          />

          <input
            type="text"
            placeholder="DJ Name"
            value={newSlot.dj_name}
            onChange={(e) => setNewSlot({...newSlot, dj_name: e.target.value})}
            className="form-input"
          />

          <button onClick={addScheduleSlot} className="add-slot-btn">
            Add Slot
          </button>
        </div>
      </div>
    </div>
  );
};

export default RadioSchedule;