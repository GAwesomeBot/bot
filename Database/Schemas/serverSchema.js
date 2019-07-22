const Schema = require("../Schema");

// Server Schema
module.exports = new Schema({
	_id: {
		type: String,
		required: true,
	},
	added_timestamp: {
		type: Date,
		default: Date.now,
	},
	config: require("./serverConfigSchema.js"),
	extensions: [require("./serverGallerySchema.js")],
	members: require("./serverMembersSchema.js"),
	games: [require("./serverGamesSchema.js")],
	channels: require("./serverChannelsSchema.js"),
	command_usage: {
		type: Object,
		default: {},
	},
	messages_today: {
		type: Number,
		default: 0,
	},
	stats_timestamp: {
		type: Date,
		default: Date.now,
	},
	voice_data: [new Schema({
		_id: {
			type: String,
			required: true,
		},
		started_timestamp: {
			type: Date,
			required: true,
		},
	})],
	logs: [new Schema({
		timestamp: {
			type: Date,
			required: false,
			default: Date.now,
		},
		level: {
			type: String,
			required: true,
		},
		content: {
			type: String,
			required: true,
		},
		userid: {
			type: String,
			required: false,
		},
		channelid: {
			type: String,
			required: false,
		},
	}, { _id: false })],
	modlog: require("./serverModlogSchema.js"),
});
