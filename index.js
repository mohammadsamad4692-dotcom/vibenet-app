const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const User = require('./models/User');
const Post = require('./models/Post');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI) {
  console.error('Missing MONGO_URI environment variable.');
  process.exit(1);
}

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters.');
  process.exit(1);
}

function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Login required.' });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    });
    next();
  } catch {
    return res.status(401).json({
      error: 'Invalid or expired token. Please log in again.'
    });
  }
}

// Signup
app.post('/api/signup', async (req, res) => {
  try {
    const username = typeof req.body.username === 'string'
      ? req.body.username.trim()
      : '';
    const password = req.body.password;

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3-30 letters, numbers or underscores.'
      });
    }

    if (typeof password !== 'string' ||
        password.length < 8 || password.length > 128) {
      return res.status(400).json({
        error: 'Password must be 8-128 characters.'
      });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({ username, password: hashedPassword });

    return res.status(201).json({
      message: 'Account created. Please log in.'
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: 'Could not create account.' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const username = typeof req.body.username === 'string'
      ? req.body.username.trim()
      : '';
    const password = req.body.password;

    if (!username || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Username and password are required.'
      });
    }

    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        error: 'Invalid username or password.'
      });
    }

    const token = jwt.sign(
      { id: user._id.toString() },
      JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    return res.json({
      token,
      username: user.username,
      userId: user._id.toString(),
      message: 'Logged in successfully.'
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// Create post - requires a valid login token
app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { mediaUrl, caption = '' } = req.body;

    if (typeof mediaUrl !== 'string' ||
        !mediaUrl.trim() || mediaUrl.length > 2048) {
      return res.status(400).json({ error: 'Valid mediaUrl is required.' });
    }

    if (typeof caption !== 'string' || caption.length > 2200) {
      return res.status(400).json({ error: 'Invalid caption.' });
    }

    const user = await User.findById(req.auth.id).select('username');
    if (!user) {
      return res.status(401).json({
        error: 'Account not found. Please log in again.'
      });
    }

    const post = await Post.create({
      userId: user._id,
      username: user.username,
      mediaUrl: mediaUrl.trim(),
      caption: caption.trim()
    });

    return res.status(201).json({
      message: 'Post created successfully.',
      post
    });
  } catch (err) {
    console.error('Create post error:', err.message);
    return res.status(500).json({ error: 'Could not create post.' });
  }
});

// Fetch recent posts - public
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json(posts);
  } catch (err) {
    console.error('Fetch posts error:', err.message);
    return res.status(500).json({ error: 'Could not fetch posts.' });
  }
});

// Delete only your own post
app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    const post = await Post.findOne({
      _id: req.params.id,
      userId: req.auth.id
    });

    if (!post) {
      return res.status(404).json({
        error: 'Post not found or you do not own it.'
      });
    }

    await post.deleteOne();
    return res.json({ message: 'Post deleted successfully.' });
  } catch (err) {
    console.error('Delete post error:', err.message);
    return res.status(500).json({ error: 'Could not delete post.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? 'ok' : 'not_ready'
  });
});

const PORT = process.env.PORT || 10000;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected.');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
        
