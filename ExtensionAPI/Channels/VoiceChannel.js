const { Collection } = require("discord.js");
const GuildChannel = require("./GuildChannel");
let raw;

class VoiceChannel extends GuildChannel {
	constructor (rawChannel) {
		super(rawChannel);

		this.members = new Collection();
		if (this.type !== "voice") this.type = "voice";
		this.bitrate = rawChannel.bitrate;
		this.userLimit = rawChannel.userLimit;
		this.full = rawChannel.full;
		this.joinable = rawChannel.joinable;
		this.speakable = rawChannel.speakable;
		raw = rawChannel;
	}

	async setBitrate (bitrate, reason) {
		let rawVoiceChannel;
		try {
			rawVoiceChannel = await raw.setBitrate(bitrate, reason);
		} catch (err) {
			throw err;
		}
		if (rawVoiceChannel) return new VoiceChannel(rawVoiceChannel);
	}

	async setUserLimit (userLimit, reason) {
		let rawVoiceChannel;
		try {
			rawVoiceChannel = await raw.setUserLimit(userLimit, reason);
		} catch (err) {
			throw err;
		}
		if (rawVoiceChannel) return new VoiceChannel(rawVoiceChannel);
	}
}

module.exports = VoiceChannel;
