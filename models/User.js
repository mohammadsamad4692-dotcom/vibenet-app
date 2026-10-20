const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: "Welcome to VibeNet!" },
  dp: { type: String, default: "" },
  verified: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);
