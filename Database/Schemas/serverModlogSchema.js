const Schema = require("../Schema");

module.exports = new Schema({
	isEnabled: {
		type: Boolean,
		default: false,
	},
	channel_id: String,
	current_id: {
		type: Number,
		default: 0,
	},
	entries: [new Schema({
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
				"Delete Role",
				"Modify Role",
				"Create Role",
			],
			required: true,
		},
		affected_user: {
			// User Id of the affected user
			type: String,
			// We're getting modlogs without affected_user (role deletion is an example)
			// So, /shrug
			// required: true,
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
		canEdit: {
			type: Boolean,
			default: true,
		},
	})],
});
