const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    repair: {
        type: mongoose.Schema.ObjectId,
        ref: 'Repair'
    },
    lastMessage: {
        text: String,
        sender: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', ConversationSchema);
