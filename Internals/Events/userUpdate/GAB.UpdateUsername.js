const BaseEvent = require("../BaseEvent");

class UsernameUpdater extends BaseEvent {
	requirements (oldUser, newUser) {
		return oldUser.id !== this.client.user.id && !oldUser.bot && !this.configJSON.userBlocklist.includes(oldUser.id) && oldUser.tag !== newUser.tag;
	}

	async prerequisite (oldUser) {
		this.userDocument = await Users.findOne({ _id: oldUser.id }).exec();
		if (!this.userDocument) this.userDocument = await Users.create(new Users({ _id: oldUser.id }));
	}

	async handle (_, newUser) {
		this.userDocument.username = newUser.tag;
		this.userDocument.save();
	}
}

module.exports = UsernameUpdater;
