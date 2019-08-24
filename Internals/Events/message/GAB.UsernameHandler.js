const BaseEvent = require("../BaseEvent");

/**
 * Username updates per message
 */
class UsernameHandler extends BaseEvent {
	requirements (msg) {
		return !msg.author.bot && msg.type === "DEFAULT";
	}

	async prerequisite (msg) {
		this.userDocument = await Users.findOne(msg.author.id);
	}

	async handle (msg) {
		if (this.userDocument && this.userDocument.username !== msg.author.tag) {
			this.userDocument.query.set("username", msg.author.tag);
			await this.userDocument.save();
		}
	}
}

module.exports = UsernameHandler;
