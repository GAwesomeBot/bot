const generateGuild = (guild, settings) => {
	let gguild = {};
	if (!settings.only) gguild = JSON.parse(JSON.stringify(guild));
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
			}
			if (settings.exclude && settings.exclude.roles instanceof Array) {
				for (let exc of settings.exclude.roles) {
					delete gguild.roles[key][exc];
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
			}
			if (settings.exclude && settings.exclude.channels instanceof Array) {
				for (let exc of settings.exclude.channels) {
					delete gguild.channels[key][exc];
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
			}
			if (settings.exclude && settings.exclude.members instanceof Array) {
				for (let exc of settings.exclude.members) {
					delete gguild.members[key][exc];
				}
			}
		});
	}
	if (settings.custom && settings.custom instanceof Array) {
		for (let obj of settings.custom) {
			if (obj.to && obj.from) {
				gguild[obj.to] = eval(`guild.${obj.from}`);
			}
		}
	}
	return gguild;
};

const getGuild = (bot, guildID, settings) =>
	new Promise((resolve, reject) => {
		if (bot.guilds.has(guildID)) {
			resolve(generateGuild(bot.guilds.get(guildID), settings));
			return;
		}
		const listener = msg => {
			if (!msg || msg.guild !== guildID || JSON.stringify(msg.settings) !== JSON.stringify(settings)) return;
			bot.IPC.removeListener("getGuildRes", listener);
			if (msg.err && msg.err !== 404) reject(msg.err);
			if (msg.err && msg.err === 404) resolve(null);
			else resolve(msg.result);
		};
		bot.IPC.on("getGuildRes", listener);
		bot.IPC.send("getGuild", { guild: guildID, settings: settings });
	});

module.exports = {
	get: getGuild,
	generate: generateGuild,
};

