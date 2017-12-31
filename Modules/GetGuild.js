class SafeUser {
	constructor (user) {
		this.avatar = user.avatar;
		this.bot = user.bot;
		this.tag = user.tag;
		this.discriminator = user.discriminator;
		this.username = user.username;
		this.id = user.id;
	}
}
const generateGuild = (guild, settings) => {
	let gguild = {};
	if (!guild) return gguild;
	if (settings.resolve && settings.resolve instanceof Array) {
		for (let getter of settings.resolve) {
			gguild[getter] = guild[getter];
		}
	}
	if (settings.roles && settings.roles instanceof Array) {
		gguild.roles = {};
		guild.roles.forEach((val, key) => {
			gguild.roles[key] = {};
			for (let getter of settings.roles) {
				gguild.roles[key][getter] = val[getter];
				if (settings.convert && val[getter] instanceof Map) {
					gguild.roles[key][getter] = gguild.roles[key][getter].array();
					if (settings.convert.id_only) gguild.roles[key][getter] = gguild.roles[key][getter].map(obj => obj.id);
				}
			}
		});
	}
	if (settings.channels && settings.channels instanceof Array) {
		gguild.channels = {};
		guild.channels.forEach((val, key) => {
			gguild.channels[key] = {};
			for (let getter of settings.channels) {
				gguild.channels[key][getter] = val[getter];
				if (settings.convert && val[getter] instanceof Map) {
					gguild.channels[key][getter] = gguild.channels[key][getter].array();
					if (settings.convert.id_only) gguild.channels[key][getter] = gguild.channels[key][getter].map(obj => obj.id);
				}
			}
		});
	}
	if (settings.members && settings.members instanceof Array) {
		gguild.members = {};
		guild.members.forEach((val, key) => {
			gguild.members[key] = {};
			for (let getter of settings.members) {
				gguild.members[key][getter] = val[getter];
				if (getter === "user") gguild.members[key][getter] = new SafeUser(val[getter]);
				if (settings.convert && val[getter] instanceof Map) {
					gguild.members[key][getter] = gguild.members[key][getter].array();
					if (settings.convert.id_only) gguild.members[key][getter] = gguild.members[key][getter].map(obj => obj.id);
				}
			}
		});
	}
	if (settings.custom && settings.custom instanceof Array) {
		for (let obj of settings.custom) {
			if (obj.to && obj.from) {
				gguild[obj.to] = eval(obj.from);
			}
		}
	}
	return gguild;
};

/**
 * Fetches a guild from other shards if required, resolving getters as specified.
 * @param {Object} bot The discord.js client instance containing the IPC instance used to communicate with the master.
 * @param {string} guildID The ID of the guild to be fetched, or "*" to fetch all guils.
 * @param {getGuildSettings} settings The settings to apply on generateGuild() when a guild was found.
 * @returns {Promise} Promise object representing the fetched guild object or array of guilds. Or, when no guild was found, 404.
 */
const getGuild = async (bot, guildID, settings) => {
	if (bot.guilds.has(guildID)) {
		return generateGuild(bot.guilds.get(guildID), settings);
	}
	return bot.IPC.send("getGuild", { guild: guildID, settings: settings }).then(msg => {
		if (msg.err && msg.err !== 404) throw msg.err;
		if (msg.err && msg.err === 404) return null;
		try {
			return JSON.parse(msg.result);
		} catch (err) {
			return msg.result;
		}
	});
};

module.exports = {
	get: getGuild,
	generate: generateGuild,
};

