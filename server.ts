import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'livetrack_secret_key_123';
const PORT = 3000;

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/livetrackpro';

mongoose.connect(MONGO_URI).then(() => {
  console.log('Connected to MongoDB via Mongoose');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

import User from './src/models/User.js';
import Trip from './src/models/Trip.js';
import Anomaly from './src/models/Anomaly.js';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  app.use(cors());
  app.use(express.json());

  // --- Auth Routes ---
  app.post('/api/auth/signup', async (req, res) => {
    const { email, password, name, role, entityType } = req.body;
    
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ 
        email, 
        password: hashedPassword, 
        name, 
        role: role || 'user',
        entityType: entityType || 'human'
      });
      await newUser.save();

      const userObj = { 
        id: newUser._id.toString(), 
        email: newUser.email, 
        name: newUser.name, 
        role: newUser.role, 
        entityType: newUser.entityType,
        notifications: newUser.notifications 
      };
      const token = jwt.sign(userObj, JWT_SECRET);
      res.json({ token, user: userObj });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error during signup' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const userObj = { 
        id: user._id.toString(), 
        email: user.email, 
        name: user.name, 
        role: user.role, 
        entityType: user.entityType,
        notifications: user.notifications 
      };
      const token = jwt.sign(userObj, JWT_SECRET);
      res.json({ token, user: userObj });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error during login' });
    }
  });

  // --- Profile Routes ---
  app.put('/api/auth/profile', async (req, res) => {
    const { userId, name, email, entityType, notifications } = req.body;
    try {
      const existing = await User.findOne({ email, _id: { $ne: userId } });
      if (existing) return res.status(400).json({ message: 'Email already in use by another account.' });
      
      const updatePayload: any = { name, email, entityType };
      if (notifications) updatePayload.notifications = notifications;

      const updated = await User.findByIdAndUpdate(userId, updatePayload, { new: true });
      if (!updated) return res.status(404).json({ message: 'User not found.' });
      
      const userObj = { 
        id: updated._id.toString(), 
        email: updated.email, 
        name: updated.name, 
        role: updated.role, 
        entityType: updated.entityType,
        notifications: updated.notifications 
      };
      res.json({ user: userObj });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error updating profile.' });
    }
  });

  app.put('/api/auth/password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found.' });
      const valid = await bcrypt.compare(currentPassword, user.password!);
      if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.json({ message: 'Password updated successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error changing password.' });
    }
  });

  app.delete('/api/auth/account/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      await Trip.deleteMany({ userId });
      await User.findByIdAndDelete(userId);
      res.json({ message: 'Account deleted.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error deleting account.' });
    }
  });

  // --- Trip Routes ---
  app.post('/api/trips', async (req, res) => {
    try {
      const newTrip = new Trip(req.body);
      await newTrip.save();
      const tripObj = newTrip.toObject() as any;
      tripObj.id = tripObj._id.toString(); 
      res.json(tripObj);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error saving trip' });
    }
  });

  app.get('/api/trips/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const trips = await Trip.find({ userId });
      
      const mappedTrips = trips.map(t => {
        const obj = t.toObject() as any;
        obj.id = obj._id.toString();
        return obj;
      });
      res.json(mappedTrips);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error fetching trips' });
    }
  });

  app.delete('/api/trips/:tripId', async (req, res) => {
    try {
      const { tripId } = req.params;
      const deleted = await Trip.findByIdAndDelete(tripId);
      if (deleted) {
        res.json({ message: 'Trip deleted correctly' });
      } else {
        res.status(404).json({ message: 'Trip not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error deleting trip' });
    }
  });

  app.delete('/api/trips/user/:userId', async (req, res) => {
    try {
      await Trip.deleteMany({ userId: req.params.userId });
      res.json({ message: 'All trips cleared.' });
    } catch (err) {
      res.status(500).json({ message: 'Error clearing trips.' });
    }
  });

  // --- Anomaly Routes ---
  app.post('/api/anomalies', async (req, res) => {
    try {
      console.log('--- ANOMALY RECORD REQUEST ---');
      console.log('Payload:', JSON.stringify(req.body, null, 2));
      
      const newAnomaly = new Anomaly(req.body);
      const saved = await newAnomaly.save();
      
      const obj = saved.toObject() as any;
      obj.id = obj._id.toString();
      
      console.log('Anomaly stored successfully ID:', obj.id);
      
      // Broadcast to users (for real-time update on Analytics)
      io.emit('anomaly-detected', obj);
      
      res.json(obj);
    } catch (err) {
      console.error('CRITICAL: FAILED TO SAVE ANOMALY:', err);
      res.status(500).json({ message: 'Error saving anomaly', error: String(err) });
    }
  });

  app.get('/api/anomalies/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const anomalies = await Anomaly.find({ userId }).sort({ timestamp: -1 });
      const mapped = anomalies.map(a => {
        const obj = a.toObject() as any;
        obj.id = obj._id.toString();
        return obj;
      });
      res.json(mapped);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error fetching anomalies' });
    }
  });

  app.delete('/api/anomalies/user/:userId', async (req, res) => {
    try {
      await Anomaly.deleteMany({ userId: req.params.userId });
      res.json({ message: 'All anomalies cleared.' });
    } catch (err) {
      res.status(500).json({ message: 'Error clearing anomalies.' });
    }
  });

  // --- Socket.io Logic ---
  const activeUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userData) => {
      activeUsers.set(socket.id, { ...userData, socketId: socket.id, status: 'online' });
      io.emit('user-status-change', Array.from(activeUsers.values()));
    });

    socket.on('update-location', (locationData) => {
      const user = activeUsers.get(socket.id);
      if (user) {
        const updatedUser = { ...user, location: locationData, lastUpdate: new Date() };
        activeUsers.set(socket.id, updatedUser);
        
        // Broadcast to all clients
        io.emit('location-update', updatedUser);
      }
    });

    socket.on('anomaly-detected', (anomalyData) => {
      // Broadcast to other clients if needed, or back to self for multi-tab sync
      io.emit('anomaly-detected', anomalyData);
    });

    socket.on('disconnect', () => {
      const user = activeUsers.get(socket.id);
      if (user) {
        activeUsers.delete(socket.id);
        io.emit('user-status-change', Array.from(activeUsers.values()));
      }
      console.log('User disconnected:', socket.id);
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
