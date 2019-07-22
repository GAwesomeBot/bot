const Schema = require("../Schema");

/*
 * Schema for Blog Entries
 */
module.exports = new Schema({
	title: {
		type: String,
		minlength: 10,
		maxlength: 100,
		required: true,
	},
	author_id: {
		type: String,
		required: true,
	},
	category: {
		type: String,
		enum: [
			"Development",
			"Announcement",
			"New Stuff",
			"Tutorial",
			"Random",
		],
		required: true,
	},
	published_timestamp: {
		type: Date,
		default: Date.now,
	},
	content: {
		type: String,
		required: true,
	},
	reactions: [new Schema({
		_id: {
			type: String,
			required: true,
		},
		value: {
			type: Number,
			min: -1,
			max: 1,
		},
	})],
});
