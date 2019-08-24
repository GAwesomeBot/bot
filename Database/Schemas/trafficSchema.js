const Schema = require("../Schema");

// Traffic Schema
module.exports = new Schema({
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
});
