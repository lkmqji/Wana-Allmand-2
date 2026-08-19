const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  failedWords: [{
    word: String,
    question: String,
    count: { type: Number, default: 1 }
  }]
});

module.exports = mongoose.model('User', userSchema);
