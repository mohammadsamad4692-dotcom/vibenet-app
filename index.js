const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = 3000;

const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
<<<<<<< HEAD
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

=======
>>>>>>> 4659154d321da7ef429cf9bd6154e7b99f153213

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static('public'));

let posts = [];
let reels = [];
let stories = [];
let users = {}; 
let notifications = [];

let admin = {
    username: "admin",
    balance: 0.00,
    blueTickPrice: 99.00,
    adEarnings: 0.00 // Track earnings from ads
};

// Sponsored Ads Data for App Monetization
let adsList = [
    { id: 1, title: "Super Creator Boost 🚀", content: "Grow your followers instantly with our premium promotion package!", cta: "Learn More" },
    { id: 2, title: "Android App Development 💻", content: "Build your own custom apps easily inside Termux with Node.js.", cta: "Install Now" }
];

app.post('/api/signup', (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.json({ success: false, message: 'All fields required!' });
    if (users[username]) return res.json({ success: false, message: 'Username taken!' });
    
    users[username] = { 
        email, username, password, 
        bio: 'Digital Creator 📸', 
        followers: [], 
        following: [], 
        blocked: [], 
        balance: 0.00,
        totalViews: 0,
        isVerified: false
    };
    res.json({ success: true, message: 'Account created!' });
});

app.post('/api/login', (req, res) => {
    const { identity, password } = req.body;
    let user = Object.values(users).find(u => (u.username === identity || u.email === identity) && u.password === password);
    if (user) res.json({ success: true, user });
    else res.json({ success: false, message: 'Invalid credentials!' });
});

app.post('/api/google-login', (req, res) => {
    const { email } = req.body;
    let username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (!users[username]) {
        users[username] = { email, username, password: 'GOOGLE_SECURE', bio: 'Google Verified 🛡️', followers: [], following: [], blocked: [], balance: 12.50, totalViews: 2500, isVerified: false };
    }
    res.json({ success: true, user: users[username] });
});

app.get('/api/profile/:username', (req, res) => {
    const uname = req.params.username;
    const profile = users[uname] || { username: uname, bio: '', followers: [], following: [], blocked: [], balance: 0, totalViews: 0, isVerified: false };
    const userPosts = posts.filter(p => p.username === uname);
    res.json({ profile, posts: userPosts, adminBalance: admin.balance, adEarnings: admin.adEarnings });
});

// Buy Blue Tick API (Commission goes to Admin)
app.post('/api/buy-bluetick', (req, res) => {
    const { username } = req.body;
    if (users[username]) {
        users[username].isVerified = true;
        admin.balance += admin.blueTickPrice; 
        res.json({ success: true, message: 'Blue Tick purchased successfully!' });
    } else {
        res.json({ success: false, message: 'User not found!' });
    }
});

// Ad Click Tracking API (Generates revenue for Admin)
app.post('/api/click-ad', (req, res) => {
    admin.adEarnings += 0.05; // Earn ₹4 or $0.05 per ad click
    res.json({ success: true, adEarnings: admin.adEarnings });
});

app.post('/api/follow', (req, res) => {
    const { follower, target } = req.body;
    if (users[follower] && users[target]) {
        if (!users[follower].following.includes(target)) {
            users[follower].following.push(target);
            users[target].followers.push(follower);
            notifications.unshift({ to: target, text: `@${follower} started following you.` });
        } else {
            users[follower].following = users[follower].following.filter(u => u !== target);
            users[target].followers = users[target].followers.filter(u => u !== follower);
        }
        res.json({ success: true, profile: users[target] });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/block', (req, res) => {
    const { user, target } = req.body;
    if (users[user]) {
        if (!users[user].blocked.includes(target)) {
            users[user].blocked.push(target);
        } else {
            users[user].blocked = users[user].blocked.filter(u => u !== target);
        }
        res.json({ success: true, blockedList: users[user].blocked });
    }
});

app.get('/api/feed/:username', (req, res) => {
    const uname = req.params.username;
    const currentUserObj = users[uname];
    const blockedUsers = currentUserObj ? currentUserObj.blocked : [];

    const filteredPosts = posts.filter(p => !blockedUsers.includes(p.username));
    const userNotifs = notifications.filter(n => n.to === uname);
    const randomAd = adsList[Math.floor(Math.random() * adsList.length)];

    res.json({ posts: filteredPosts, reels, stories, notifications: userNotifs, ad: randomAd });
});

app.post('/api/posts', upload.single('media'), (req, res) => {
    const { username, caption, type } = req.body;
    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const isVerifiedUser = users[username] ? users[username].isVerified : false;
    
    if (type === 'reel') {
        reels.unshift({ id: reels.length + 1, username, mediaUrl, caption, likes: 0, comments: [], views: Math.floor(Math.random() * 500) + 50, verified: isVerifiedUser });
    } else if (type === 'story') {
        stories.unshift({ id: stories.length + 1, username, mediaUrl });
    } else {
        posts.unshift({ id: posts.length + 1, username, caption, verified: isVerifiedUser, mediaUrl, likes: 0, comments: [], views: Math.floor(Math.random() * 300) + 20 });
    }
    
    if(users[username]) {
        users[username].totalViews += 100;
        users[username].balance += 0.50; 
    }

    res.json({ success: true });
});

app.post('/api/like', (req, res) => {
    const { postId, type } = req.body;
    let targetList = type === 'reel' ? reels : posts;
    let item = targetList.find(p => p.id == postId);
    if(item) {
        item.likes += 1;
        res.json({ success: true, likes: item.likes });
    }
});

app.post('/api/comment', (req, res) => {
    const { postId, username, text, type } = req.body;
    let targetList = type === 'reel' ? reels : posts;
    let item = targetList.find(p => p.id == postId);
    if(item) {
        item.comments.push({ username, text });
        notifications.unshift({ to: item.username, text: `@${username} commented on your post: "${text}"` });
        res.json({ success: true, comments: item.comments });
    }
});

app.post('/api/withdraw', (req, res) => {
    const { username, amount } = req.body;
    if(users[username] && users[username].balance >= amount) {
        users[username].balance -= amount;
        res.json({ success: true, message: `Successfully withdrew ₹${amount} to your Indian Bank/UPI!` });
    } else {
        res.json({ success: false, message: 'Insufficient balance!' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
