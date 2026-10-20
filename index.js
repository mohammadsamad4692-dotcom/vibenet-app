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
    
// --- POST ROUTES ---

// Create Post
app.post('/api/posts', async (req, res) => {
  try {
    const { userId, username, mediaUrl, caption } = req.body;
    if (!userId || !mediaUrl) {
      return res.status(400).json({ error: 'User ID and Media are required!' });
    }

    const newPost = new Post({ userId, username, mediaUrl, caption });
    await newPost.save();
    res.json({ message: 'Post uploaded successfully!', post: newPost });
  } catch (err) {
    res.status(500).json({ error: 'Error uploading post' });
  }
});

// Get All Posts (Feed)
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching posts' });
  }
});

// Delete Post (Strict Ownership Check)
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const { userId } = req.body; // Request se login user ki ID aayegi

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found!' });

    // Check if the logged-in user is the owner of the post
    if (post.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized! You can only delete your own posts.' });
    }

    await Post.findByIdAndDelete(postId);
    res.json({ message: 'Post deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting post' });
  }
});
      
