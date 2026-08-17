const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, default: 'ALL' }, // 'ALL' for everyone, or specific firebaseId
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' }, // 'info', 'announcement', 'reward', 'alert', 'tournament'
  icon: { type: String, default: '📢' },
  readBy: [{ type: String }], // Array of user firebaseIds who marked this as read
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
