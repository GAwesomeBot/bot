const BaseEvent = require("../BaseEvent");

/**
 * Yes, this is a thing
 */
class UsernameHandler extends BaseEvent {
	async prerequisite (msg) {
		this.userDocument = (await Users.findOrCreate({ _id: msg.author.id })).doc;
	}

	async handle (msg) {
		if (this.userDocument && this.userDocument.username !== msg.author.tag) {
			this.userDocument.username = msg.author.tag;
			await this.userDocument.save();
		}
	}
}

module.exports = UsernameHandler;
