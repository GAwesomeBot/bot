const mongoose = require("mongoose");

// Server's channel data (botOn, trivia, etc.)
module.exports = new mongoose.Schema({
	_id: {type: String, required: true},
	bot_enabled: {type: Boolean, default: true, required: true},
	isStatsEnabled: {type: Boolean, default: true, required: true},
	command_cooldown: {type: Number, default: 0, min: 0, max: 300000},
	isCommandCooldownOngoing: {type: Boolean, default: false},
	isMessageDeletedDisabled: {type: Boolean, default: false},
	spam_filter_data: [new mongoose.Schema({
		_id: {type: String, required: true},
		message_count: {type: Number, default: 0},
		last_message_content: String
	})],
	trivia: {
		isOngoing: {type: Boolean, default: false},
		set_id: String,
		past_questions: [String],
		score: {type: Number, default: 0, min: 0},
		responders: [new mongoose.Schema({
			_id: String,
			score: {type: Number, default: 0, min: 0}
		})],
		current_question: {
			answer: String,
			attempts: {type: Number, default: 0}
		}
	},
	poll: {
		isOngoing: {type: Boolean, default: false},
		created_timestamp: Date,
		creator_id: String,
		title: String,
		options: [String],
		responses: [new mongoose.Schema({
			_id: String,
			vote: {type: Number, min: 0}
		})]
	},
	giveaway: {
		isOngoing: {type: Boolean, default: false},
		expiry_timestamp: Date,
		creator_id: String,
		title: String,
		secret: String,
		participant_ids: [String]
	},
	lottery: {
		isOngoing: {type: Boolean, default: false},
		expiry_timestamp: Date,
		creator_id: String,
		participant_ids: [String]
	}
});
