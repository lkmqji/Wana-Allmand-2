const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
  id: Number,
  question: String,
  english: String,
  answer: String
});

const listSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  words: [wordSchema],
  isPublic: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound indexes for high-speed public & user list lookups
listSchema.index({ isPublic: 1, createdAt: -1 });
listSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('List', listSchema);
