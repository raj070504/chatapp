import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChatItem from "./ChatItem";

const ChatList = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/chats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setChats(response.data);
        setLoading(false);
      } catch (err) {
        // redirct to login page
        window.location.href = '/';
        setError('Failed to load chats. Please try again.');
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  if (loading) {
    return <div className="chat-list">Loading...</div>;
  }

  if (error) {
    return <div className="chat-list">{error}</div>;
  }

  return (
    <div className="chat-list">
      {chats.length > 0 ? (
        <>
          {chats.map(chat => {
            const chat_name = (chat.chat_name === '' || chat.chat_name === null) 
              ? chat.user_name 
              : chat.chat_name;
            
            return (
              <ChatItem 
                key={chat.id}
                name={chat_name} 
                lastMessage={chat.lastMessage}
                roomId={chat.id}  
                image={chat.user_photo}  
              />
            );
          })}
  
          <ChatItem 
            key={'math'}
            name={'Chats with Math'} 
            lastMessage={'click here to start a chat'}
            roomId={'Math'}  
            image={''}  
          />
           <ChatItem 
            key={'ai'}
            name={'Chats with Ai'} 
            lastMessage={'click here to start a chat'}
            roomId={'ai'}  
            image={''}  
          />
        </>
      ) : (
        <>
        <ChatItem 
          key={'math'}
          name={'Chats with Math'} 
          lastMessage={'click here to start a chat'}
          roomId={'Math'}  
          image={''}  
        />
            <ChatItem 
            key={'ai'}
            name={'Chats with Ai'} 
            lastMessage={'click here to start a chat'}
            roomId={'ai'}  
            image={''}  
          />
          </>
      )}
    </div>
  );
};

export default ChatList;