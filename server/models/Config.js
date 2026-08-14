const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  key: { type: String, default: 'app_config', unique: true },
  guestMode: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Config', configSchema);
