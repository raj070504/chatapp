import React from 'react';
import { Link } from 'react-router-dom';

const ChatItem = ({ name, lastMessage, roomId,image }) => (
  <Link to={`/chat/${roomId}`} className="chat-link">
    <div className="chat-item">
      <img 
        src={image ? `/uploads/${image}` : "/uploads/image.png"} 
        alt="Contact" 
        className="avatar" 
      />          <div className="chat-info">
        <h4>{name}</h4>
        <p>{lastMessage}</p>
      </div>
    </div>
  </Link>
);

export default ChatItem;
