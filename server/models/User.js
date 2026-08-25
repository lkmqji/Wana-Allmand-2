const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: { type: String, default: '🦊' },
  photoURL: { type: String, default: null },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  lastSeen: { type: Date, default: Date.now },
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

module.exports = mongoose.model('User', userSchema);

