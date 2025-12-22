import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import useSocket from '../hooks/useSocket';

const ChatHeader = ({ chatId }) => {
  const [chatInfo, setChatInfo] = useState({ name: '', status: '', photo: '' });

  useEffect(() => {
    if (chatId) {
      fetchChatInfo();
    }
  }, [chatId]);

  const fetchChatInfo = async () => {
    try {
      console.log('Fetching chat info for chatId:', chatId);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
     ,     });
      setChatInfo({
        name: response.data.chat_name || 'Chat',
        status: response.data.is_group ? 'Group Chat' : 'Online',
        photo: response.data.user_photo || null
      });
    } catch (error) {
      console.error('Error fetching chat info:', error);
      setChatInfo({ name: 'Chat', status: 'Offline', photo: null });
    }
  };

  if (!chatId) {
    return (
      <div className="chat-header">
        <div className="chat-header-info">
          <h3>Select a chat</h3>
          <p>Choose a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-header">
      <img 
        src={chatInfo.photo ? `/uploads/${chatInfo.photo}` : "/uploads/image.png"} 
        alt="Contact" 
        className="avatar"
      />
      <div className="chat-header-info">
        <h3>{chatInfo.name}</h3>
        <p>{chatInfo.status}</p>
      </div>
     
    </div>
  );
};

const Lightbox = ({ isOpen, imageSrc, imageAlt, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        <img src={imageSrc} alt={imageAlt} className="lightbox-image" />
        <div className="lightbox-caption">{imageAlt}</div>
      </div>
    </div>
  );
};

const MessageAttachment = ({ attachment }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isImage = attachment.file_type.startsWith('image/');
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isImage) {
    return (
      <>
        <div className="message-attachment">
          <div className="image-attachment" onClick={() => setLightboxOpen(true)}>
            <img 
              src={`/uploads/attachments/${attachment.file_name}`}
              alt={attachment.original_name}
              className="attachment-image"
            />
            <div className="image-overlay">
              {attachment.original_name}
            </div>
          </div>
        </div>
        <Lightbox
          isOpen={lightboxOpen}
          imageSrc={`/uploads/attachments/${attachment.file_name}`}
          imageAlt={attachment.original_name}
          onClose={() => setLightboxOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="message-attachment">
      <div className="file-attachment">
        <div className="file-info">
          <div className="file-details">
            <div className="file-name">{attachment.original_name}</div>
            <div className="file-size">{formatFileSize(attachment.file_size)}</div>
          </div>
          <a 
            href={`/uploads/attachments/${attachment.file_name}`}
            download={attachment.original_name}
            className="download-button"
            title="Download file"
            target='blank'
          >
            <i className="fas fa-download"></i>
          </a>
        </div>
      </div>
    </div>
  );
};

const ChatMessages = ({ chatId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socket = useSocket();

  useEffect(() => {
    if (chatId) {
      fetchMessages();
    }
  }, [chatId]);

  useEffect(() => {
    if (socket) {
      socket.on('new-message', (message) => {
        if (message.chat_id == chatId) {
          setMessages(prev => [...prev, message]);
        }
      });

      return () => {
        socket.off('new-message');
      };
    }
  }, [socket, chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/upload-attachment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (socket) {
        socket.emit('send-message', {
          chatId,
          content: '',
          attachment: response.data.attachment
        });
      }

      fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && socket) {
      socket.emit('send-message', {
        chatId,
        content: newMessage,
        attachment: null
      });
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getCurrentUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId;
    } catch {
      return null;
    }
  };

  const currentUserId = getCurrentUserId();

  if (!chatId) {
    return (
      <div className="chat-messages">
        <div className="no-chat-selected">
          <h3>Welcome to Chat</h3>
          <p>Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ChatHeader chatId={chatId} />
      <div className="chat-messages">
        {messages.map((message) => (
          <div
            className={`message-container ${message.user_id === currentUserId?'m-sent' : ''}`}
          >
          <div
            key={message.id}
            className={`message ${message.user_id === currentUserId ? 'sent' : 'received'}`}
          >
            {message.content && <p>{message.content}</p>}
            {message.attachment && <MessageAttachment attachment={message.attachment} />}
            <div className="message-time">
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
     
    </>
  );
};

export { ChatHeader, ChatMessages };