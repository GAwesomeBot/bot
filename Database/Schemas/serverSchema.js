const mongoose = require("mongoose");

// Schema for a server
module.exports = new mongoose.Schema({
	_id: {type: String, required: true},
	config: require("./serverConfigSchema.js"),
	extensions: [require("./modulesSchema.js")],
	members: [require("./serverMembersSchema.js")],
	games: [require("./serverGamesSchema.js")],
	channels: [require("./serverChannelsSchema.js")],
	command_usage: mongoose.Schema.Types.Mixed,
	messages_today: {type: Number, default: 0},
	stats_timestamp: {type: Date, default: Date.now},
	voice_data: [new mongoose.Schema({
		_id: {type: String, required: true},
		started_timestamp: {type: Date, required: true}
	})],
	modlog: require("./serverModlogSchema.js")
});
