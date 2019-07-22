const BaseEvent = require("../BaseEvent");

class UsernameUpdater extends BaseEvent {
	requirements (oldUser, newUser) {
		return oldUser.id !== this.client.user.id && !oldUser.bot && !this.configJSON.userBlocklist.includes(oldUser.id) && oldUser.tag !== newUser.tag;
	}

	async handle (oldUser, newUser) {
		let userDocument = await Users.findOne(oldUser.id);
		if (!userDocument) userDocument = await Users.new({ _id: oldUser.id });
		userDocument.query.set("username", newUser.tag);
		if (userDocument.past_names && !userDocument.past_names.includes(oldUser.username)) userDocument.query.push("past_names", oldUser.username);
		userDocument.save().catch(err => {
			logger.debug(`Failed to save userDocument ${oldUser.tag} for UpdateUsername.`, { usrid: oldUser.id }, err);
		});
	}
}

module.exports = UsernameUpdater;
