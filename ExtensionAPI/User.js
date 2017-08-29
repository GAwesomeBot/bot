const TextBasedChannel = require("./Channels/TextBasedChannel");
let rawuser;

class User {
	constructor (rawUser) {
		this.avatar = rawUser.avatar;
		this.bot = rawUser.bot;
		this.createdAt = rawUser.createdAt;
		this.createdTimestamp = rawUser.createdTimestamp;
		this.defaultAvatarURL = rawUser.defaultAvatarURL;
		this.discriminator = rawUser.discriminator;
		this.id = rawUser.id;
		this.presence = rawUser.presence;
		this.tag = rawUser.tag;
		this.username = rawUser.username;
		rawuser = rawUser;
	}

	/**
	 * Gets the users "mention"
	 */
	get mention () {
		return this.toString();
	}

	toString () {
		return `<@${this.id}>`;
	}

	avatarURL (options) {
		return rawuser.avatarURL(options);
	}

	displayAvatarURL (options) {
		return rawuser.displayAvatarURL(options);
	}
}

TextBasedChannel.applyToClass(User);

module.exports = User;
