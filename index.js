const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Post = require('./models/Post');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend files from 'public' folder
app.use(express.static('public'));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vibenet';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected Successfully!'))
.catch(err => console.log('DB Connection Error:', err));

// --- AUTH ROUTES ---

// Signup Route
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already taken!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    
    res.json({ message: 'User registered successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'User not found!' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password!' });

    const token = jwt.sign({ id: user._id, username: user.username }, 'vibenet_secret_key', { expiresIn: '7d' });
    res.json({ token, username: user.username, message: 'Logged in successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
