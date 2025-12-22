import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useSocket from '../hooks/useSocket';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faUsers, faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';

const NewChatRoom = ({ onChatCreated }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [chatName, setChatName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const socket = useSocket();

  const searchUsers = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/users/search?term=${term}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    searchUsers(searchTerm);
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const createChat = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/chats', {
        users: selectedUsers.map(u => u.id),
        name: selectedUsers.length > 1 ? chatName : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reset form
      setSelectedUsers([]);
      setChatName('');
      setSearchTerm('');
      setSearchResults([]);

      // Notify parent component
      if (onChatCreated) {
        onChatCreated(response.data);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    
    
    <div className="new-chat-room">
      <h2 className="new-chat-title">
        <FontAwesomeIcon icon={faPlus} className="icon-plus" /> New Chat
      </h2>
      
      <form onSubmit={handleSearchSubmit} className="search-form">
        <div className="search-input-container">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </form>
    
      {isSearching && (
        <div className="searching-message">
          <FontAwesomeIcon icon="spinner" spin /> Searching...
        </div>
      )}
    
      {!isSearching && searchResults.length === 0 && searchTerm && (
        <div className="no-results-message">
          <FontAwesomeIcon icon="exclamation-circle" /> No users found.
        </div>
      )}
    
      <div className="user-list-container">
        {searchResults.length > 0 && (
          <div className="user-list">
            {searchResults.map(user => (
              <div
                key={user.id}
                className={`user-item ${selectedUsers.find(u => u.id === user.id) ? 'selected' : ''}`}
                onClick={() => toggleUserSelection(user)}
              >
                <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <div className="user-info">
                  <strong>{user.name}</strong>
                  <small>{user.phone}</small>
                </div>
              </div>
            ))}
          </div>
        )}
    
        {selectedUsers.length > 0 && (
          <div className="selected-users">
            <h4><FontAwesomeIcon icon={faUsers} /> Selected</h4>
            <div className="selected-users-list">
              {selectedUsers.map(user => (
                <div key={user.id} className="selected-user">
                  {user.name}
                  <button onClick={() => toggleUserSelection(user)} className="remove-user">
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    
      {selectedUsers.length > 1 && (
        <input
          type="text"
          placeholder="Group name (optional)"
          value={chatName}
          onChange={(e) => setChatName(e.target.value)}
          className="group-name-input"
        />
      )}
    
      <div className="button-container">
        <button
          onClick={createChat}
          disabled={selectedUsers.length === 0 || isCreating}
          className="create-chat-button"
        >
          {isCreating ? <FontAwesomeIcon icon="spinner" spin /> : <FontAwesomeIcon icon="comment" />}
          {isCreating ? ' Creating...' : ' Create Chat'}
        </button>
        <button onClick={() => window.location='/chat'} className="go-back-button">
          <FontAwesomeIcon icon={faTimes} /> Back
        </button>
      </div>
    </div>
  );
};

export default NewChatRoom;