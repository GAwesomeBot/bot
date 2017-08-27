const { Collection } = require("discord.js");
const VoiceChannel = require("../Channels/VoiceChannel.js");
const TextChannel = require("../Channels/TextChannel.js");
const Emoji = require("../Misc/Emoji.js");
let raw;

class Guild {
	constructor (rawGuild) {
		if (rawGuild.afkchannel) this.afkChannel = new VoiceChannel(rawGuild.afkChannel);
		if (rawGuild.afkChannelID) this.afkChannelID = rawGuild.afkChannelID;
		if (rawGuild.afkTimeout) this.afkTimeout = rawGuild.afkTimeout;
		this.available = rawGuild.available;

		raw = rawGuild;
	}
}

module.exports = Guild;
