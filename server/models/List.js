const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
  id: Number,
  question: String,
  english: String,
  answer: String
});

const listSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  words: [wordSchema],
  isPublic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('List', listSchema);
