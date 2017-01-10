"use strict";
const Util = require("./../Util");

// a representation of eris/User
module.exports = class User {
	constructor(erisUser) {
		this.avatar = erisUser.avatar;
		this.avatarURL = erisUser.avatarURL;
		this.bot = erisUser.bot;
		this.createdAt = erisUser.createdAt;
		this.defaultAvatar = erisUser.defaultAvatar;
		this.defaultAvatarURL = erisUser.defaultAvatarURL;
		this.discriminator = erisUser.discriminator;
		this.id = erisUser.id;
		this.mention = erisUser.mention;
		this.username = erisUser.username;

		this.createMessage = (content, file, cb) => {
			erisUser.getDMChannel().then(erisPrivateChannel => {
				erisPrivateChannel.createMessage(content, file).then(erisMessage => {
					if(Util.isFunction(cb)) {
						const Message = require("./Message");
						cb(new Message(erisMessage));
					}
				});
			});
		};
	}
};
