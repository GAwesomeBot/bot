const { Collection } = require("discord.js");
const Guild = require("../Guilds/Guild.js");
const Invite = require("../Misc/Invite.js");
const PermissionOverwrites = require("../Misc/PermissionOverwrites.js");
const TextChannel = require("./TextChannel.js");
const VoiceChannel = require("./VoiceChannel.js");
let raw;

class GuildChannel {
	constructor (rawGuildCh) {
		this.calculatedPosition = rawGuildCh.calculatedPosition;
		this.createdAt = rawGuildCh.createdAt;
		this.createdTimestamp = rawGuildCh.createdTimestamp;
		this.deletable = rawGuildCh.deletable;
		this.guild = new Guild(rawGuildCh.guild);
		this.id = rawGuildCh.id;
		this.name = rawGuildCh.name;
		this.permissionOverwrites = new Collection();
		rawGuildCh.permissionOverwrites.forEach(overwrite => {
			this.permissionOverwrites.set(overwrite.id, new PermissionOverwrites(overwrite));
		});
		this.position = rawGuildCh.position;
		this.type = rawGuildCh.type;
		raw = rawGuildCh;
	}
	// eslint-disable-next-line no-unused-vars
	async clone (options) {
		let rawClonedChannel;
		try {
			// Uncomment this in Discord.js 12.0
			// rawClonedChannel = await raw.clone(options);
		} catch (err) {
			throw err;
		}
		if (rawClonedChannel) {
			switch (this.type) {
				case "text": {
					return new TextChannel(rawClonedChannel);
				}
				case "voice": {
					return new VoiceChannel(rawClonedChannel);
				}
				default: {
					return new GuildChannel(rawClonedChannel);
				}
			}
		}
	}

	async createInvite (options) {
		let rawInvite;
		// Discord.js 12.0 remove me pls
		let reason = "";
		if (options.reason) {
			reason = options.reason;
			delete options.reason;
		}
		try {
			// Discord.js 12.0 pls remove reason from here
			rawInvite = await raw.createInvite(options, reason);
		} catch (err) {
			throw err;
		}
		if (rawInvite) return new Invite(rawInvite);
	}

	async delete (reason) {
		let rawChannel;
		try {
			rawChannel = await raw.delete(reason);
		} catch (err) {
			throw err;
		}
		if (rawChannel) {
			switch (this.type) {
				case "text": {
					return new TextChannel(rawChannel);
				}
				case "voice": {
					return new VoiceChannel(rawChannel);
				}
				default: {
					return new GuildChannel(rawChannel);
				}
			}
		}
	}

	async edit (data, reason) {
		let rawEditedChannel;
		try {
			rawEditedChannel = await raw.edit(data, reason);
		} catch (err) {
			throw err;
		}
		if (rawEditedChannel) {
			switch (this.type) {
				case "text": {
					return new TextChannel(rawEditedChannel);
				}
				case "voice": {
					return new VoiceChannel(rawEditedChannel);
				}
				default: {
					return new GuildChannel(rawEditedChannel);
				}
			}
		}
	}

	async overwritePermissions (userOrRole, options, reason) {
		let rawOverwrittenChannel;
		try {
			rawOverwrittenChannel = await raw.overwritePermissions(userOrRole, options, reason);
		} catch (err) {
			throw err;
		}
		if (rawOverwrittenChannel) {
			switch (this.type) {
				case "text": {
					return new TextChannel(rawOverwrittenChannel);
				}
				case "voice": {
					return new VoiceChannel(rawOverwrittenChannel);
				}
				default: {
					return new GuildChannel(rawOverwrittenChannel);
				}
			}
		}
	}

	permissionsFor (member) {
		return raw.permissionsFor(member);
	}

	async setName (name, reason) {
		let rawRenamedChannel;
		try {
			rawRenamedChannel = await this.edit({ name }, reason);
		} catch (err) {
			throw err;
		}
		if (rawRenamedChannel) return rawRenamedChannel;
	}

	async setPosition (position, relative = false) {
		let rawMovedChannel;
		try {
			rawMovedChannel = await raw.setPosition(position, relative);
		} catch (err) {
			throw err;
		}
		if (rawMovedChannel) {
			switch (this.type) {
				case "text": {
					return new TextChannel(rawMovedChannel);
				}
				case "voice": {
					return new VoiceChannel(rawMovedChannel);
				}
				default: {
					return new GuildChannel(rawMovedChannel);
				}
			}
		}
	}

	async setTopic (topic, reason) {
		let rawChangedChannel;
		try {
			rawChangedChannel = await raw.setTopic(topic, reason);
		} catch (err) {
			throw err;
		}
		if (rawChangedChannel) {
			switch (this.type) {
				case "text": {
					return new TextChannel(rawChangedChannel);
				}
				case "voice": {
					return new VoiceChannel(rawChangedChannel);
				}
				default: {
					return new GuildChannel(rawChangedChannel);
				}
			}
		}
	}

	toString () {
		return raw.toString();
	}
}

module.exports = GuildChannel;
