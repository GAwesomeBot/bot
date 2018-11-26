const BaseEvent = require("../BaseEvent");

class UsernameUpdater extends BaseEvent {
	requirements (oldUser, newUser) {
		return oldUser.id !== this.client.user.id && !oldUser.bot && !this.configJSON.userBlocklist.includes(oldUser.id) && oldUser.tag !== newUser.tag;
	}

	async handle (oldUser, newUser) {
		let userDocument = await EUsers.findOne(oldUser.id);
		if (!userDocument) userDocument = await EUsers.new({ _id: oldUser.id });
		userDocument.query.set("username", newUser.tag);
		userDocument.save();
	}
}

module.exports = UsernameUpdater;
