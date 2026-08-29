const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  avatar: { type: String, default: '🦊' },
  photoURL: { type: String, default: null },
  xp: { type: Number, default: 0, index: true },
  level: { type: Number, default: 1 },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  lastSeen: { type: Date, default: Date.now, index: true },
  streak: { type: Number, default: 1 },
  lastActiveDay: { type: String, default: () => new Date().toISOString().split('T')[0] },
  dailyXp: [{
    date: { type: String, required: true },
    xp: { type: Number, default: 0 }
  }],
  followers: [{ type: String }],
  following: [{ type: String }],
  friends: [{ type: String }],
  failedWords: [{
    word: String,
    question: String,
    count: { type: Number, default: 1 }
  }]
}, { timestamps: true });

// Compound indexes for leaderboard and search queries
userSchema.index({ xp: -1, gamesWon: -1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
