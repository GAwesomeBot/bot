const BaseEvent = require("../BaseEvent");

class GuildUnavailable extends BaseEvent {
	async handle (guild) {
		winston.info(`Guild "${guild.name}" is unavailable!`, { guild: guild.id });
	}
}

module.exports = GuildUnavailable;
