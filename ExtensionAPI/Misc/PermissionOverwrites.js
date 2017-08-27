const TextChannel = require("../Channels/TextChannel");
const VoiceChannel = require("../Channels/VoiceChannel");
let _rawOverwrites;

class PermissionOverwrites {
	constructor (rawOverwrites) {
		// TODO: Discord.js 12.0 remove these if checks?
		if (rawOverwrites.allowed) this.allowed = rawOverwrites.allowed;
		if (rawOverwrites.denied) this.denied = rawOverwrites.denied;
		this.id = rawOverwrites.id;
		this.type = rawOverwrites.type;
		_rawOverwrites = rawOverwrites;
	}

	get channel () {
		if (_rawOverwrites.type === "voice") {
			return new VoiceChannel(_rawOverwrites.channel);
		} else if (_rawOverwrites.type === "text") {
			return new TextChannel(_rawOverwrites.channel);
		}
	}

	async delete (reason) {
		let rawNewOverwrite;
		try {
			rawNewOverwrite = await _rawOverwrites.delete(reason);
		} catch (err) {
			throw err;
		}
		if (rawNewOverwrite) return new PermissionOverwrites(rawNewOverwrite);
	}
}

module.exports = PermissionOverwrites;
