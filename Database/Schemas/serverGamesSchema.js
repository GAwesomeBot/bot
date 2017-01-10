const mongoose = require("mongoose");

// Server's game data (time played and game playing)
module.exports = new mongoose.Schema({
	_id: {type: String, required: true},
	time_played: {type: Number, default: 0, min: 0}
});
