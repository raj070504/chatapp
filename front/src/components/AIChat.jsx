import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/MathChat.css';

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);

  // Replace with your OpenAI API key
  const OPENAI_API_KEY = 'xx';

  useEffect(() => {
    // Initial welcome message
    addBotMessage('Hello! I\'m your AI assistant. How can I help you today? 🤖');
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addBotMessage = (content, delay = 0) => {
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        content,
        isUser: false,
        timestamp: new Date()
      }]);
    }, delay);
  };

  const addUserMessage = (content) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      content,
      isUser: true,
      timestamp: new Date()
    }]);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    addUserMessage(userMessage);
    setInputValue('');
    setLoading(true);

    // Add user message to conversation history
    const newHistory = [
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant.'
            },
            ...newHistory
          ],
          max_tokens: 500,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiReply = response.data.choices[0].message.content;

      // Update conversation history with AI response
      setConversationHistory([
        ...newHistory,
        { role: 'assistant', content: aiReply }
      ]);

      addBotMessage(aiReply, 500);
    } catch (error) {
      console.error('ChatGPT API Error:', error);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid API key. Please check your OpenAI API key.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }

      addBotMessage(
        <div className="error-container">
          <strong>❌ Error:</strong>
          <div className="error-message">{errorMessage}</div>
        </div>,
        500
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="math-chat-container">
      <div className="chat-header">
        <div className="chat-header-info">
          <h3>Chat with AI</h3>
          <p>{loading ? 'Typing...' : 'Online'}</p>
        </div>
      </div>

      <div className="math-chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`math-message ${message.isUser ? 'user' : 'bot'}`}
          >
            <div className="math-message-content">
              {typeof message.content === 'string' ? (
                <div>{message.content}</div>
              ) : (
                message.content
              )}
            </div>
            <div className="math-message-time">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="math-chat-input-container">
        <input
          type="text"
          className="math-chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={loading ? 'AI is typing...' : 'Type your message...'}
          disabled={loading}
        />
        <button
          className="math-send-button"
          onClick={handleSend}
          disabled={loading || !inputValue.trim()}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default AIChat;