const mongoose = require("mongoose");

module.exports = {
	isEnabled: {type: Boolean, default: false},
	channel_id: String,
	current_id: {type: Number, default: 0},
	entries: [new mongoose.Schema({
		_id: {type: Number, required: true},
		timestamp: {type: Date, default: Date.now},
		type: {type: String, enum: ["Add Role", "Ban", "Block", "Kick", "Mute", "Other", "Remove Role", "Softban", "Unban", "Unmute", "Warning"], required: true},
		affected_user: {type: String, required: true},
		creator: {type: String, required: true},
		message_id: {type: String, required: true},
		reason: {type: String, maxlength: 1500},
		isValid: {type: Boolean, default: true}
	})]
};
