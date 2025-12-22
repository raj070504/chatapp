import express from 'express';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a Nodemailer transporter using SMTP
const transporter = nodemailer.createTransport({
  host: 'email-smtp.ap-south-1.amazonaws.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: 'AKIAYQYUA34OXVHYFNOD',
    pass: 'BA9MCyKfnUaQTmeqQUZcNXcO1E1shaBmCWyAmodSThEk'
  }
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"]
  }
});



app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/attachments', express.static('uploads/attachments'));



const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  })
});


const attachmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/attachments/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const attachmentUpload = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow all file types for now, but you can restrict if needed
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp4|avi|mov|mp3|wav|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, videos, and audio files are allowed.'));
    }
  }
});



app.post('/api/upload-attachment', attachmentUpload.single('file'), async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const attachment = {
      file_name: req.file.filename,
      original_name: req.file.originalname,
      file_size: req.file.size,
      file_type: req.file.mimetype
    };

    res.json({ attachment });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Store active users and their socket connections
const activeUsers = new Map();
const typingUsers = new Map(); // chatId -> Set of userIds

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    
    // Get user info
    const [users] = await pool.query('SELECT name FROM users WHERE id = ?', [decoded.userId]);
    socket.userName = users[0]?.name || 'Unknown User';
    
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  // console.log(`User ${socket.userName} connected with socket ${socket.id}`);
  
  // Store user connection
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    name: socket.userName
  });

  // Join user to their chat rooms
  socket.on('join-chats', async () => {
    try {
      const [chats] = await pool.query(`
        SELECT chat_id FROM chat_participants WHERE user_id = ?
      `, [socket.userId]);
      
      chats.forEach(chat => {
        socket.join(`chat_${chat.chat_id}`);
      });
    } catch (error) {
      console.error('Error joining chats:', error);
    }
  });

  // Handle typing indicators
  socket.on('typing-start', ({ chatId }) => {
    if (!typingUsers.has(chatId)) {
      typingUsers.set(chatId, new Set());
    }
    typingUsers.get(chatId).add(socket.userId);
    
    socket.to(`chat_${chatId}`).emit('user-typing', {
      userId: socket.userId,
      userName: socket.userName,
      chatId
    });
  });

  socket.on('typing-stop', ({ chatId }) => {
    if (typingUsers.has(chatId)) {
      typingUsers.get(chatId).delete(socket.userId);
      if (typingUsers.get(chatId).size === 0) {
        typingUsers.delete(chatId);
      }
    }
    
    socket.to(`chat_${chatId}`).emit('user-stopped-typing', {
      userId: socket.userId,
      chatId
    });
  });

 socket.on('send-message', async (data) => {
    try {
      const { chatId, content, attachment } = data;
      const userId = socket.userId;

      if (!userId || !chatId) {
        socket.emit('error', { message: 'Invalid user or chat' });
        return;
      }

      // Insert message into database
      const [result] = await pool.query(
        'INSERT INTO messages (chat_id, sender_id, content, created_at) VALUES (?, ?, ?, NOW())',
        [chatId, userId, content || '']
      );  

      const messageId = result.insertId;
      let attachmentData = null;

      // If there's an attachment, save it to the database
      if (attachment) {
        const [attachmentResult] = await pool.query(
          'INSERT INTO message_attachments (message_id, file_name, original_name, file_size, file_type) VALUES (?, ?, ?, ?, ?)',
          [messageId, attachment.file_name, attachment.original_name, attachment.file_size, attachment.file_type]
        );

        attachmentData = {
          id: attachmentResult.insertId,
          file_name: attachment.file_name,
          original_name: attachment.original_name,
          file_size: attachment.file_size,
          file_type: attachment.file_type
        };
      }

      // Get user info for the message
      const [userInfo] = await pool.query(
        'SELECT name FROM users WHERE id = ?',
        [userId]
      );

      const messageData = {
        id: messageId,
        chat_id: chatId,
        user_id: userId,
        content: content || '',
        created_at: new Date(),
        user_name: userInfo[0]?.name || 'Unknown',
        attachment: attachmentData
      };

      // Send message to all participants in the chat
      io.to(`chat_${chatId}`).emit('new-message', messageData);

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userName} disconnected`);
    activeUsers.delete(socket.userId);
    
    // Clear typing indicators for this user
    typingUsers.forEach((users, chatId) => {
      if (users.has(socket.userId)) {
        users.delete(socket.userId);
        socket.to(`chat_${chatId}`).emit('user-stopped-typing', {
          userId: socket.userId,
          chatId
        });
      }
    });
  });
});

function generateJWT(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1y' });
}


app.get('/api/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token is missing' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const userId = decoded.userId;
    // Check if user has completed registration
    const [users] = await pool.query('SELECT name, phone FROM users WHERE id = ?', [userId]);
    const user = users[0];
    
    const isRegistered = user && user.name && user.phone;
    
    res.json({ 
      valid: true, 
      userId: req.userId,
      isRegistered: isRegistered
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





// OTP email template
function getOTPEmailTemplate(otp) {
  return `
    <html>
      <body>
        <h2>Your OTP for Chat App</h2>
        <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
      </body>
    </html>
  `;
}

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  
  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Store OTP in the database 
    await pool.query(
      'INSERT INTO otp_storage (email, otp, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)',
      [email, otp, new Date(Date.now() + 600000)] // 10 minutes expiration
    );

    // Set up the email parameters
    const mailOptions = {
      from: 'otp@rwebservice.in',
      to: email,
      subject: 'Your OTP for Chat App',
      html: getOTPEmailTemplate(otp)
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Fetch the stored OTP from the database
    const [rows] = await pool.query(
      'SELECT * FROM otp_storage WHERE email = ? AND expires_at > NOW()',
      [email]
    );

    if (rows.length === 0) {
      return res.json({ error: 'OTP expired or not found' });
    }

    const storedOTP = rows[0].otp;

    if (otp !== storedOTP) {
      return res.json({ error: 'Invalid OTP' });
    }

    // OTP is valid, proceed with user authentication
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

    if (users.length > 0) {
      const token = generateJWT(users[0].id);
      res.json({ token, message: 'Login successful' });
    } else {
      const [result] = await pool.query('INSERT INTO users (email) VALUES (?)', [email]);
      const token = generateJWT(result.insertId);
      res.json({ token, message: 'Please complete registration' });
    }

    // Delete the used OTP
    await pool.query('DELETE FROM otp_storage WHERE email = ?', [email]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});




app.post('/api/register', upload.single('photo'), async (req, res) => {
  console.log('Received registration request:', req.body);

  if (!req.body) {
    return res.status(400).json({ error: 'No request body' });
  }

  const { name, phone } = req.body;
  const photo = req.file ? req.file.filename : null;

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    await pool.query(
      'UPDATE users SET name = ?, phone = ?, photo = ? WHERE id = ?',
      [name, phone, photo, userId]
    );

    const newToken = generateJWT(userId);
    res.json({ token: newToken, message: 'Registration successful' });
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});


app.get('/api/chats', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    console.log('Fetching chats for user:', userId);

    const [chats] = await pool.query(`
      SELECT 
        cr.id, 
        cr.name AS chat_name, 
        cr.is_group,
        u.id AS user_id,
        u.name AS user_name,
        cr.id as room_id,
        m.content AS lastMessage, 
        m.timestamp
      FROM chat_participants cp
      JOIN chats_room cr ON cp.chat_id = cr.id
      LEFT JOIN messages m ON cr.id = m.chat_id AND m.id = (
        SELECT MAX(id) 
        FROM messages 
        WHERE chat_id = cr.id
      )
      LEFT JOIN users u ON (cr.is_group = 0 AND cp.user_id != ? AND cp.user_id = u.id)
      WHERE cp.user_id = ?
      GROUP BY cr.id
      ORDER BY m.timestamp DESC
    `, [userId, userId]);

    // Process each chat to ensure user_name is set correctly
    for (const chat of chats) {
      if (!chat.is_group && !chat.user_name) {
        // Find the other participant in this chat
        const [participants] = await pool.query(
          'SELECT u.id, u.name,photo FROM chat_participants cp JOIN users u ON cp.user_id = u.id WHERE cp.chat_id = ? AND cp.user_id != ?', 
          [chat.id, userId]
        );
        
        if (participants.length > 0) {
          chat.user_id = participants[0].id;
          chat.user_name = participants[0].name;
          chat.user_photo = participants[0].photo;
        } else {
          chat.user_name = 'Unknown User';
        }
      }
    }
    // encrypt chat_id for better security
    
    res.json(chats);
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') { 
      res.status(401).json({ error: 'Invalid token' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});



app.get('/api/chats/:chatId/messages', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const { chatId } = req.params;

    // Verify user is participant in this chat
    const [participant] = await pool.query(
      'SELECT * FROM chat_participants WHERE chat_id = ? AND user_id = ?',
      [chatId, userId]
    );

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not authorized to view this chat' });
    }

    // Get messages with attachments
    const [messages] = await pool.query(`
      SELECT 
        m.id,
        m.chat_id,
        m.sender_id as user_id,
        m.content,
        m.created_at,
        u.name as user_name,
        ma.id as attachment_id,
        ma.file_name,
        ma.original_name,
        ma.file_size,
        ma.file_type
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN message_attachments ma ON m.id = ma.message_id
      WHERE m.chat_id = ?
      ORDER BY m.created_at ASC
    `, [chatId]);

    // console.log('Messages found:', messages);/

    // Group messages with their attachments
    const groupedMessages = messages.reduce((acc, row) => {
      const messageId = row.id;
      
      if (!acc[messageId]) {
        acc[messageId] = {
          id: row.id,
          chat_id: row.chat_id,
          user_id: row.user_id,
          content: row.content,
          created_at: row.created_at,
          user_name: row.user_name,
          attachment: null
        };
      }

      if (row.attachment_id) {
        acc[messageId].attachment = {
          id: row.attachment_id,
          file_name: row.file_name,
          original_name: row.original_name,
          file_size: row.file_size,
          file_type: row.file_type
        };
      }

      return acc;
    }, {});

    const formattedMessages = Object.values(groupedMessages);
    res.json(formattedMessages);

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


app.get('/api/chats/:chatId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const chatId = req.params.chatId;

    // Verify user is participant in this chat
    const [participants] = await pool.query(`
      SELECT cp.user_id 
      FROM chat_participants cp 
      WHERE cp.chat_id = ? AND cp.user_id = ?
    `, [chatId, userId]);

    if (participants.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get chat details
    const [chatDetails] = await pool.query(`
      SELECT cr.id, cp.user_id as user_id, cr.name as chat_name,
      u.photo as user_photo,
      cr.is_group,
             GROUP_CONCAT(u.name SEPARATOR ', ') as participant_names
      FROM chats_room cr
      LEFT JOIN chat_participants cp ON cr.id = cp.chat_id
      LEFT JOIN users u ON cp.user_id = u.id AND u.id != ?
      WHERE cr.id = ?
      GROUP BY cr.id
    `, [userId, chatId]);

    if (chatDetails.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Process each chat to ensure user_name is set correctly
    for (const chat of chatDetails) {
      if (!chat.is_group && !chat.user_name) {
        // Find the other participant in this chat
        const [participants] = await pool.query(
          'SELECT u.id, u.name,photo FROM chat_participants cp JOIN users u ON cp.user_id = u.id WHERE cp.chat_id = ? AND cp.user_id != ?', 
          [chat.id, userId]
        );
        
        if (participants.length > 0) {
          chat.user_id = participants[0].id;
          chat.user_name = participants[0].name;
          chat.user_photo = participants[0].photo;
        } else {
          chat.user_name = 'Unknown User';
        }
      }
    }    
    const chat = chatDetails[0];
    console.log('Chat details:', chat);
    
    // If no custom name and not a group, use participant names
    if (!chat.chat_name && !chat.is_group) {
      chat.chat_name = chat.participant_names || 'Unknown User';
    } else if (!chat.chat_name && chat.is_group) {
      chat.chat_name = 'Group Chat';
    }

    

    res.json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/messages/:chatId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const chatId = req.params.chatId;

    const [messages] = await pool.query(`
      SELECT m.id, m.content, m.timestamp, m.sender_id = ? as isSent
      FROM messages m
      WHERE m.chat_id = ?
      ORDER BY m.timestamp ASC
    `, [userId, chatId]);

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update the POST /messages route to work with Socket.IO
app.post('/api/messages/:chatId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const chatId = req.params.chatId;
    const { content } = req.body;

    const [result] = await pool.query(`
      INSERT INTO messages (chat_id, sender_id, content)
      VALUES (?, ?, ?)
    `, [chatId, userId, content]);

    // Get sender name
    const [users] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
    const senderName = users[0]?.name || 'Unknown User';

    const messageData = {
      id: result.insertId,
      content,
      timestamp: new Date(),
      sender_id: userId,
      sender_name: senderName,
      chatId
    };

    // Emit to all users in the chat room via Socket.IO
    io.to(`chat_${chatId}`).emit('new-message', messageData);

    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/search', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
        const searchTerm = req.query.term;
    
        const [users] = await pool.query(`
          SELECT id, name, phone
          FROM users
          WHERE (email = ? OR phone = ?) AND id != ?

          LIMIT 10
        `, [`${searchTerm}`, `${searchTerm}`, userId]);
    
        res.json(users);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
      }
    });
    
    app.post('/api/chats', async (req, res) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'No token provided' });
    
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const { users, name } = req.body;
    
        if (!users || users.length === 0) {
          return res.status(400).json({ error: 'No users provided' });
        }
    
        const connection = await pool.getConnection();
        await connection.beginTransaction();
    
        try {
          const [result] = await connection.query(
            'INSERT INTO chats_room (name, is_group) VALUES (?, ?)',
            [name || null, users.length > 1]
          );
          const chatId = result.insertId;
    
          const participantValues = [
            [chatId, userId],
            ...users.map(u => [chatId, u])
          ];
          await connection.query(
            'INSERT INTO chat_participants (chat_id, user_id) VALUES ?',
            [participantValues]
          );
    
          await connection.commit();
    
          // Notify all participants about the new chat via Socket.IO
          participantValues.forEach(([chatId, participantId]) => {
            const userConnection = activeUsers.get(participantId);
            if (userConnection) {
              io.to(userConnection.socketId).emit('new-chat-created', {
                id: chatId,
                name,
                is_group: users.length > 1
              });
              // Join the new chat room
              io.to(userConnection.socketId).socketsJoin(`chat_${chatId}`);
            }
          });
    
          res.json({ id: chatId, name, is_group: users.length > 1 });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
      }
    });
    


    // Add this route to your server.js file
    
    // Get user profile data
    app.get('/api/user-profile', async (req, res) => {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
    
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
    
        const [users] = await pool.query(
          'SELECT name, email, phone, photo FROM users WHERE id = ?',
          [userId]
        );
    
        if (users.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
    
        res.json(users[0]);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        if (error.name === 'JsonWebTokenError') {
          res.status(401).json({ error: 'Invalid token' });
        } else {
          res.status(500).json({ error: 'Server error' });
        }
      }
    });
    
    // Update user profile
    app.put('/api/update-profile', upload.single('photo'), async (req, res) => {
      console.log('Received profile update request:', req.body);
    
      if (!req.body) {
        return res.status(400).json({ error: 'No request body' });
      }
    
      const { name, phone } = req.body;
      const photo = req.file ? req.file.filename : null;
    
      const token = req.headers.authorization?.split(' ')[1];
    
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
    
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
    
        // Get current user data to check if photo needs updating
        const [currentUser] = await pool.query(
          'SELECT photo FROM users WHERE id = ?',
          [userId]
        );
    
        let updateQuery;
        let queryParams;
    
        if (photo) {
          // If new photo is provided, update all fields
          updateQuery = 'UPDATE users SET name = ?, phone = ?, photo = ? WHERE id = ?';
          queryParams = [name, phone, photo, userId];
        } else {
          // If no new photo, keep the existing one
          updateQuery = 'UPDATE users SET name = ?, phone = ? WHERE id = ?';
          queryParams = [name, phone, userId];
        }
    
        await pool.query(updateQuery, queryParams);
    
        const newToken = generateJWT(userId);
        res.json({ token: newToken, message: 'Profile updated successfully' });
      } catch (error) {
        console.error('Error updating profile:', error);
        if (error.name === 'JsonWebTokenError') {
          res.status(401).json({ error: 'Invalid token' });
        } else {
          res.status(500).json({ error: 'Server error' });
        }
      }
    });

        const PORT = process.env.PORT || 3000;

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// For React Router routes — send index.html for all paths
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });