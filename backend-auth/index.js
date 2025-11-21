const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const JWT_SECRET = process.env.JWT_SECRET;

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      user: process.env.MONGO_USERNAME,
      pass: process.env.MONGO_PASSWORD,
      authSource: "admin"
    });
    console.log('Auth Service: MongoDB Connected');
  } catch (err) {
    console.error('Auth Service: MongoDB Connection Error:', err.message);
    setTimeout(connectToMongoDB, 5000);
  }
};

const redisClient = redis.createClient({
  socket: {
    host: REDIS_HOST,
    port: 6379
  }
});
redisClient.on('connect', () => console.log('Auth Service: Redis Connected'));
redisClient.on('error', (err) => console.error('Auth Service: Redis Connection Error:', err));

connectToMongoDB();
redisClient.connect();

app.get('/', (req, res) => {
  res.send('Welcome to the Auth Service (via Nginx)!');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });

  try {
    const existingUser = await User.findOne({ username: username });
    if (existingUser) return res.status(400).json({ message: 'Username already exists' });

    const user = new User({ username, password });
    await user.save();

    res.status(201).json({ message: 'User registered successfully', user: { id: user._id, username: user.username } });

  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { id: user._id, username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    await redisClient.set(`session:${user._id}`, token, { EX: 3600 });

    res.status(200).json({ message: 'Login successful', token, user: { id: user._id, username: user.username } });

  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth Service listening on port ${PORT}`);
});
