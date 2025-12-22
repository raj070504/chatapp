import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Initialize socket connection
    socketRef.current = io('http://localhost:3000', {
      auth: {
        token: token
      }
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server');
      // Join user's chat rooms
      socket.emit('join-chats');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return socketRef.current;
};

export default useSocket;