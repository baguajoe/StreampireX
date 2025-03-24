import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const PollComponent = () => {
  const [poll, setPoll] = useState(null);
  const socket = io("http://localhost:5000");

  useEffect(() => {
    socket.on("new_poll", (data) => {
      setPoll(data);
    });
  }, []);

  const submitPollResponse = (response) => {
    socket.emit("poll_response", response);
  };

  return (
    <div>
      {poll && (
        <>
          <h3>{poll.question}</h3>
          {poll.options.map((option, idx) => (
            <button key={idx} onClick={() => submitPollResponse(option)}>
              {option}
            </button>
          ))}
        </>
      )}
    </div>
  );
};

export default PollComponent;
