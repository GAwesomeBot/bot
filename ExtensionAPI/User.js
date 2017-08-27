const TextBasedChannel = require("./Channels/TextBasedChannel");
// eslint-disable-next-line no-unused-vars
let rawuser;

class User {
	constructor (rawUser) {
		this.avatar = rawUser.avatar;
		this.avatarURL = rawUser.avatarURL;
		this.bot = rawUser.bot;
		this.createdAt = rawUser.createdAt;
		this.createdTimestamp = rawUser.createdTimestamp;
		this.defaultAvatarURL = rawUser.defaultAvatarURL;
		this.discriminator = rawUser.discriminator;
		this.displayAvatarURL = rawUser.displayAvatarURL;
		this.id = rawUser.id;
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
}

TextBasedChannel.applyToClass(User);

module.exports = User;
