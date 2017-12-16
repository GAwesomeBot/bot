const mongoose = require("mongoose");

// Traffic Schema
module.exports = new mongoose.Schema({
	_id: {
		type: Number,
		default: Date.now,
	},
	pageViews: {
		type: Number,
		required: true,
	},
	authViews: {
		type: Number,
		required: true,
	},
	uniqueUsers: {
		type: Number,
		required: true,
	},
}, { usePushEach: true });
