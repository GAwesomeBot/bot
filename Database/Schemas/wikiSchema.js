const mongoose = require("mongoose");

// Schema for blog entries
module.exports = new mongoose.Schema({
	_id: {type: String, minlength: 3, maxlength: 100, required: true},
	content: {type: String, required: true},
	reactions: [{
		_id: {type: String, required: true},
		value: {type: Number, enum: [-1, 1]}
	}],
	updates: [{
		_id: {type: String, required: true},
		timestamp: {type: Date, default: Date.now},
		diff: String
	}]
});
