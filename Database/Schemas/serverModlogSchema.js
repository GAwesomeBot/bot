const mongoose = require("mongoose");

module.exports = {
	isEnabled: {
		type: Boolean,
		default: false,
	},
	channel_id: String,
	current_id: {
		type: Number,
		default: 0,
	},
	entries: [new mongoose.Schema({
		_id: {
			// Based off current_id
			type: Number,
			required: true,
		},
		timestamp: {
			type: Date,
			default: Date.now,
		},
		type: {
			type: String,
			enum: [
				"Add Role",
				"Ban",
				"Block",
				"Kick",
				"Mute",
				"Other",
				"Remove Role",
				"Softban",
				"Unban",
				"Unmute",
				"Strike",
				"Temp Ban",
				"Temp Mute",
			],
			required: true,
		},
		affected_user: {
			// User Id of the affected user
			type: String,
			required: true,
		},
		creator: {
			// User ID of the issuer
			type: String,
			required: true,
		},
		message_id: {
			// Message ID of the modlog entry
			type: String,
			required: true,
		},
		reason: {
			type: String,
			maxlength: 1500,
		},
		isValid: {
			type: Boolean,
			default: true,
		},
	}, { usePushEach: true })],
};
