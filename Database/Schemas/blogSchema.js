const mongoose = require("mongoose");

// Schema for blog entries
module.exports = new mongoose.Schema({
	title: {type: String, minlength: 10, maxlength: 100, required: true},
	author_id: {type: String, required: true},
	category: {type: String, enum: ["Development", "Announcement", "New Stuff", "Tutorial", "Random"], required: true},
	published_timestamp: {type: Date, default: Date.now},
	content: {type: String, required: true},
	reactions: [{
		_id: {type: String, required: true},
		value: {type: Number, min: -1, max: 1}
	}]
});
