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
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("CRITICAL ERROR: MONGO_URI Environment Variable is missing!");
}

mongoose.connect(MONGO_URI)
.then(() => console.log("MongoDB Connected Successfully!"))
.catch(err => console.error("DB Connection Error:", err.message));

// --- AUTH ROUTES ---

// Signup Route
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required!" });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "Username already taken!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.json({ message: "User registered successfully!" });
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ error: "Server error during signup", details: err.message });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: "User not found!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid password!" });

        const token = jwt.sign(
            { id: user._id, username: user.username }, 
            process.env.JWT_SECRET || 'vibenet_secret_key', 
            { expiresIn: '7d' }
        );
        res.json({ token, username: user.username, userId: user._id, message: "Logged in successfully!" });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Server error during login", details: err.message });
    }
});

// --- POST ROUTES ---

// Create Post
app.post('/api/posts', async (req, res) => {
    try {
        const { userId, username, mediaUrl, caption } = req.body;
        if (!userId || !mediaUrl) {
            return res.status(400).json({ error: "User ID and Media are required!" });
        }

        const newPost = new Post({ userId, username, mediaUrl, caption });
        await newPost.save();
        res.json({ message: "Post uploaded successfully!", post: newPost });
    } catch (err) {
        console.error("Post Error:", err);
        res.status(500).json({ error: "Error uploading post", details: err.message });
    }
});

// Fetch All Posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error("Fetch Posts Error:", err);
        res.status(500).json({ error: "Error fetching posts", details: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
          
