const mongoose = require("mongoose");

// Schema for commands, keywords, and timers (third-party and gallery)
module.exports = new mongoose.Schema({
	name: {type: String, minlength: 3, maxlength: 100, required: true},
	level: {type: String, enum: ["third", "gallery"], required: true},
	type: {type: String, enum: ["command", "keyword", "timer"], required: true},
	key: {type: String, minlength: 3, maxlength: 25},
	keywords: [String],
	case_sensitive: Boolean,
	admin_level: {type: Number, min: 0, max: 3},
	interval: {type: Number, min: 300000, max: 86400000},
	enabled_channel_ids: [String],
	usage_help: {type: String, maxlength: 150},
	extended_help: {type: String, maxlength: 1000},
	last_run: Date,
	store: mongoose.Schema.Types.Mixed,
	updates_available: {type: Number, min: 0, default: 0},
	description: {type: String, maxlength: 2000},
	points: {type: Number, min: 0, default: 0},
	owner_id: String,
	featured: Boolean,
	last_updated: Date,
	state: {type: String, enum: ["gallery", "queue", "saved"]}
});