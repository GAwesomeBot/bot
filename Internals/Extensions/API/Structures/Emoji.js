const API = require("../index");
const ScopeManager = API.ScopeManager;
let emoji, scopeManager;

module.exports = class Emoji {
	constructor (rawEmoji, scopes) {
		emoji = rawEmoji;
		scopeManager = new ScopeManager(scopes);

		this.animated = rawEmoji.animated;
		this.createdAt = rawEmoji.createdAt;
		this.createdTimestamp = rawEmoji.createdTimestamp;
		this.id = rawEmoji.id;
		this.name = rawEmoji.name;
		this.url = rawEmoji.url;
	}

	async delete (reason = `Deleted by GAwesomeBot Extension`) {
		scopeManager.check("manage", "guild");
		await emoji.delete(reason);
	}

	async edit (data, reason = `Edited by GAwesomeBot Extension`) {
		scopeManager.check("manage", "guild");
		await emoji.edit(data, reason);
	}

	async setName (name, reason = `Renamed by GAwesomeBot Extension`) {
		scopeManager.check("manage", "guild");
		await emoji.setName(name, reason);
	}

	toString () {
		return emoji.toString();
	}
};
