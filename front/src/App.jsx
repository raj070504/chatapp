import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faSearch, faPaperclip, faPaperPlane, faChevronDown, faPlus, faUser, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { faGrin } from '@fortawesome/free-regular-svg-icons';
import ChatList from './components/ChatList';
import { ChatHeader, ChatMessages } from './components/ChatMessages';
import Login from './components/Login';
import Register from './components/Register';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import NewChatRoom from './components/NewChatRoom';
import useSocket from './hooks/useSocket';
import UpdateProfile from './components/UpdateProfile';
import MathChat from './components/MathChat';
import AIChat from './components/AIChat';

import axios from 'axios';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

import './App.css';

const Header = () => {
  const [userProfile, setUserProfile] = useState({ name: '', photo: '' });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await axios.get('/api/user-profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserProfile({
          name: response.data.name || 'User',
          photo: response.data.photo || ''
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleMenuClick = (action) => {
    setIsDropdownOpen(false);
    switch (action) {
      case 'new-chat':
        navigate('/new-chat');
        break;
      case 'math-chat':
        navigate('/chat/math');
        break;
      case 'update-profile':
        navigate('/update-profile');
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        break;
    }
  };
  return (
    <div className="header">
      <a href='/update-profile' className="profile-link">
        <img 
          src={userProfile.photo ? `http://localhost:3000/uploads/${userProfile.photo}` : "/image.png"} 
          alt="Profile" 
          className="avatar"
        /> 
        <span className="user-name">{userProfile.name}</span>
      </a>
      <div className="header-icons">
        <div className="dropdown-container" ref={dropdownRef}>
          <button 
            className="dropdown-trigger"
            onClick={handleDropdownToggle}
          >
            <FontAwesomeIcon icon={faPlus} className="plus-icon" />
            <FontAwesomeIcon 
              icon={faChevronDown} 
              className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}
            />
          </button>
          
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <div 
                className="dropdown-item"
                onClick={() => handleMenuClick('new-chat')}
              >
                <FontAwesomeIcon icon={faPlus} className="dropdown-icon" />
                <span>New Chat</span>
              </div>
              <div 
                className="dropdown-item"
                onClick={() => handleMenuClick('math-chat')}
              >
                <span className="dropdown-icon">🧮</span>
                <span>Chat with Math Guru</span>
              </div>
              <div 
                className="dropdown-item"
                onClick={() => handleMenuClick('update-profile')}
              >
                <FontAwesomeIcon icon={faUser} className="dropdown-icon" />
                <span>Update Profile</span>
              </div>
              <div 
                className="dropdown-item logout"
                onClick={() => handleMenuClick('logout')}
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="dropdown-icon" />
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
const Search = () => (
  <div className="search"> 
    <input type="text" placeholder="Search or start new chat"/>
  </div>
);

const Sidebar = () => (
  <div className="sidebar">
    <Header />
    <Search />
    <ChatList />
  </div>
);


const ChatInput = ({ chatId }) => {
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const socket = useSocket();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (!socket || !chatId) return;

    // Start typing indicator
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      socket.emit('typing-start', { chatId });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socket.emit('typing-stop', { chatId });
      }
    }, 1000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatId || (!newMessage.trim() && !selectedFile) || !socket) return;

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      socket.emit('typing-stop', { chatId });
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsUploading(true);

    try {
      if (selectedFile) {
        // Handle file upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('chatId', chatId);
        if (newMessage.trim()) {
          formData.append('content', newMessage.trim());
        }

        const token = localStorage.getItem('token');
        const response = await axios.post('/api/upload-attachment', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });

        // Send file message via socket
        socket.emit('send-message', {
          chatId,
          content: newMessage.trim() || '',
          attachment: response.data.attachment
        });
      } else {
        // Send text message only
        socket.emit('send-message', {
          chatId,
          content: newMessage.trim()
        });
      }

      // Reset form
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'fas fa-image';
    } else if (['pdf'].includes(extension)) {
      return 'fas fa-file-pdf';
    } else if (['doc', 'docx'].includes(extension)) {
      return 'fas fa-file-word';
    } else if (['mp4', 'avi', 'mov'].includes(extension)) {
      return 'fas fa-video';
    } else if (['mp3', 'wav'].includes(extension)) {
      return 'fas fa-music';
    }
    return 'fas fa-file';
  };

  return (
    <div className="chat-input-container">
      {selectedFile && (
        <div className="file-preview">
          <div className="file-info">
            <i className={getFileIcon(selectedFile.name)}></i>
            <span className="file-name">{selectedFile.name}</span>
            <button 
              type="button" 
              className="remove-file"
              onClick={removeSelectedFile}
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSendMessage} className="chat-input">
        <FontAwesomeIcon icon={faGrin} className="emoji-icon" />
        <input 
          type="text" 
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message"
          className="message-input"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        />
        <button 
          type="button" 
          className="attachment-button"
          onClick={handleAttachmentClick}
          disabled={isUploading}
        >
          <FontAwesomeIcon icon={faPaperclip} />
        </button>
        <button 
          type="submit" 
          className="send-button"
          disabled={isUploading}
        >
          {isUploading ? (
            <FontAwesomeIcon icon={faCircleNotch} spin />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} />
          )}
        </button>
      </form>
    </div>
  );
};
const ChatArea = ({ chatId }) => (
  <div className="chat-area">
    <ChatMessages chatId={chatId} />
    <ChatInput chatId={chatId} />
  </div>
);



const ChatApp = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBack = () => {
    navigate('/chat');
  };

  if (isMobile) {
    return (
      <div className="chat-app mobile">
        {id ? (
          <div className="chat-area-container">
            <button className="back-button" onClick={handleBack}>
              <FontAwesomeIcon icon={faArrowLeft} /> Back
            </button>
            <ChatArea chatId={id} />
          </div>
        ) : (
          <Sidebar />
        )}
      </div>
    );
  }

  return (
    <div className="chat-app desktop">
      <Sidebar />
      <ChatArea chatId={id} />
    </div>
  );
};



// Add this new component after ChatApp
const MathChatApp = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBack = () => {
    navigate('/chat');
  };

  if (isMobile) {
    return (
      <div className="chat-app mobile">
        <div className="chat-area-container">
          <button className="back-button" onClick={handleBack}>
            <FontAwesomeIcon icon={faArrowLeft} /> Back
          </button>
          <MathChat />
        </div>
      </div>
    );
  }

  return (
   <div className="chat-app desktop">
      <div className="math-chat-sidebar">
        <button className="back-to-login-button" onClick={handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Login
        </button>
        <div className="math-chat-info">
          <h3>Math Chat</h3>
          <p>Solve mathematical problems without login</p>
        </div>
      </div>
      <MathChat />
    </div>
  );
};

const AiChatApp = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBack = () => {
    navigate('/chat');
  };

  if (isMobile) {
    return (
      <div className="chat-app mobile">
        <div className="chat-area-container">
          <button className="back-button" onClick={handleBack}>
            <FontAwesomeIcon icon={faArrowLeft} /> Back
          </button>
          <AIChat />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-app desktop">
      <Sidebar />
      <AIChat />
    </div>
  );
};



function App() {
  const [selectedChat, setSelectedChat] = useState(null);

  const handleChatCreated = (newChat) => {
    setSelectedChat(newChat);
  };
   const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for new chat notifications
    const handleNewChatCreated = (chatData) => {
      console.log('New chat created:', chatData);
      // You can add logic here to update the chat list
      // or show a notification
    };

    socket.on('new-chat-created', handleNewChatCreated);

    return () => {
      socket.off('new-chat-created', handleNewChatCreated);
    };
  }, [socket]);



  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />  
          <Route path="/new-chat" element={<NewChatRoom onChatCreated={handleChatCreated} />} />
         
         <Route path="/chat/math" element={<MathChatApp />} />
         <Route path="/chat/ai" element={<AiChatApp />} />
          <Route path="/chat/:id" element={<ChatApp />} />
          <Route path="/chat" element={<ChatApp />} />
          <Route path="/update-profile" element={<UpdateProfile />} />
          
        </Routes>
      </div>
    </Router>
  );
}

export default App;