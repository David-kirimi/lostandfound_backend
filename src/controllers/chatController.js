const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// @desc    Get all messages for a conversation
// @route   GET /api/v1/chat/:repairId
// @access  Private
exports.getMessages = async (req, res) => {
    try {
        let conversation = await Conversation.findOne({ repair: req.params.repairId });

        if (!conversation) {
            // Create a first-time conversation if it doesn't exist
            conversation = await Conversation.create({
                repair: req.params.repairId,
                participants: [req.user.id] // Other participant will be added on first message or match
            });
        }

        const messages = await Message.find({ conversation: conversation._id }).sort('createdAt');

        res.status(200).json({
            success: true,
            data: messages,
            conversationId: conversation._id
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Send a message
// @route   POST /api/v1/chat/:repairId
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        const { text } = req.body;
        let conversation = await Conversation.findOne({ repair: req.params.repairId });

        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }

        const message = await Message.create({
            conversation: conversation._id,
            sender: req.user.id,
            text
        });

        // Update last message in conversation
        conversation.lastMessage = {
            text,
            sender: req.user.id,
            createdAt: message.createdAt
        };
        await conversation.save();

        res.status(201).json({
            success: true,
            data: message
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
