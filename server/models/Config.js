const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  key: { type: String, default: 'app_config', unique: true },
  guestMode: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  announcement: { type: String, default: '' },
  defaultMasterVol: { type: Number, default: 0.5, min: 0, max: 1 },
  defaultSfxVol: { type: Number, default: 0.5, min: 0, max: 1 },
  defaultBgmVol: { type: Number, default: 0.5, min: 0, max: 1 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Config', configSchema);
