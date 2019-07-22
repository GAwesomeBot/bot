const Schema = require("../Schema");

module.exports = new Schema({
	// Stringified ObjectID
	_id: {
		type: String,
		required: true,
	},
	version: Number,
	key: {
		type: String,
		minlength: 2,
		maxlength: 25,
	},
	keywords: [String],
	case_sensitive: Boolean,
	interval: {
		type: Number,
		min: 300000,
		max: 86400000,
	},
	disabled_channel_ids: [String],
	admin_level: {
		type: Number,
		min: 0,
		max: 4,
	},
	store: Schema.Mixed,
	status: new Schema({
		code: {
			type: Number,
			enum: [0, 1, 2],
			default: 0,
		},
		description: String,
	}),
});
