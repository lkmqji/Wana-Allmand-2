const mongoose = require('mongoose');

const matchScheduleSchema = new mongoose.Schema({
    hostId: {
        type: String,
        required: true,
        index: true
    },
    hostName: {
        type: String,
        required: true
    },
    hostAvatar: {
        type: String,
        default: '🦊'
    },
    guestId: {
        type: String,
        default: null,
        index: true
    },
    guestName: {
        type: String,
        default: 'Invité'
    },
    scheduledDate: {
        type: Date,
        required: true,
        index: true
    },
    note: {
        type: String,
        default: ''
    },
    listId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'List',
        default: null
    },
    listName: {
        type: String,
        default: 'Liste générale'
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound indexes for user schedule & status filtering
matchScheduleSchema.index({ hostId: 1, scheduledDate: -1 });
matchScheduleSchema.index({ guestId: 1, scheduledDate: -1 });
matchScheduleSchema.index({ status: 1, scheduledDate: 1 });

module.exports = mongoose.model('MatchSchedule', matchScheduleSchema);
