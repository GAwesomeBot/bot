const BaseEvent = require("../BaseEvent");

class GuildUnavailable extends BaseEvent {
	async handle (guild) {
		logger.warn(`Guild "${guild.name}" is unavailable!`, { svrid: guild.id });
	}
}

module.exports = GuildUnavailable;
