const GuildChannel = require("./GuildChannel.js");
const Guild = require("./Guild.js");
const VoiceChannel = require("./VoiceChannel.js");
const User = require("./User.js");
let _rawInvite;

class Invite {
	constructor (rawInvite) {
		this.code = rawInvite.code;
		this.createdAt = rawInvite.createdAt;
		this.createdTimestamp = rawInvite.createdTimestamp;
		this.expiresAt = rawInvite.expiresAt;
		this.expiresTimestamp = rawInvite.expiresTimestamp;
		this.guild = new Guild(rawInvite.guild);
		this.inviter = new User(rawInvite.inviter);
		if (rawInvite.maxAge) this.maxAge = rawInvite.maxAge;
		this.maxUses = rawInvite.maxUses;
		this.memberCount = rawInvite.memberCount;
		this.presenceCount = rawInvite.presenceCount;
		this.temporary = rawInvite.temporary;
		this.textChannelCount = rawInvite.textChannelCount;
		this.url = rawInvite.url;
		this.uses = rawInvite.uses;
		this.voiceChannelCount = rawInvite.voiceChannelCount;
		_rawInvite = rawInvite;
	}

	get channel () {
		if (_rawInvite.channel) {
			switch (_rawInvite.channel.type) {
				case "voice": {
					return new VoiceChannel(_rawInvite.channel);
				}
				case "text": {
					return new GuildChannel(_rawInvite.channel);
				}
			}
		}
	}

	async delete (reason) {
		let rawInvite;
		try {
			rawInvite = await _rawInvite.delete(reason);
		} catch (err) {
			throw err;
		}
		if (rawInvite) return new Invite(rawInvite);
	}

	toString () {
		return _rawInvite.toString();
	}
}

module.exports = Invite;
