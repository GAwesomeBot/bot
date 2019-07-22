const Schema = require("../Schema");

// Schema for wiki entries
module.exports = new Schema({
	_id: {
		type: String,
		minlength: 3,
		maxlength: 100,
		required: true,
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
			enum: [-1, 1],
		},
	})],
	updates: [new Schema({
		_id: {
			type: String,
			required: true,
		},
		timestamp: {
			type: Date,
			default: Date.now,
		},
		diff: {
			type: String,
		},
	})],
});
