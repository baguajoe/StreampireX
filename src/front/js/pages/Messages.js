import React, { useState, useEffect, useContext } from "react";
import { Context } from "../store/appContext";
import { io } from "socket.io-client";
import "../../styles/messages.css";

const Messages = () => {
  const { store } = useContext(Context);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Fetch conversations
    fetchConversations();
    
    // Initialize socket
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const newSocket = io(backendUrl, {
      auth: { token: localStorage.getItem('token') }
    });
    
    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, []);

  const fetchConversations = async () => {
    const response = await fetch(`${process.env.BACKEND_URL}/api/messages/conversations`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setConversations(data);
  };

  const loadConversation = async (userId) => {
    const response = await fetch(`${process.env.BACKEND_URL}/api/messages/conversation/${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setMessages(data);
    setActiveConversation(userId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;
    
    await fetch(`${process.env.BACKEND_URL}/api/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        recipient_id: activeConversation,
        message: newMessage
      })
    });
    
    setNewMessage('');
  };

  return (
    <div className="messages-container">
      <div className="conversations-sidebar">
        <h2>Messages</h2>
        {conversations.map(conv => (
          <div 
            key={conv.conversation_id}
            className="conversation-item"
            onClick={() => loadConversation(conv.other_user.id)}
          >
            <h4>{conv.other_user.username}</h4>
            <span>{new Date(conv.last_message_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
      
      <div className="messages-main">
        {activeConversation ? (
          <>
            <div className="messages-list">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`message ${msg.sender_id === store.user.id ? 'sent' : 'received'}`}
                >
                  <p>{msg.message}</p>
                  <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
            
            <div className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className="no-conversation">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;