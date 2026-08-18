const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  key: { type: String, default: 'app_config', unique: true },
  guestMode: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  announcement: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Config', configSchema);
