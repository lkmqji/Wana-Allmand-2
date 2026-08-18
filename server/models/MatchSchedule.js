const mongoose = require('mongoose');

const matchScheduleSchema = new mongoose.Schema({
    hostId: {
        type: String,
        required: true
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
        default: null
    },
    guestName: {
        type: String,
        default: 'Invité'
    },
    scheduledDate: {
        type: Date,
        required: true
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
        default: 'pending'
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MatchSchedule', matchScheduleSchema);
