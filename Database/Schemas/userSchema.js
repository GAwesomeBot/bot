const Schema = require("../Schema");

// User data (past names, profile fields, etc)
module.exports = new Schema({
	_id: {
		type: String,
		required: true,
	},
	past_names: [String],
	points: {
		type: Number,
		default: 1,
	},
	afk_message: String,
	server_nicks: [new Schema({
		_id: {
			type: String,
			required: true,
			lowercase: true,
		},
		server_id: {
			type: String,
			required: true,
		},
	})],
	reminders: [new Schema({
		_id: {
			type: String,
			required: true,
		},
		name: {
			type: String,
			required: true,
		},
		expiry_timestamp: {
			type: Number,
			required: true,
		},
	})],
	location: String,
	weatherunit: String,
	last_seen: Date,
	profile_fields: Schema.Mixed,
	profile_background_image: {
		type: String,
		default: `http://i.imgur.com/8UIlbtg.jpg`,
	},
	isProfilePublic: {
		type: Boolean,
		default: true,
	},
	upvoted_gallery_extensions: [String],
	username: String,
});
